"""
CAMELS Explorer — backend

This module mirrors the function signatures of the real analysis routines in
`camels_library/camels_library.py` (compute_Pk, halo_mass_function,
stellar_mass_function, star_formation_rate_history).

Real data comes from the public CAMELS data release (Globus/Binder/direct-URL
access - see docs/source/data_access.rst upstream), fetched over plain HTTP:
precomputed Pk files, FOF/Subfind catalogs, CMD 3D grids (via HTTP Range
requests, so a multi-GB stacked file is never downloaded whole), and - when
Pylians (`MAS_library`/`readgadget`) is installed - real per-particle gridding
of a raw snapshot, streamed lazily via `fsspec` rather than downloaded whole.

Real-data-only, no synthetic fallback for any statistic (removed 2026-08-05
from the nine functions that used to have one - Power Spectrum, Halo Mass
Function, Stellar Mass Function, Baryon Fraction, SFR History, Galaxy
Scaling Relations, 3D Density Field, 3D Particle Cloud, 2D Field Map - at
the user's direct request, once it was confirmed the React frontend had
inherited that fallback silently, with none of app.py's own 🟢/🟡 real-vs-
synthetic disclosure). Every one of these now returns None when no real
fetch succeeds, same as the statistics that were already real-data-only
(X-ray Halo Profiles, Halo Gas Profiles, Color-Mass Diagram, Bispectrum,
Field PDF, Lyman-alpha Spectrum). This also removes app.py's own "Demo data
(synthetic)" mode for these nine, since app.py calls these same functions
directly - a deliberate, accepted side effect, not an oversight, given
app.py is the prototype this rewrite is superseding.
"""

from __future__ import annotations

import ast
import hashlib
import io
import logging
import os
import re
import tempfile
import threading
import urllib.error
import urllib.request
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

# Real fix (2026-08-06, code-quality audit): every real-data fetch below
# wraps a remote HTTP/HDF5 read in a broad `except Exception: return None` -
# correct, since a missing/absent realization has too many distinct real
# failure shapes (404, malformed HDF5, missing dataset key, ...) to enumerate,
# and returning None (not raising) is this file's own established "no real
# data for this selection" signal. But a *genuine* bug hiding behind one of
# these (e.g. a typo'd HDF5 key after a refactor) used to be indistinguishable
# from an expected absence - nothing was ever logged. `logger.exception(...)`
# inside each doesn't change the None-return/404 behavior, it just makes a
# real regression visible in server logs instead of silently invisible.
logger = logging.getLogger(__name__)

# Real fix (2026-08-06, code-quality audit): CMD_DATA_URL/CMD_2D_MAPS_URL
# below used to be hardcoded with another researcher's private-webspace
# capability token in plaintext - a real secret, committed to git history.
# Now read from the environment (a local, gitignored .env file via
# load_dotenv() - see .env.example for the two real variable names) instead
# of a source-code constant. Calling this here, before those two module-
# level assignments, means it works the same way on every import - no
# separate setup step for uvicorn's --reload (which re-execs this module,
# re-running load_dotenv()) vs. running app.py/desktop.py directly.
load_dotenv()

import h5py
import numpy as np
import pandas as pd

# Agg is a headless, non-interactive backend - required for api/main.py's
# uvicorn process (no display), and also what Streamlit's own st.pyplot()
# already expects (it renders figures to a static image buffer regardless of
# backend, never needs an interactive one). Must be set before pyplot import.
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg

# Real fix (2026-08-06, ticket #12, later generalized to every render_*_png
# function in this file - code-quality audit, same date): matplotlib's Agg
# rendering pipeline (freetype font/glyph rendering, the C-extension canvas)
# isn't documented as thread-safe even across independent Figure objects -
# confirmed directly: switching render_field_map_2d_png off pyplot's global
# state (Figure()/FigureCanvasAgg instead of plt.subplots()/plt.close()) did
# NOT fix concurrent renders on its own, 9 fired together still mostly
# 500'd while 9 fired one at a time all succeeded. A lock around the actual
# render step is matplotlib's own documented mitigation for this in
# threaded servers. Originally scoped to just field-map rendering (the only
# one exercised concurrently by a built feature at the time - the grouped
# 2D Field Map view fires one PNG request per mosaic cell) - generalized to
# every render_*_png function below (via `_finish_png`) once the audit
# confirmed the identical latent `plt.subplots()`/`plt.close()` pattern
# existed in all of them too, undetected only because nothing had exercised
# them concurrently yet.
_PNG_RENDER_LOCK = threading.Lock()


def _finish_png(fig) -> bytes:
    """Shared tail for every render_*_png function - renders `fig` to PNG
    bytes via FigureCanvasAgg directly (never plt.savefig()/plt.close()).
    Callers build their own `Figure(dpi=150, facecolor="white")` - the 150
    DPI and white facecolor were previously each renderer's own
    `fig.savefig(..., dpi=150, facecolor="white")` call, now centralized
    here since `FigureCanvasAgg.print_png()` (unlike `Figure.savefig()`)
    has no dpi/facecolor override kwargs - they have to be set on the
    Figure itself instead.

    Does NOT itself hold `_PNG_RENDER_LOCK` - real bug caught directly
    (2026-08-06): locking only this final canvas/print step still let ~8 of
    9 concurrent field-map renders fail, because the actual thread-unsafe
    work (ax.imshow/colorbar/tight_layout - font-metric/glyph-layout calls
    happen there too, not just at print_png time) ran *outside* the lock.
    Every caller must wrap its ENTIRE render body - from `Figure(...)`
    through this call - in `with _PNG_RENDER_LOCK:`, not just this tail."""
    buf = io.BytesIO()
    FigureCanvasAgg(fig).print_png(buf)
    return buf.getvalue()

# Real fix (2026-08-06, code-quality audit): these two used to be one
# combined try/except, so any machine without Pylians/MAS_library installed
# (a heavy, hard-to-install C-extension) also silently lost fsspec-only
# features that have nothing to do with it - X-ray Halo Profiles was
# already fine (no HAVE_CAMELS_LIBRARY check at all), but CAESAR halo/
# galaxy catalogs, SubLink/SubLink_gal merger history, Halo Gas Profiles,
# Photometry/Color-Mass Diagram, Field PDF, and Lyman-alpha Spectrum were
# all gated behind HAVE_CAMELS_LIBRARY even though every one of them only
# ever calls fsspec.open()/h5py.File() for a lazy remote HDF5 read - none
# of them reference MASL/MAS_library anywhere (confirmed directly, not
# assumed). Split so those six features work with just `pip install
# fsspec` - no Pylians required - while HAVE_CAMELS_LIBRARY (real per-
# particle gridding, which does stream via fsspec AND grid via MASL.MA())
# still correctly requires both.
try:
    import fsspec
    HAVE_FSSPEC = True
except ImportError:
    HAVE_FSSPEC = False

try:
    import MAS_library as MASL
    HAVE_CAMELS_LIBRARY = HAVE_FSSPEC
except ImportError:
    HAVE_CAMELS_LIBRARY = False

PUBLIC_DATA_URL = "https://users.flatironinstitute.org/~camels"
# Real (was hardcoded here before 2026-08-06 - see load_dotenv()'s own
# comment above) - None when CAMELS_CMD_3D_GRIDS_URL isn't set, same
# "no real data" honesty every other real-data-only function in this file
# already uses; every caller below already guards on this before building
# a URL from it.
CMD_DATA_URL = os.environ.get("CAMELS_CMD_3D_GRIDS_URL")


# ---------------------------------------------------------------------------
# Simulation catalog (mirrors docs/source/organization.rst + data_access.rst)
# ---------------------------------------------------------------------------

SUITES = ["IllustrisTNG", "SIMBA", "Astrid", "Magneticum", "Swift-EAGLE",
          "Ramses", "CROCODILE", "Enzo", "Obsidian", "N-body"]

# YouTube video IDs embedded in docs/source/codes.rst - one representative
# render per suite, not tied to any specific set/realization/redshift.
# CROCODILE and Enzo have no embedded video in the upstream docs.
SUITE_VIDEOS = {
    "IllustrisTNG": "wWrED1ekB1c",
    "SIMBA":        "GtRfDw6tX5U",
    "Astrid":       "oahCUZMRJZU",
    "Magneticum":   "rE6V8Tx8438",
    "Swift-EAGLE":  "XDpBT6JwRAE",
    "Ramses":       "WnNfkok9sJw",
    "Obsidian":     "QD574jPq2qY",
    "N-body":       "w0VPWIyc7Wk",
}

# SB (Sobol sequence) - confirmed real (2026-08-02), simple {folder}_{realization}
# naming like LH/CV/EX (not a compound scheme like 1P). Docs state Sobol
# sequences are meant to eventually replace LH for parameter-space sampling.
# Unlike every other set, SB's real folder NAME differs per suite (not just
# its realization count) - confirmed via a real directory listing: IllustrisTNG
# uses "SB28" (2048 realizations, 28 parameters), Astrid uses "SB7" (1024
# realizations, 7 parameters). SIMBA/Swift-EAGLE don't have an SB set at all.
SB_FOLDER_FOR_SUITE = {"IllustrisTNG": "SB28", "Astrid": "SB7"}
SB_REALIZATIONS_FOR_SUITE = {"IllustrisTNG": 2048, "Astrid": 1024}


def resolve_set_name(suite: str, set_name: str) -> str:
    """Translates the UI-facing "SB" set name into its real, per-suite SB
    folder name (IllustrisTNG -> "SB28", Astrid -> "SB7") - mirrors app.py's
    own `set_name = sb_folder or "SB"` right after the Set selectbox. Every
    real fetcher below builds its URL generically from whatever set_name
    it's given (see the SB coverage note above), so this is the one place
    that needs to know about SB's per-suite naming quirk - not each
    individual fetcher. A no-op for every other set name. Unsupported
    suites (SIMBA/Swift-EAGLE) keep the literal "SB" so real fetches 404
    honestly instead of guessing a folder name that doesn't exist."""
    if set_name != "SB":
        return set_name
    return SB_FOLDER_FOR_SUITE.get(suite, "SB")

# Per-product SB coverage (confirmed real, 2026-08-04, direct directory listings
# against IllustrisTNG/SB28_0 - all existing fetchers below already build their
# URLs generically from suite/set_name/realization, so no code changes were
# needed for the products that do have real SB data, only this documentation
# of which ones don't):
#   real:      Pk, FOF_Subfind, Rockstar, SubLink, Sims/extra_files (SFR history)
#   not real:  CAESAR, AHF, Photometry (all confirmed 404 - not yet computed for
#              this set, not a bug in any fetcher below)
# Bispectrum is already scoped to LH only (see get_bispectrum), so it was not
# re-checked here.

SET_REALIZATIONS = {
    "LH": 1000,   # Latin Hypercube: varied cosmology + astrophysics
    "CV": 27,     # Cosmic Variance: fixed params, varied initial phases
    "1P": 66,     # One-parameter-at-a-time - this count is unverified and likely wrong
                  # (kept as-is rather than guessed at, see note below) - real folders
                  # aren't indexed by a flat integer at all, so this only matters for
                  # the synthetic fallback's seed range and the slider's upper bound,
                  # not for correctness of any real fetch.
    "EX": 4,      # Extreme
}
# 1P's real public folders are compound-named by parameter index and variation
# (e.g. "1P_p11_2", not "1P_{realization}" like every other set) - confirmed via
# a real directory listing (2026-08-02): 140 folders under Pk/IllustrisTNG/
# L25n256/1P/, exactly 28 parameters x 5 variations (n2,n1,0,1,2). The upstream
# docs (docs/source/suites_sets.rst) describe this set as "4 simulations per
# parameter plus one shared fiducial" = 113 *physically distinct* sims for
# IllustrisTNG's 28 parameters - the folder count is higher because the shared
# fiducial (variation "0") gets its own folder under every parameter, even
# though it's the same underlying simulation each time.
#
# IMPORTANT: there are actually TWO different 1P naming conventions in the
# public release, confirmed via real directory listings (2026-08-02):
#   - modern/expanded: "1P_p{1..28}_{n2,n1,0,1,2}" - used by Pk, FOF_Subfind,
#     Sims (raw snapshots), Rockstar, Caesar, SubLink, Photometry
#   - legacy/original: "1P_{1..6}_{n5,n4,n3,n2,n1,0,1,2,3,4,5}" (no "p", only
#     6 params, 11 variations) - used by AHF, Profiles (Halo Gas Profiles),
#     Lya (Lyman-alpha)
# Only the modern scheme is wired up below (ONEP_TNG_PARAMS) - AHF/Halo Gas
# Profiles/Lyman-alpha still show no 1P data, same as before this was built.
#
# Since every real-data fetcher in this app already builds its URL as
# f"{set_name}_{realization}", passing realization as the STRING
# "p{index}_{suffix}" (instead of an int) makes every existing Pk/FOF_Subfind/
# Sims/Rockstar/Caesar/SubLink/Photometry fetcher construct the correct real
# 1P path with zero changes to the fetchers themselves - confirmed by real
# HEAD requests against all of them before relying on this (2026-08-02).
ONEP_VARIATION_SUFFIX = {-2: "n2", -1: "n1", 0: "0", 1: "1", 2: "2"}

def onep_realization_id(param_index: int, variation: int) -> str:
    return f"p{param_index}_{ONEP_VARIATION_SUFFIX[variation]}"


# The 28 real IllustrisTNG 1P parameters, discovered (not guessed) by fetching
# the real FOF_Subfind header/Parameters attrs for the n2 and 2 variations of
# each index and finding which value actually differs (2026-08-01/02). p2 and
# p9 never appear in any output file's metadata (sigma_8 and n_s are only used
# at initial-condition generation time, never written to a runtime attribute)
# - identified only by elimination against the docs' "5 cosmological, 23
# astrophysical = 28 total" count, with every other index in that count
# independently confirmed. `attr_key` is the exact real HDF5 attribute name
# (Header or Parameters group) so a UI can show the real fetched value, not a
# guessed one; None for the two elimination-only entries.
ONEP_TNG_PARAMS = [
    {"index": 1,  "name": "Omega_m",                       "category": "cosmological",   "attr_key": "Omega0"},
    {"index": 2,  "name": "sigma_8",                        "category": "cosmological",   "attr_key": None},
    {"index": 3,  "name": "WindEnergyIn1e51erg",            "category": "astrophysical",  "attr_key": "WindEnergyIn1e51erg"},
    {"index": 4,  "name": "RadioFeedbackFactor",            "category": "astrophysical",  "attr_key": "RadioFeedbackFactor"},
    {"index": 5,  "name": "VariableWindVelFactor",          "category": "astrophysical",  "attr_key": "VariableWindVelFactor"},
    {"index": 6,  "name": "RadioFeedbackReiorientationFactor", "category": "astrophysical", "attr_key": "RadioFeedbackReiorientationFactor"},
    {"index": 7,  "name": "Omega_b",                        "category": "cosmological",   "attr_key": "OmegaBaryon"},
    {"index": 8,  "name": "HubbleParam (h)",                "category": "cosmological",   "attr_key": "HubbleParam"},
    {"index": 9,  "name": "n_s",                             "category": "cosmological",   "attr_key": None},
    {"index": 10, "name": "MaxSfrTimescale",                "category": "astrophysical",  "attr_key": "MaxSfrTimescale"},
    {"index": 11, "name": "FactorForSofterEQS",             "category": "astrophysical",  "attr_key": "FactorForSofterEQS"},
    {"index": 12, "name": "IMFslope",                        "category": "astrophysical",  "attr_key": "IMFslope"},
    {"index": 13, "name": "SNII_MinMass_Msun",              "category": "astrophysical",  "attr_key": "SNII_MinMass_Msun"},
    {"index": 14, "name": "ThermalWindFraction",            "category": "astrophysical",  "attr_key": "ThermalWindFraction"},
    {"index": 15, "name": "VariableWindSpecMomentum",       "category": "astrophysical",  "attr_key": "VariableWindSpecMomentum"},
    {"index": 16, "name": "WindFreeTravelDensFac",          "category": "astrophysical",  "attr_key": "WindFreeTravelDensFac"},
    {"index": 17, "name": "MinWindVel",                      "category": "astrophysical",  "attr_key": "MinWindVel"},
    {"index": 18, "name": "WindEnergyReductionFactor",      "category": "astrophysical",  "attr_key": "WindEnergyReductionFactor"},
    {"index": 19, "name": "WindEnergyReductionMetallicity", "category": "astrophysical",  "attr_key": "WindEnergyReductionMetallicity"},
    {"index": 20, "name": "WindEnergyReductionExponent",    "category": "astrophysical",  "attr_key": "WindEnergyReductionExponent"},
    {"index": 21, "name": "WindDumpFactor",                  "category": "astrophysical",  "attr_key": "WindDumpFactor"},
    {"index": 22, "name": "SeedBlackHoleMass",              "category": "astrophysical",  "attr_key": "SeedBlackHoleMass"},
    {"index": 23, "name": "BlackHoleAccretionFactor",       "category": "astrophysical",  "attr_key": "BlackHoleAccretionFactor"},
    {"index": 24, "name": "BlackHoleEddingtonFactor",       "category": "astrophysical",  "attr_key": "BlackHoleEddingtonFactor"},
    {"index": 25, "name": "BlackHoleFeedbackFactor",        "category": "astrophysical",  "attr_key": "BlackHoleFeedbackFactor"},
    {"index": 26, "name": "BlackHoleRadiativeEfficiency",   "category": "astrophysical",  "attr_key": "BlackHoleRadiativeEfficiency"},
    {"index": 27, "name": "QuasarThreshold",                 "category": "astrophysical",  "attr_key": "QuasarThreshold"},
    {"index": 28, "name": "QuasarThresholdPower",           "category": "astrophysical",  "attr_key": "QuasarThresholdPower"},
]
# p15 has no n2/n1 folders published for IllustrisTNG (confirmed via a real
# directory listing) - only variations 0, 1, 2 exist. Every other index has
# all 5. Not hidden - the UI should let p15 be picked and simply show
# "no data" for the two missing variations, same as any other real gap.
ONEP_TNG_MISSING_VARIATIONS = {15: {-2, -1}}

# Confirmed real (2026-08-04, direct directory listings): every suite uses
# this same "1P_p{index}_{suffix}" modern naming scheme for the products
# that use it (Pk, FOF_Subfind, Sims, Rockstar, Caesar, SubLink, Photometry -
# see onep_realization_id) - it's not an IllustrisTNG-only convention. What
# differs per suite is only the real parameter *count*, and - unverified so
# far - whether each index means the same physical parameter as
# IllustrisTNG's. Only IllustrisTNG's parameter identities have actually been
# checked (see ONEP_TNG_PARAMS's own diffing method) - the other suites are
# wired up as generic "p{N}" indices, honest about not (yet) knowing what
# each one physically represents, rather than guessing they match
# IllustrisTNG's order.
ONEP_MAX_INDEX_FOR_SUITE = {"IllustrisTNG": 28, "SIMBA": 28, "Astrid": 7, "Swift-EAGLE": 6}

N_SNAPSHOTS = 34  # snapshots 000-033

# Exact redshift of each snapshot, from the real scale-factor table shipped in
# the upstream repo (setup/times/times.txt: z = 1/a - 1). Real, not a fit.
SNAPSHOT_REDSHIFTS = [
    6.00, 5.00, 4.00, 3.50, 3.00, 2.81, 2.64, 2.47, 2.30, 2.15,
    2.00, 1.86, 1.73, 1.60, 1.48, 1.36, 1.25, 1.15, 1.05, 0.95,
    0.86, 0.77, 0.69, 0.61, 0.54, 0.47, 0.40, 0.33, 0.27, 0.21,
    0.15, 0.10, 0.05, 0.00,
]

# Suites with public Pk data in the first-generation (L25n256) box - see
# users.flatironinstitute.org/~camels/Pk/. Suites not listed here are either
# access-gated (Magneticum, Ramses, CROCODILE, Obsidian, Enzo) or don't have
# their own Pk folder (N-body) - real fetch is simply not attempted for them.
PUBLIC_PK_SUITES = {"IllustrisTNG", "SIMBA", "Astrid", "Swift-EAGLE"}

# Real public Pk files are one-per-species (Pk_c/Pk_m/Pk_g/Pk_s/Pk_bh), not
# arbitrary particle-type combinations - map our UI's ptype selections onto
# the closest real file. "Total" maps to the real matter file, which is
# computed from the full particle set (including black holes). Pk_bh (ptype
# 5, Gadget's black-hole particle type) was previously unexposed - confirmed
# real via a direct fetch (2026-08-02): Pk/IllustrisTNG/L25n256/LH/LH_1/
# Pk_bh_z=0.00.txt exists and parses like every other species file.
PK_SUFFIX_FOR_PTYPE = {
    (0,): "g",       # gas
    (1,): "c",       # CDM
    (4,): "s",       # stars
    (5,): "bh",      # black holes
    (0, 1, 4): "m",  # total matter
}

# Suites with public FOF/Subfind catalogs in the first-generation box.
PUBLIC_SUBFIND_SUITES = {"IllustrisTNG", "SIMBA", "Astrid", "Swift-EAGLE"}

# FOF/Subfind catalogs are numbered on their own ~0-90 output schedule, NOT
# the same integers as the 34-snapshot Pk/SFRH schedule - but verified
# directly (2026-08-02) that only 34 of those ~90 numbers are actually
# published, and sorted ascending they map exactly 1:1 onto
# SNAPSHOT_REDSHIFTS (checked all 34 real redshifts, zero mismatches, across
# IllustrisTNG/SIMBA/Astrid/Swift-EAGLE) - this SAME list of 34 numbers also
# turned out to be exactly the raw Sims snapshot_XXX.hdf5 numbering and
# CAESAR's caesar_newsnaps_XXX.hdf5 numbering (both confirmed real, not
# assumed). So the existing Snapshot slider (0-33) can drive all of these,
# not just Pk/SFRH/Bispectrum/Halo Gas Profiles/SubLink/Lyman-alpha.
SUBFIND_GROUPNUM_FOR_SNAPSHOT = [14, 18, 24, 28, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54,
                                  56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86,
                                  88, 90]
PUBLIC_SUBFIND_GROUPNUM = SUBFIND_GROUPNUM_FOR_SNAPSHOT[-1]  # 90, kept for any remaining z=0-only callers

# Rockstar's hlists are named by scale factor, not snapshot/groupnum, and
# (like AHF) each suite computes its own scale factors rather than the exact
# inverse of our rounded SNAPSHOT_REDSHIFTS table - confirmed these genuinely
# differ *by suite* (SIMBA's real files are ~0.0001-0.0003 off from
# IllustrisTNG's at the same schedule position, e.g. 0.14286 vs 0.14298), so
# a single hardcoded table would silently fetch the wrong file for other
# suites. Discovered via a real directory listing + closest-redshift match
# instead, same spirit as AHF's discovery (see _fetch_rockstar_halos).

# Raw snapshots use the same ~0-90 output schedule as FOF/Subfind (written at
# the same steps). Verified directly: IllustrisTNG, SIMBA, and Astrid all use
# the Gadget-style HDF5 layout (scalar or length-1 BoxSize, PartTypeN groups)
# that _fetch_and_grid_snapshot()/readgadget assume. Swift-EAGLE does NOT -
# it's SWIFT's own native format (BoxSize is a 3-vector, entirely different
# top-level groups: DMParticles/GasParticles/Cosmology/Units/...) and would
# need dedicated reading code, not a Gadget-format bug fix. Excluded here
# until that's built, rather than silently mishandled.
PUBLIC_SIMS_SUITES = {"IllustrisTNG", "SIMBA", "Astrid"}

# CMD's public 3D grids - confirmed suites (its data/ folder has no
# Swift-EAGLE, unlike Pk/Subfind) and its 5 published redshifts. Unlike Pk's
# ~22KB files, these are multi-GB stacked arrays - fetched via HTTP Range
# requests (see _fetch_npy_stack_slice) so only one realization's slice
# (a few MB-hundred MB depending on grid_res) is ever downloaded.
PUBLIC_CMD_GRID_SUITES = {"IllustrisTNG", "SIMBA", "Astrid"}
CMD_GRID_REDSHIFTS = [0.0, 0.5, 1.0, 1.5, 2.0]

# All 13 fields CMD publishes 3D grids for, matching camels_library's
# field_properties() naming exactly. Every field here is real (CMD-computed)
# for the 3 suites above - no per-field synthetic stand-in needed.
CMD_FIELDS = {
    "Mtot":  "Total matter density",
    "Mgas":  "Gas density",
    "Mcdm":  "Dark matter density",
    "Mstar": "Stellar density",
    "T":     "Gas temperature",
    "Z":     "Gas metallicity",
    "P":     "Gas pressure",
    "ne":    "Electron density",
    "HI":    "Neutral hydrogen density",
    "Vgas":  "Gas velocity",
    "Vcdm":  "Dark matter velocity",
    "B":     "Magnetic field strength",
    "MgFe":  "Magnesium-to-iron ratio",
}
DEFAULT_CMD_FIELD = "Mtot"

# Raw-snapshot fallback only implements the mass-type fields directly - the
# derived-physics fields (T/Z/P/ne/HI/velocities/B/MgFe) need real formulas
# from camels_library.py (temperature/pressure/electron_density/HI_mass) that
# aren't wired up yet. Not a priority: CMD already serves all 13 fields for
# these same 3 suites, so the fallback's main job is redundancy/finer
# resolution control, not field coverage.
RAW_SNAPSHOT_MASS_FIELDS = {
    "Mtot":  None,   # combine all species, handled specially
    "Mgas":  0,
    "Mcdm":  1,
    "Mstar": 4,
}

# CMD's 2D maps cover more suites than its 3D grids (precomputed, so
# Swift-EAGLE's different raw-snapshot format doesn't matter here at all) -
# but folder names differ from this app's suite names for one of them.
# Real (was hardcoded here before 2026-08-06 - see CMD_DATA_URL's own
# comment above): None when CAMELS_CMD_2D_MAPS_URL isn't set.
CMD_2D_MAPS_URL = os.environ.get("CAMELS_CMD_2D_MAPS_URL")
PUBLIC_CMD_MAP_SUITES = {"IllustrisTNG", "SIMBA", "Astrid", "Swift-EAGLE"}
CMD_MAP_SUITE_FOLDER = {
    "IllustrisTNG": "IllustrisTNG", "SIMBA": "SIMBA", "Astrid": "Astrid", "Swift-EAGLE": "EAGLE",
}
# CMD's 2D_maps folder also has Magneticum - deliberately excluded, it's a
# tier-2 (access-gated) suite per this project's data policy, not because
# the files themselves aren't fetchable. Its Nbody/ folder uses a different
# filename scheme entirely (Maps_Mtot_Nbody_<hydro-suite>_..., Mtot-only
# since there's no gas) and isn't wired up yet - a real follow-up, not
# blocking this feature.

# VIDE (watershed void finder) catalogs - only IllustrisTNG/LH/z=0.00 is
# actually populated (the VIDE_Voids/SIMBA/ folder exists but is empty, 0B).
# VIDE's own file-naming uses the short "Illustris" prefix, not "IllustrisTNG".
PUBLIC_VIDE_SUITES = {"IllustrisTNG"}
VIDE_SUITE_PREFIX = {"IllustrisTNG": "Illustris"}

# CAMELS-SAM (Santa Cruz Semi-Analytic Model on N-body sims) - a separate
# dataset entirely, not tied to any hydro suite. 1P is empty in the public
# release (0 bytes). LH is uniform (1000 realizations, each a plain
# .../sc-sam/{octant}/ folder) and is the only set wired up. CV is
# deliberately excluded despite existing: it only has 6 slots (CV_0-CV_5,
# CV_5 empty) and an irregular structure - CV_0/CV_1 nest *several* SAM
# parameter-variation reruns per realization (folders like fid-sc-sam/,
# Asn1x4p0-sc-sam/, ...), while CV_2-4 don't - a real follow-up, not a
# quick extension of the LH path pattern. Each LH realization is split
# across 8 spatial octants (~500MB-1.5GB each) - only one octant is fetched
# (a real 1/8-volume sample, not the full box), and only a byte-range tail
# of that (the file is ordered by redshift, high-z first - confirmed
# directly that the last bytes are z=0, not assumed).
PUBLIC_SAM_SETS = {"LH"}
CAMELS_SAM_BOX_SIZE = 100.0  # Mpc/h, per docs/source/SAM.rst
SAM_DEFAULT_OCTANT = "0_0_0"
GALPROP_COLUMNS = [
    "halo_index", "birthhaloid", "roothaloid", "redshift", "sat_type", "mhalo", "m_strip",
    "rhalo", "mstar", "mbulge", "mstar_merge", "v_disk", "sigma_bulge", "r_disk", "r_bulge",
    "mcold", "mHI", "mH2", "mHII", "Metal_star", "Metal_cold", "sfr", "sfrave20myr",
    "sfrave100myr", "sfrave1gyr", "mass_outflow_rate", "metal_outflow_rate", "mBH",
    "maccdot", "maccdot_radio", "tmerge", "tmajmerge", "mu_merge", "t_sat", "r_fric",
    "x_position", "y_position", "z_position", "vx", "vy", "vz",
]  # cross-validated against both camels-sam.readthedocs.io and the file's own header comments

# X-ray mock observations - the "reduced" product (CAMELS.Xray.hdf5, 457MB,
# one shared file for every suite/set/realization), not the full SIMPUT
# photon-list pipeline (X-rays/{suite}/{set}/... is 25-92GB per suite alone -
# real X-ray-observation software territory, deliberately out of scope).
# Real per-halo luminosity profiles in 7 radial bins (0.5-2.0 keV band),
# confirmed via a real lazy HDF5 read: only snap_032 is published (z=0.05,
# not z=0 - the only snapshot available for this product), and only
# IllustrisTNG + SIMBA have this product at all (confirmed real, not assumed -
# Astrid/Swift-EAGLE/Magneticum have no X-rays/ folder). SIMBA's LH set is
# very slightly incomplete (997/1000) - a missing realization returns None
# cleanly, same as every other real-data gap in this app.
PUBLIC_XRAY_URL = f"{PUBLIC_DATA_URL}/X-rays/CAMELS.Xray.hdf5"
PUBLIC_XRAY_SUITES = {"IllustrisTNG", "SIMBA"}
XRAY_SNAP_KEY = "snap_032"
XRAY_SNAPNUM = 32

# Alternate halo finders (AHF, Rockstar, CAESAR) - each a genuinely different
# file format, confirmed real via live directory listings before writing any
# parser (not assumed from docs). All fixed to the highest-redshift snapshot
# each format publishes (z~0), matching the rest of this app's z~0-only real
# data coverage. Suite coverage differs per finder - confirmed real, not
# assumed identical across finders.
PUBLIC_AHF_SUITES = {"IllustrisTNG", "SIMBA"}
AHF_SNAPNUM = N_SNAPSHOTS - 1  # 33 - AHF's own filenames encode redshift to
                                # 3 decimals (e.g. "z0.000"), computed from
                                # AHF's own internal cosmology, not exactly
                                # our SNAPSHOT_REDSHIFTS table - confirmed by
                                # comparing real filenames (z5.994 vs our
                                # 6.00 for snap000) - so the exact filename
                                # is discovered via a real directory-listing
                                # fetch + regex, never guessed/constructed.

PUBLIC_ROCKSTAR_SUITES = {"IllustrisTNG", "SIMBA", "Astrid"}  # confirmed real;
                                # *_DM (dark-matter-only) variants and the
                                # separate CAMELS-SAM/ Rockstar run exist too
                                # but are out of scope here (not this app's
                                # hydro suite selector)
ROCKSTAR_HLIST_Z0 = "hlist_1.00000.list"  # scale factor a=1.0 is exact by
                                # definition at z=0, unlike AHF's computed
                                # redshift string - safe to construct directly

PUBLIC_CAESAR_SUITES = {"IllustrisTNG", "SIMBA"}
CAESAR_SNAPNUM = PUBLIC_SUBFIND_GROUPNUM  # 90 - same z~0 snapshot number Subfind uses

ALT_FINDERS = ["AHF", "Rockstar", "CAESAR"]

# SubLink merger trees - real, but structurally different from a flat catalog
# (a graph, one whole-realization file). Confirmed via a real lazy HDF5 read
# that its SnapNum field uses the 34-snapshot Pk/SFRH schedule (0-33), NOT
# the ~0-90 raw-snapshot/Subfind numbering the rest of this app assumes for
# "real data" - a genuinely different cadence, not a typo. Cross-checked
# that snap 33's SubfindID indexes into the SAME z=0 Subfind catalog this
# app already fetches (get_halo_catalog): compared SubLink's Mass field
# against the sum of that catalog's per-species masses for 5 real SubfindIDs
# and got the same halos to within ~10% (the gap is just "total" vs
# "stellar+gas+dm+bh only", not a mismatch). Scoped to one tractable slice -
# a single subhalo's main-branch mass accretion history, walking
# FirstProgenitorID backward - rather than a full interactive tree browser.
PUBLIC_SUBLINK_SUITES = {"IllustrisTNG", "SIMBA", "Astrid"}

# Real black hole merger event log (2026-08-07, direct user request) - a
# genuinely undocumented raw simulation-output product (confirmed via a
# real directory listing, not CAMELS' own docs - camels.readthedocs.io's
# snapshots page explicitly says files like this "are barely used" and
# doesn't describe them). IllustrisTNG-only, confirmed real: SIMBA/Astrid's
# own Sims/{suite}/.../{set}_{realization}/ folders have no
# blackhole_mergers/ directory at all (SIMBA has a differently-structured
# blackhole_details/ instead, Astrid has neither). Split across
# blackhole_mergers_{0..47}.txt (one per MPI task the simulation ran on,
# small - a few KB each, ~100KB total per realization, cheap to fetch all
# 48 and concatenate - unlike blackhole_details_{0..47}.txt, ~9.5MB each,
# ~456MB/realization, deliberately not built here). Column meaning is
# NOT documented anywhere - inferred from GIZMO's own well-known black-
# hole-merger-logging convention (ThisTask, Time, ID_swallower,
# Mass_swallower, ID_swallowed, Mass_swallowed) and cross-checked directly:
# column 1 exactly matches the file's own task number on every real row
# fetched, confirming it. Stated plainly in this feature's own UI, not
# silently presented as officially documented.
PUBLIC_BLACKHOLE_MERGERS_SUITES = {"IllustrisTNG"}
N_BLACKHOLE_MERGER_TASKS = 48
SUBLINK_Z0_SNAPNUM = 33

# SO_properties / CGM (circumgalactic-medium) radial profiles - the roadmap
# flagged this as "the heaviest compute in the whole library" (grids every
# particle species, runs a compiled halo-association kernel, O(minutes) per
# snapshot), assuming it had to be computed live. It doesn't: `Profiles/` is
# a precomputed public product (illstack_CAMELS, see docs/source/Profiles.rst
# in the upstream repo) - one small (<1MB) HDF5 file per snapshot with
# spherically-averaged gas density/pressure/temperature/metallicity profiles
# for every halo, already run for us. Confirmed real via a lazy HDF5 read and
# cross-checked the physical output against the documented conversion
# formulas (e.g. the most massive halo in IllustrisTNG/LH_0 came out with a
# ~939 kpc R200c and a temperature profile peaking at ~2.6e7 K - textbook
# cluster-scale ICM, not a units bug). Uses the same 34-snapshot Pk/SFRH
# schedule (0-33), unlike Subfind/AHF/Rockstar/CAESAR's ~0-90 numbering.
# Scoped to LH/CV only - 1P uses a compound directory naming (e.g.
# "1P_4_n5") that doesn't match this app's simple "{set}_{realization}"
# convention used everywhere else, confirmed via a real directory listing.
PUBLIC_PROFILES_SUITES = {"IllustrisTNG", "SIMBA"}
PUBLIC_PROFILES_SETS = {"LH", "CV"}
PROFILES_FIELD_INDEX = {"Gas Density": 0, "Thermal Pressure": 1, "Metallicity": 2, "Temperature": 3}

# Photometry (Synthesizer-generated mock photometric catalogs) - real, and
# broader suite coverage than most other real-data products here (confirmed
# via docs/source/photometry.rst: "structured identically for IllustrisTNG,
# SIMBA, Swift-EAGLE and Astrid"). Fixed to snap_090 (z=0.00), the same
# snapshot number Subfind uses - convenient, no separate schedule to track.
# Raw datasets are absolute luminosities (erg/s/Hz-like units, BC03 model,
# dust-attenuated) with no documented absolute zero-point, so rather than
# guess one, this only ever computes *colors* (band-ratio magnitudes,
# -2.5*log10(L1/L2)) - the zero-point cancels out of a ratio, so this is
# correct regardless of the absolute calibration. Cross-matched with this
# app's existing Subfind catalog via the file's own `SubhaloIndex` (verified
# with real numbers: log10 M* range 7.7-11.3 Msun/h for IllustrisTNG/LH_1 -
# physically sane, not a units artifact).
PUBLIC_PHOTOMETRY_SUITES = {"IllustrisTNG", "SIMBA", "Astrid", "Swift-EAGLE"}
# SIMBA's photometry filenames use mixed-case "Simba" (confirmed via a real
# directory listing), unlike every other real-data product in this app where
# SIMBA's folder/file naming is all-caps - a genuine one-off inconsistency,
# not a typo here.
PHOTOMETRY_SUITE_FILENAME = {"SIMBA": "Simba"}
PHOTOMETRY_SNAPNUM = PUBLIC_SUBFIND_GROUPNUM  # 90, kept as the default snapnum
# Real per-snapshot photometry uses the same 34-entry schedule as everything
# else (confirmed real: snap_014...snap_090, same numbers as
# SUBFIND_GROUPNUM_FOR_SNAPSHOT) - was hardcoded to z=0 only.
PHOTOMETRY_SPS_MODELS = ["BC03", "BPASS"]
PHOTOMETRY_SPECTRA_TYPES = ["attenuated", "intrinsic"]  # dust-attenuated vs. dust-free -
                                                          # a real, meaningful comparison
# Real filter families, confirmed via a direct h5py inspection of a real file
# (2026-08-02), not the docs list - e.g. under .../luminosity/attenuated/, the
# real top-level HDF5 keys are exactly:
#   'GALEX FUV', 'GALEX NUV', 'Generic', 'HST', 'JWST', 'SLOAN', 'UKIRT',
#   'UV1500', 'UV2800'
# - five of those ("Generic", "HST", "JWST", "SLOAN", "UKIRT") are groups
# containing the actual per-band datasets (e.g. Generic/Johnson.U); the other
# four (GALEX FUV/NUV, UV1500, UV2800) are themselves single ungrouped
# datasets, not families with sub-bands. Same structure confirmed for both
# BC03/BPASS and attenuated/intrinsic. `hdf5_group` is None for those
# ungrouped ones (the band name IS the top-level key); label keys below are
# just for the UI and don't need to match the real HDF5 key ("Generic
# (Johnson)" displays what "Generic" actually contains).
PHOTOMETRY_FILTER_GROUPS = {
    "SLOAN": {"hdf5_group": "SLOAN",
               "bands": ["SDSS.u", "SDSS.g", "SDSS.r", "SDSS.i", "SDSS.z"]},
    "Generic (Johnson)": {"hdf5_group": "Generic",
                           "bands": ["Johnson.U", "Johnson.B", "Johnson.V", "Johnson.J"]},
    "HST": {"hdf5_group": "HST",
             "bands": ["ACS_HRC.F435W", "ACS_HRC.F606W", "ACS_HRC.F775W", "ACS_HRC.F814W",
                       "ACS_HRC.F850LP", "WFC3_IR.F098M", "WFC3_IR.F105W", "WFC3_IR.F110W",
                       "WFC3_IR.F125W", "WFC3_IR.F140W", "WFC3_IR.F160W"]},
    "JWST": {"hdf5_group": "JWST",
              "bands": ["NIRCam.F070W", "NIRCam.F090W", "NIRCam.F115W", "NIRCam.F150W",
                        "NIRCam.F200W", "NIRCam.F277W", "NIRCam.F356W", "NIRCam.F444W"]},
    "UKIRT": {"hdf5_group": "UKIRT",
               "bands": ["UKIDSS.Y", "UKIDSS.J", "UKIDSS.H", "UKIDSS.K"]},
    "UV / GALEX (rest-frame)": {"hdf5_group": None,
                                  "bands": ["GALEX FUV", "GALEX NUV", "UV1500", "UV2800"]},
}
# kept for backward reference to the original default
PHOTOMETRY_COLORS = {
    "g - r": ("SDSS.g", "SDSS.r"), "u - r": ("SDSS.u", "SDSS.r"),
    "u - g": ("SDSS.u", "SDSS.g"), "r - i": ("SDSS.r", "SDSS.i"), "i - z": ("SDSS.i", "SDSS.z"),
}

# Bispectrum (Bk) - real, but only for the LH set (confirmed via a real
# directory listing - no CV/1P/EX folders exist under Bk/{suite}/, matching
# the docs' own "for each simulation of the latin hypercube sets" wording).
# Only the low-k FFT-based estimator (real-space, no RSD) is wired up - the
# high-k HIPSTER-based files use a different schema (Legendre multipoles,
# not mu bins) and RSD variants add a third axis of complexity, both
# deliberately out of scope for now. Fixed to k1=k2 (still a genuine 1D line
# plot vs. k, matching this app's other statistics) - confirmed the file's
# own mu convention directly (not assumed): mu is the cosine of the angle
# between the k1/k2 vectors, read straight from the file's own header row
# (line 14: -0.9, -0.7, ..., 0.9 - 10 real mu bins, confirmed via a raw
# fetch), not hardcoded from the docs. mu=0.5 (index 7) is the one value
# that makes k1=k2=k3 truly equilateral; every other mu bin at fixed k1=k2
# is a real, distinct triangle shape (squeezed toward mu=0.9, stretched
# toward mu=-0.9) - exposing the choice lets a user see how the bispectrum's
# shape-dependence (not just its k-dependence) looks, a real second axis of
# this statistic that was previously hidden entirely.
PUBLIC_BK_SUITES = {"IllustrisTNG", "SIMBA"}
BK_TYPES = {"Total Matter": "m", "Gas": "g", "Dark Matter": "c"}
BK_MU_VALUES = [-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9]  # real header values
BK_EQUILATERAL_MU_INDEX = 7  # mu_arr[7] == 0.5, kept as the default

# Real high-k HIPSTER-based Bispectrum multipoles (2026-08-07, direct user
# request) - a genuinely separate product from the low-k FFT estimator
# above (confirmed via a real directory listing: Bk_{type}_highk[_RS{axis}]_
# z=0.00.txt sits alongside the lowk files). Reports Legendre multipoles
# B_ell(k1,k2) instead of mu bins - confirmed via a real raw fetch of both a
# real-space and a redshift-space file (not a summarized/truncated one - an
# earlier pass here trusted a truncated quote and wrongly assumed real-space
# only had 3 columns; a direct fetch of the actual file showed 6, same as
# RSD): both real-space and RSD files have exactly 6 numeric columns after
# k1/k2, ell=0..5 (l_max=5) either way - the real-space/RSD distinction is
# physical (odd multipoles are expected to be small/noise in real-space,
# not structurally absent), not a difference in column count.
BK_HIGHK_ELLS = [0, 1, 2, 3, 4, 5]

# PDF - real per-field histograms of CMD 3D grid pixel values, but for the
# *entire* 1000-realization LH ensemble in one file (not per-realization
# like everything else in this app) - confirmed via a real fetch: each row's
# counts sum to exactly grid^3 (2,097,152 for grid=128), i.e. every single
# grid cell in that realization's CMD grid, counted once. Real naming quirk
# confirmed via a directory listing (not assumed from docs.rst, which was
# wrong on this): redshift is formatted with **one** decimal (`z=0.0`), not
# the two decimals (`z=0.00`) every other real-data product in this app
# uses. Grid resolutions actually published are 128/256 (not 512, despite
# `pdf.rst` listing it). No bin edges or value-range/transform are given
# anywhere in the public docs for what physical range the 500 bins span -
# rather than guess a log/linear scheme, this only ever plots vs. the raw
# bin index (0-499) and says so explicitly, showing real distribution shape
# (skew, tails, unimodality) without a fabricated x-axis calibration.
PUBLIC_PDF_SUITES = {"IllustrisTNG", "SIMBA"}
PUBLIC_PDF_GRIDS = [128, 256]
PUBLIC_PDF_REDSHIFTS = [0.0, 0.5, 1.0, 1.5, 2.0]

# Lyman-alpha mock spectra (fake_spectra-generated). Real folder structure
# confirmed via WebFetch (all of LH/CV/1P/EX present, unlike Bk's LH-only
# coverage) - one HDF5 file per snapshot at
# {suite}/{set}/{set}_{realization}/SPECTRA_{snapnum:03d}/Lya-spectra.hdf5,
# same 34-snapshot (000-033) schedule as Pk/SFRH/Bk. docs/source/Lya.rst
# says to read this with the `fake_spectra` package, but a direct lazy h5py
# read is simpler and avoids that dependency entirely: `tau/H/1/1215` is
# already the exact per-sightline hydrogen Lyman-alpha (1215 Angstrom)
# optical-depth array the docs' own `fs.get_tau("H", 1, 1215)` example
# computes - confirmed by reading the real file's schema directly, not
# assumed. 5000 sightlines per file (2499 pixels each); only a single
# sightline row is ever fetched lazily (confirmed ~1.4s, not the full
# ~100MB array). Flux = exp(-tau) is the standard transmission conversion.
# The pixel axis has no published velocity/wavelength calibration in this
# app (fake_spectra's `dvbin` depends on its own internal cosmology-flow
# calculation, not just re-derivable from the file's stored attrs with
# confidence) - like PDF, this plots vs. raw pixel index rather than guess
# a physical unit.
PUBLIC_LYA_SUITES = {"IllustrisTNG", "SIMBA"}
LYA_N_SIGHTLINES = 5000

STATISTICS = ["Power Spectrum", "Halo Mass Function", "Stellar Mass Function", "SFR History",
              "Galaxy Scaling Relations", "Baryon Fraction", "3D Density Field", "3D Particle Cloud",
              "2D Field Map", "X-ray Halo Profiles", "Halo Gas Profiles", "Color-Mass Diagram",
              "Bispectrum", "Field PDF", "Lyman-alpha Spectrum"]


@dataclass
class Result:
    x: np.ndarray
    y: np.ndarray
    x_label: str
    y_label: str
    log_x: bool = True
    log_y: bool = True
    # Real fix (2026-08-06, code-quality audit): every construction site
    # for this dataclass already passes source="real" explicitly (the
    # synthetic fallback that used to default this was removed app-wide
    # 2026-08-05 - see this file's own module docstring) - "synthetic" was
    # dead, unreachable code. Matches the default every dataclass added
    # after that removal already uses (Catalog, XrayProfiles, etc.).
    source: str = "real"
    note: str = ""


@dataclass
class Field3D:
    density: np.ndarray   # (grid, grid, grid), values ~ rho/mean_rho
    box_size: float        # Mpc/h
    source: str = "real"   # see Result's own comment - dead "synthetic" default removed 2026-08-06
    note: str = ""


@dataclass
class Map2D:
    values: np.ndarray   # (256, 256) for real CMD maps
    box_size: float       # Mpc/h
    source: str = "real"   # see Result's own comment - dead "synthetic" default removed 2026-08-06
    note: str = ""


@dataclass
class Catalog:
    frame: pd.DataFrame
    box_size: float   # Mpc/h
    redshift: float
    source: str = "real"   # no synthetic version - see get_halo_catalog()
    note: str = ""
    raw_frame: pd.DataFrame | None = None  # frame's columns + every other real
                                            # column this file has - the escape
                                            # hatch for "the curated columns
                                            # don't have what I need." Same row
                                            # order/index as frame. None where
                                            # not wired up yet.


@dataclass
class ParticleCloud:
    positions: np.ndarray   # (N, 3), Mpc/h
    box_size: float         # Mpc/h
    source: str = "real"   # see Result's own comment - dead "synthetic" default removed 2026-08-06
    note: str = ""


@dataclass
class VoidCatalog:
    positions: np.ndarray         # (N, 3), Mpc/h
    radius: np.ndarray            # Mpc/h
    density_contrast: np.ndarray
    box_size: float                # Mpc/h
    extra: pd.DataFrame | None = None  # the file's other real columns this app didn't
                                        # otherwise curate: vol, vol_norm, void_id, num_part,
                                        # parent_id, tree_level, n_children, central_density
    source: str = "real"   # see Result's own comment - dead "synthetic" default removed 2026-08-06
    note: str = ""


@dataclass
class ScalingRelations:
    stellar_mass: np.ndarray   # Msun/h, bin centers
    radius: np.ndarray         # kpc/h, mean stellar half-mass radius per bin
    bh_mass: np.ndarray        # Msun/h, mean per bin
    sfr: np.ndarray            # Msun/yr, mean per bin
    vmax: np.ndarray           # km/s, mean per bin
    counts: np.ndarray         # galaxies per bin - bins with 0 count are unpopulated, not zero-valued
    metallicity: np.ndarray | None = None  # mean stellar metallicity per bin - the
                                            # mass-metallicity relation. get_scaling_relations'
                                            # one real construction path always populates this
                                            # today; stays optional because
                                            # render_scaling_relations_png's own
                                            # `has_metallicity` check still branches on it.
    source: str = "real"   # see Result's own comment - dead "synthetic" default removed 2026-08-06
    note: str = ""


@dataclass
class XrayProfiles:
    r_centers: np.ndarray      # kpc/h, geometric-mean bin centers (7 bins)
    luminosities: np.ndarray   # erg/s, shape (n_halos, 7), 0.5-2.0 keV band
    log_mass: np.ndarray       # log10 M200c [Msun/h], shape (n_halos,)
    source: str = "real"       # real-data only, no synthetic fallback (see get_xray_profiles)
    note: str = ""


@dataclass
class MergerHistory:
    redshift: np.ndarray   # one entry per snapshot along the main branch, root first
    mass: np.ndarray       # Msun/h, SubLink's total Subhalo mass at each snapshot
    subfind_id: int        # the root SubfindID (at root_snapnum) this history was traced from
    num_particles: np.ndarray | None = None  # SubLink's NumParticles at each snapshot -
                                              # a resolution/completeness proxy independent
                                              # of Mass, useful for spotting when a "merger"
                                              # mass jump is actually a low-particle-count
                                              # subhalo being swallowed vs. a genuine major merger
    source: str = "real"   # real-data only, no synthetic fallback (see get_merger_history)
    note: str = ""


@dataclass
class HaloProfiles:
    r: np.ndarray          # kpc (physical), 25 log-spaced bins
    values: np.ndarray      # shape (n_halos, 25), units depend on `units`
    log_mass: np.ndarray    # log10 M200c [Msun], shape (n_halos,)
    field: str
    units: str
    n_part: np.ndarray | None = None  # shape (n_halos, 25) - particles per radial bin
                                       # feeding each profile point; a direct Poisson-noise
                                       # proxy (relative error ~ 1/sqrt(n)) for error bars,
                                       # since illstack_CAMELS doesn't publish uncertainties
                                       # directly
    metadata: pd.DataFrame | None = None  # ~40 other real per-halo Group* fields this file
                                           # has beyond M200c/R200c (SFR, BH mass, alternate
                                           # mass/radius definitions, gas/star abundances,
                                           # substructure count, etc.) - same row order as
                                           # values/log_mass
    source: str = "real"    # real-data only, no synthetic fallback (see get_halo_profiles)
    note: str = ""


@dataclass
class ColorMassDiagram:
    color: np.ndarray       # band1 - band2, magnitudes (AB-like, zero-point-independent)
    log_mass: np.ndarray    # log10 Msun/h, cross-matched from the Subfind catalog
    color_label: str
    source: str = "real"    # real-data only, no synthetic fallback (see get_color_mass_diagram)
    note: str = ""


@dataclass
class FieldPDF:
    bin_index: np.ndarray    # 0-499, raw index - see get_field_pdf for why there's no physical x-axis
    mean_counts: np.ndarray  # mean count per bin across all 1000 LH realizations
    std_counts: np.ndarray   # std across those same realizations
    field: str
    source: str = "real"     # real-data only, no synthetic fallback (see get_field_pdf)
    note: str = ""


@dataclass
class LymanAlphaSpectrum:
    pixel: np.ndarray       # 0..nbins-1, raw index - no published velocity/wavelength calibration
    flux: np.ndarray        # transmitted flux fraction, exp(-tau), in [0, 1]
    sightline: int
    colden: np.ndarray | None = None  # neutral hydrogen column density per pixel
                                       # (colden/H/1 in the file, same shape as tau) - the
                                       # physical quantity tau is derived from; shows where
                                       # absorption comes from even in the fully-saturated
                                       # (flux=0) regime where tau/flux alone are uninformative
    source: str = "real"    # real-data only, no synthetic fallback (see get_lya_spectrum)
    note: str = ""


def _seed(*parts) -> int:
    """Deterministic seed from selection params, so re-picking the same
    (suite, set, realization, snapshot) gives the same synthetic curve."""
    key = "|".join(str(p) for p in parts)
    return int(hashlib.sha256(key.encode()).hexdigest()[:8], 16)


def _snapshot_to_redshift(snapnum: int) -> float:
    return SNAPSHOT_REDSHIFTS[snapnum]


@lru_cache(maxsize=64)
def _fetch_public_pk(suite, set_name, realization, redshift, ptype):
    """Fetch a real precomputed power spectrum from the public CAMELS data
    release. Returns (k, Pk) arrays, or None if this suite/species isn't
    published or the file can't be reached - callers should fall back to
    the synthetic curve in that case, not raise. `ptype` must be a tuple
    (not a list) - cached, so re-picking the same selection is instant and
    doesn't re-download."""
    if suite not in PUBLIC_PK_SUITES:
        return None
    suffix = PK_SUFFIX_FOR_PTYPE.get(ptype)
    if suffix is None:
        return None

    url = (f"{PUBLIC_DATA_URL}/Pk/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"Pk_{suffix}_z={redshift:.2f}.txt")
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            raw = response.read().decode()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    k, Pk = np.loadtxt(raw.splitlines(), unpack=True)
    return k, Pk


@lru_cache(maxsize=32)
def get_linear_pk_ics(suite, set_name, realization):
    """Real linear-theory matter Pk at z=0, generated by CAMB during initial-
    condition generation for this exact realization's cosmology - confirmed
    real (2026-08-02) at Sims/{suite}/L25n256/{set}/{set}_{realization}/ICs/
    Pk_m_z=0.000.txt (docs/source/snapshots.rst), a plain 2-column (k, Pk)
    text file, same trivial format as the regular Pk_*.txt products. Fixed
    to z=0 - this is the linear spectrum used to seed the ICs, not a function
    of the snapshot currently being viewed, so it's shown as-is (no growth-
    factor rescaling to the viewer's chosen redshift, which would need an
    additional cosmological calculation this app doesn't otherwise need and
    isn't confirmed against real data). Confirmed absent for Swift-EAGLE
    (different native output, same reason its raw snapshots are excluded
    elsewhere). Returns (k, Pk) or None."""
    if suite not in PUBLIC_SIMS_SUITES:
        return None
    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"ICs/Pk_m_z=0.000.txt")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None
    try:
        k, Pk = np.loadtxt(raw.splitlines(), unpack=True)
    except ValueError:
        return None
    return k, Pk


@lru_cache(maxsize=64)
def _fetch_public_subfind(suite, set_name, realization, snapnum=N_SNAPSHOTS - 1):
    """Download one real FOF/Subfind catalog from the public CAMELS data
    release. `snapnum` uses the same 0-33 schedule as Pk/SFRH - confirmed
    real (not assumed) that only 34 of the ~90 possible groupnum values are
    actually published, and sorted ascending they map exactly onto
    SNAPSHOT_REDSHIFTS (see SUBFIND_GROUPNUM_FOR_SNAPSHOT). Returns a dict of
    numpy arrays/floats, or None if unavailable. Cached - HMF, SMF, the
    catalog browser, and scaling relations all pull from the same fetched
    file at no extra download cost once a (suite, set, realization, snapnum)
    has been seen."""
    if suite not in PUBLIC_SUBFIND_SUITES:
        return None

    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    url = (f"{PUBLIC_DATA_URL}/FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"groups_{groupnum:03d}.hdf5")
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            raw = response.read()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    with tempfile.NamedTemporaryFile(suffix=".hdf5") as tmp:
        tmp.write(raw)
        tmp.flush()
        with h5py.File(tmp.name, "r") as f:
            header = f["Header"].attrs
            subhalo_mass_type = f["Subhalo/SubhaloMassType"][:] * 1e10  # Msun/h, (N, 6)
            n_subhalo = subhalo_mass_type.shape[0]

            # Every other real per-subhalo 1D dataset the file has (SubhaloVel,
            # SubhaloSpin, SubhaloGrNr, SubhaloIDMostbound, SubhaloWindMass,
            # SubhaloGasMetallicity, etc.) - the escape hatch for the Catalog
            # Browser's "show all fields" toggle. Collected dynamically since
            # this app already downloads the whole file anyway; (N,3)/(N,6)
            # datasets are split into indexed columns rather than skipped.
            already = {"SubhaloMassType", "SubhaloHalfmassRad", "SubhaloHalfmassRadType",
                       "SubhaloSFR", "SubhaloVmax", "SubhaloStarMetallicity"}
            # Real fix (camels.readthedocs.io/subfind.html#suite-differences,
            # confirmed directly): SIMBA's own docs state SubhaloStellarPhotometrics
            # and SubhaloWindMass hold "irrelevant numbers as those quantities are
            # not calculated within the SIMBA simulations" - excluded here rather
            # than surfaced as real data in the raw escape hatch with no warning.
            if suite == "SIMBA":
                already |= {"SubhaloStellarPhotometrics", "SubhaloWindMass"}
            raw_extra = {}

            def collect(name, obj):
                if not isinstance(obj, h5py.Dataset) or not name.startswith("Subhalo/"):
                    return
                short = name.split("/", 1)[1]
                if short in already or obj.shape[0] != n_subhalo:
                    return
                if obj.ndim == 1:
                    raw_extra[short] = obj[:]
                elif obj.ndim == 2 and obj.shape[1] <= 6:
                    for i in range(obj.shape[1]):
                        raw_extra[f"{short}_{i}"] = obj[:, i]
            f.visititems(collect)

            # Raw Header + Parameters (Arepo run-config) attrs, numeric/str only -
            # the file is already fully downloaded above, so this costs nothing
            # extra. Powers the 1P parameter picker's "real value" display
            # (ONEP_TNG_PARAMS' attr_key looks up into this dict) - not used for
            # any other set, but harmless to always include.
            raw_params = {}
            for attrs_group in (header, f["Parameters"].attrs if "Parameters" in f else {}):
                for k, v in dict(attrs_group).items():
                    if not isinstance(v, bytes):
                        raw_params[k] = v.item() if hasattr(v, "item") else v

            return {
                "box_size": header["BoxSize"] / 1e3,                # Mpc/h
                "redshift": float(header["Redshift"]),
                "omega_m": float(header.get("Omega0", 0.3)),        # 0.3 fallback if absent
                "group_mass": f["Group/GroupMass"][:] * 1e10,       # Msun/h
                "group_len_type": f["Group/GroupLenType"][:],
                "group_mass_type": f["Group/GroupMassType"][:] * 1e10,  # Msun/h, (N, 6) per-species
                "subhalo_stellar_mass": subhalo_mass_type[:, 4],
                "subhalo_gas_mass": subhalo_mass_type[:, 0],
                "subhalo_dm_mass": subhalo_mass_type[:, 1],
                "subhalo_bh_mass": subhalo_mass_type[:, 5],
                "subhalo_halfmass_rad": f["Subhalo/SubhaloHalfmassRad"][:] / 1e3,  # Mpc/h
                "subhalo_stellar_halfmass_rad": f["Subhalo/SubhaloHalfmassRadType"][:, 4],  # kpc/h
                "subhalo_sfr": f["Subhalo/SubhaloSFR"][:],           # Msun/yr
                "subhalo_vmax": f["Subhalo/SubhaloVmax"][:],         # km/s
                "subhalo_metallicity": f["Subhalo/SubhaloStarMetallicity"][:],
                "subhalo_raw_extra": raw_extra,
                "raw_params": raw_params,
            }


def _fetch_npy_stack_slice(url, index):
    """Fetch one slice (index along axis 0) of a large stacked .npy array
    served over plain HTTP, using Range requests - downloads only the header
    plus that one slice's bytes, never the whole (often many-GB) file.
    Returns a numpy array of shape stack.shape[1:], or None on any failure
    (including a server that doesn't honor Range requests, or index out of
    bounds)."""
    try:
        req = urllib.request.Request(url, headers={"Range": "bytes=0-9"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status != 206:
                return None
            preamble = resp.read()
        if preamble[:6] != b"\x93NUMPY":
            return None
        header_len = int.from_bytes(preamble[8:10], "little")
        data_offset = 10 + header_len

        req = urllib.request.Request(url, headers={"Range": f"bytes=10-{9 + header_len}"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            header = ast.literal_eval(resp.read().decode())

        dtype = np.dtype(header["descr"])
        shape = header["shape"]
        if index >= shape[0]:
            return None
        slice_shape = shape[1:]
        slice_bytes = int(np.prod(slice_shape)) * dtype.itemsize
        start = data_offset + index * slice_bytes
        end = start + slice_bytes - 1

        req = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
        return np.frombuffer(raw, dtype=dtype).reshape(slice_shape)
    except (urllib.error.URLError, TimeoutError, ValueError, SyntaxError, KeyError):
        return None


@lru_cache(maxsize=16)
def _fetch_public_cmd_grid(suite, set_name, realization, grid_res, redshift, field=DEFAULT_CMD_FIELD):
    """Real 3D field grid from the CAMELS Multifield Dataset's public 3D
    grids, for any of the 13 fields in CMD_FIELDS. Only 5 redshifts are
    published (0.0/0.5/1.0/1.5/2.0) - snaps to the nearest. Returns
    (grid, actual_redshift), or None if unavailable."""
    if not CMD_DATA_URL or suite not in PUBLIC_CMD_GRID_SUITES or grid_res not in (128, 256, 512) or field not in CMD_FIELDS:
        return None
    z = min(CMD_GRID_REDSHIFTS, key=lambda cz: abs(cz - redshift))

    url = f"{CMD_DATA_URL}/{suite}/Grids_{field}_{suite}_{set_name}_{grid_res}_z={z}.npy"
    grid = _fetch_npy_stack_slice(url, realization)
    if grid is None:
        return None
    return grid, z


@lru_cache(maxsize=8)
def _fetch_snapshot_positions(suite, set_name, realization, part_type=1, max_particles=2_000_000,
                               snapnum=N_SNAPSHOTS - 1):
    """Stream real particle positions lazily from a raw public snapshot over
    HTTP (fsspec issues Range requests under the hood, so the ~2-2.5GB file
    is never downloaded whole), subsampled via a stride to ~max_particles.
    Real particles, just coarser sampling, not synthetic. Shared by the
    density-field gridder and the particle-cloud viewer so switching between
    them on the same (suite, set, realization) doesn't re-fetch. `snapnum`
    uses the same 0-33 schedule as FOF/Subfind (confirmed real: raw Sims
    snapshot_XXX.hdf5 numbering matches SUBFIND_GROUPNUM_FOR_SNAPSHOT exactly)
    - previously hardcoded to snapshot 90 (z=0) regardless of the caller's
    snapshot choice, a real bug fixed 2026-08-02. Returns (positions [Mpc/h,
    N x 3], box_size [Mpc/h], redshift), or None."""
    if suite not in PUBLIC_SIMS_SUITES:
        return None

    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"snapshot_{groupnum:03d}.hdf5")
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                # BoxSize/Redshift come back as length-1 arrays for some codes
                # (e.g. Swift-EAGLE) and plain scalars for others (Arepo/Gadget) -
                # float() coerces either case; MAS_library.MA() needs a real
                # Python float, not a numpy array, or it fails.
                box_size = float(hf["Header"].attrs["BoxSize"]) / 1e3       # Mpc/h
                redshift = float(hf["Header"].attrs["Redshift"])
                n_part = hf[f"PartType{part_type}/Coordinates"].shape[0]
                stride = max(1, n_part // max_particles)
                pos = hf[f"PartType{part_type}/Coordinates"][::stride].astype(np.float32) / 1e3
    except Exception:
        logger.exception("_fetch_snapshot_positions failed for suite=%s set_name=%s realization=%s", suite, set_name, realization)
        return None

    return pos, box_size, redshift


@lru_cache(maxsize=8)
def _fetch_snapshot_field_positions(suite, set_name, realization, field, max_particles=2_000_000,
                                     snapnum=N_SNAPSHOTS - 1):
    """Real particle positions + per-particle mass weights for one of the
    mass-type fields (Mgas/Mcdm/Mstar/Mtot), for weighted gridding. Separate
    from _fetch_snapshot_positions (which is DM-only/unweighted, used by the
    particle-cloud view) since this needs per-species mass weights. Only
    the 4 mass-type fields are supported - see RAW_SNAPSHOT_MASS_FIELDS for
    why the derived-physics fields aren't implemented here. `snapnum` uses
    the same 0-33 schedule as FOF/Subfind - previously hardcoded to snapshot
    90 (z=0), a real bug fixed 2026-08-02 (see _fetch_snapshot_positions).
    Returns (positions [Mpc/h, N x 3], weights [Msun/h], box_size, redshift)
    or None."""
    if suite not in PUBLIC_SIMS_SUITES or field not in RAW_SNAPSHOT_MASS_FIELDS:
        return None

    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"snapshot_{groupnum:03d}.hdf5")
    part_types = [0, 1, 4] if field == "Mtot" else [RAW_SNAPSHOT_MASS_FIELDS[field]]
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                box_size = float(hf["Header"].attrs["BoxSize"]) / 1e3
                redshift = float(hf["Header"].attrs["Redshift"])
                mass_table = hf["Header"].attrs["MassTable"]

                pos_parts, weight_parts = [], []
                for pt in part_types:
                    group = f"PartType{pt}"
                    if group not in hf or hf[f"{group}/Coordinates"].shape[0] == 0:
                        continue  # e.g. a box with zero star/BH particles
                    n = hf[f"{group}/Coordinates"].shape[0]
                    stride = max(1, n // max_particles)
                    p = hf[f"{group}/Coordinates"][::stride].astype(np.float32) / 1e3
                    if f"{group}/Masses" in hf:
                        w = hf[f"{group}/Masses"][::stride].astype(np.float32) * 1e10
                    else:
                        # equal-mass species (typically DM): mass comes from the
                        # header's per-type table, not a per-particle dataset
                        w = np.full(p.shape[0], float(mass_table[pt]) * 1e10, dtype=np.float32)
                    pos_parts.append(p)
                    weight_parts.append(w)
                if not pos_parts:
                    return None
                pos = np.concatenate(pos_parts)
                weights = np.concatenate(weight_parts)
    except Exception:
        logger.exception("_fetch_snapshot_field_positions failed for suite=%s set_name=%s realization=%s field=%s", suite, set_name, realization, field)
        return None

    return pos, weights, box_size, redshift


def _fetch_and_grid_snapshot(suite, set_name, realization, grid_res, field=DEFAULT_CMD_FIELD,
                             max_particles=2_000_000, snapnum=N_SNAPSHOTS - 1):
    """Real per-particle gridding: real particle positions (mass-weighted
    for the selected field) painted onto a grid with the real
    `MAS_library.MA()`. Needs Pylians installed; returns
    (grid, box_size, redshift, n_particles_used) or None."""
    if not HAVE_CAMELS_LIBRARY:
        return None
    fetched = _fetch_snapshot_field_positions(suite, set_name, realization, field,
                                              max_particles=max_particles, snapnum=snapnum)
    if fetched is None:
        return None
    pos, weights, box_size, redshift = fetched

    try:
        delta = np.zeros((grid_res, grid_res, grid_res), dtype=np.float32)
        MASL.MA(pos, delta, box_size, "CIC", W=weights)
        mean = delta.mean()
        if mean <= 0:
            return None
        delta /= mean  # counts -> overdensity (rho/mean_rho), matching the synthetic convention
    except Exception:
        logger.exception("_fetch_and_grid_snapshot failed for suite=%s set_name=%s realization=%s field=%s", suite, set_name, realization, field)
        return None  # any gridding failure -> caller falls back to synthetic

    return delta, box_size, redshift, pos.shape[0]


# ---------------------------------------------------------------------------
# Power spectrum  (mirrors camels_library.compute_Pk)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=32)
def _fetch_public_pk_allk(suite, set_name, realization, redshift, ptype, rsd_axis=None):
    """Real all-k power spectrum: PYLIANS (k < ~25 h/Mpc) combined with the
    HIPSTER pair-counting estimator (k > 25 h/Mpc, up to k~1000 h/Mpc) -
    confirmed real via a direct fetch (2026-08-04), same suites/sets as the
    standard Pk files. `rsd_axis=None` is real-space (2 columns: k, P(k)).
    `rsd_axis` in {0, 1, 2} is redshift-space along that Cartesian axis (4
    columns: k, P_0(k) monopole, P_2(k) quadrupole, P_4(k) hexadecapole -
    confirmed real from the file's own header, not assumed)."""
    if suite not in PUBLIC_PK_SUITES:
        return None
    suffix = PK_SUFFIX_FOR_PTYPE.get(ptype)
    if suffix is None:
        return None

    rs_part = f"_RS{rsd_axis}" if rsd_axis is not None else ""
    url = (f"{PUBLIC_DATA_URL}/Pk/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"Pk_{suffix}_allk{rs_part}_z={redshift:.2f}.txt")
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            raw = response.read().decode()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    cols = np.loadtxt(raw.splitlines(), unpack=True)
    return cols  # shape (2, N) real-space, or (4, N) redshift-space


def get_power_spectrum(suite, set_name, realization, snapnum, grid, MAS, threads, ptype,
                        snapshot_path: str | None = None, fetch_public: bool = False,
                        k_range: str = "standard", rsd_axis: int | None = None,
                        multipole: str = "P0") -> Result | None:
    z = _snapshot_to_redshift(snapnum)

    if fetch_public and k_range == "allk":
        fetched = _fetch_public_pk_allk(suite, set_name, realization, z, tuple(ptype), rsd_axis)
        if fetched is not None:
            k = fetched[0]
            if rsd_axis is None:
                y = fetched[1]
                mode_label = "real-space"
            else:
                col = {"P0": 1, "P2": 2, "P4": 3}[multipole]
                y = fetched[col]
                mode_label = f"redshift-space, axis {rsd_axis}, {multipole}"
            # P0 (monopole) is always positive, like the standard Pk, so log-y is fine
            # (and is the Result default). P2/P4 (quadrupole/hexadecapole) are signed -
            # confirmed real, e.g. P2 is negative at several k-bins in the raw file - a
            # log-scale axis can't render negative values at all, so those must use a
            # linear y-axis or the plot silently drops/breaks on most of the curve.
            return Result(
                x=k, y=y,
                x_label="k [h/Mpc]", y_label="P(k) [(Mpc/h)$^3$]",
                log_y=(multipole == "P0" or rsd_axis is None),
                source="real",
                note=(f"z = {z:.2f}, ptype = {ptype}, all-k ({mode_label}) - public CAMELS "
                      f"data release (Pk/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"PYLIANS k<25 h/Mpc + HIPSTER k>25 h/Mpc up to k~1000 h/Mpc)"),
            )
        # Falls through to the standard/synthetic paths below if all-k isn't
        # published for this suite/set/realization - same honest-fallback
        # pattern as everywhere else, not a special case for this mode.

    if fetch_public:
        fetched = _fetch_public_pk(suite, set_name, realization, z, tuple(ptype))
        if fetched is not None:
            k, Pk = fetched
            return Result(
                x=k, y=Pk,
                x_label="k [h/Mpc]", y_label="P(k) [(Mpc/h)$^3$]",
                source="real",
                note=(f"z = {z:.2f}, ptype = {ptype} - public CAMELS data release "
                      f"(Pk/{suite}/L25n256/{set_name}/{set_name}_{realization})"),
            )

    if snapshot_path and HAVE_CAMELS_LIBRARY:
        try:
            # Real call would look like:
            # CL.compute_Pk(snapshot_path, grid, MAS, threads, ptype, root_out)
            # then read back the saved "Pk_..._z=....txt" file.
            raise NotImplementedError("wire up real snapshot read here")
        except Exception:
            pass  # fall through - no real data available

    return None


# ---------------------------------------------------------------------------
# Halo mass function  (mirrors camels_library.halo_mass_function)
# ---------------------------------------------------------------------------

def get_halo_mass_function(suite, set_name, realization, snapnum, RMmin, RMmax, bins,
                            subfind_path: str | None = None, fetch_public: bool = False) -> Result | None:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization, snapnum)
        if catalog is not None:
            # >50 CDM particles per halo, matching the cut in the upstream
            # halo_mass_function() so results are directly comparable to it.
            halo_mass = catalog["group_mass"][catalog["group_len_type"][:, 1] > 50]

            RM_bins = np.logspace(np.log10(RMmin), np.log10(RMmax), bins + 1)
            RM_mean = 10 ** (0.5 * (np.log10(RM_bins[1:]) + np.log10(RM_bins[:-1])))
            dRM = RM_bins[1:] - RM_bins[:-1]

            Om = catalog["omega_m"]
            HMF = np.histogram(halo_mass / Om, RM_bins)[0]
            HMF = HMF / (catalog["box_size"] ** 3 * dRM * Om)

            return Result(
                x=RM_mean, y=np.clip(HMF, 1e-12, None),
                x_label="Mass / Omega_m [Msun/h]", y_label="dn/dlogM [(Mpc/h)^-3]",
                source="real",
                note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
                      f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"catalog #{SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]})"),
            )

    if subfind_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up real subfind read here")
        except Exception:
            pass

    return None


def get_cross_finder_hmf(suite, set_name, realization, snapnum, mass_min, mass_max, bins,
                          fetch_public: bool = False) -> dict:
    """Real halo-mass-function *shape* overlay across every halo finder this
    app has (Subfind/AHF/Rockstar/CAESAR), for direct comparison - checking
    whether a physical conclusion is robust to finder choice is a genuine,
    recognized cosmology research pattern (this app already surfaced a real
    example: 3133 AHF halos vs 5857 Rockstar vs 17261 CAESAR for the same
    IllustrisTNG/LH_42 realization). Deliberately does NOT apply Subfind's
    Ωm-normalization (see get_halo_mass_function) - Ωm isn't available on the
    alternate finders' Catalog objects, and assuming a fixed Ωm would be
    wrong for LH/1P/SB realizations where it's exactly what's varied. This is
    a plain dn/dlogM per box volume, consistent across every curve in this
    comparison - not numerically identical to the standalone HMF panel above,
    which is a real, deliberate difference, not an oversight.
    Returns {finder_name: Result}, skipping any finder without real data for
    this suite/set/realization/snapshot (not an error - a real gap, same
    honesty as everywhere else in this app)."""
    if not fetch_public:
        return {}

    mass_bins = np.logspace(np.log10(mass_min), np.log10(mass_max), bins + 1)
    mass_mean = np.sqrt(mass_bins[1:] * mass_bins[:-1])
    dlogM = np.diff(np.log10(mass_bins))

    def _bin(masses, box_size):
        counts = np.histogram(masses, mass_bins)[0]
        dn_dlogm = counts / (box_size ** 3 * dlogM)
        return Result(
            x=mass_mean, y=np.clip(dn_dlogm, 1e-12, None),
            x_label="Halo Mass [Msun/h]", y_label="dn/dlogM [(Mpc/h)^-3]",
            source="real",
        )

    results = {}

    # Subfind: FOF-group-level mass, from the raw fetch dict (the Catalog
    # Browser's Subfind table is subhalo-level and has no "Halo Mass" column
    # at all - this is the same >50-CDM-particle cut get_halo_mass_function
    # itself uses).
    sf = _fetch_public_subfind(suite, set_name, realization, snapnum)
    if sf is not None:
        keep = sf["group_len_type"][:, 1] > 50
        r = _bin(sf["group_mass"][keep], sf["box_size"])
        r.note = f"Subfind (FOF), z = {sf['redshift']:.2f}, {int(keep.sum())} halos"
        results["Subfind"] = r

    # AHF and Rockstar's tables mix host (distinct) halos together with
    # subhalos/substructure in one flat table - confirmed real (2026-08-02):
    # AHF has a real `hostHalo` column (0 = distinct host, nonzero = a
    # subhalo pointing at its host's ID); Rockstar has `pid` (-1 = distinct
    # host, otherwise the parent's ID). Without filtering these out, their
    # halo counts (and this comparison's low-mass end especially, since
    # satellites skew low-mass) were inflated by counting substructure as if
    # it were independent halos - an apples-to-oranges artifact against
    # Subfind's FOF groups and CAESAR's halo_data, both of which are
    # genuinely host-only already (FOF groups are top-level by construction;
    # CAESAR architecturally separates halos from galaxies/substructure).
    # This filter isolates the comparison to genuine mass-DEFINITION
    # differences across finders (FOF vs. spherical-overdensity virial mass
    # conventions really do disagree systematically in the literature) -
    # that's a real, legitimate difference this comparison should still show,
    # not something to filter away.
    HOST_ONLY_FILTER = {
        "AHF": ("hostHalo", lambda col: col == 0),
        "Rockstar": ("pid", lambda col: col == -1),
    }

    for finder in ("AHF", "Rockstar", "CAESAR"):
        cat = get_alt_halo_catalog(finder, suite, set_name, realization, snapnum, fetch_public=True)
        if cat is None:
            continue
        mass_col = next((c for c in cat.frame.columns if c.startswith("Halo Mass")), None)
        if mass_col is None:
            continue
        masses = cat.frame[mass_col].to_numpy()
        n_total = len(masses)

        substructure_note = ""
        if finder in HOST_ONLY_FILTER and cat.raw_frame is not None:
            filt_col, is_host = HOST_ONLY_FILTER[finder]
            if filt_col in cat.raw_frame.columns:
                host_mask = is_host(cat.raw_frame[filt_col].to_numpy())
                masses = masses[host_mask]
                n_dropped = n_total - len(masses)
                if n_dropped > 0:
                    substructure_note = f" ({n_dropped} subhalos excluded)"

        r = _bin(masses, cat.box_size)
        r.note = f"{finder}, z = {cat.redshift:.2f}, {len(masses)} host halos{substructure_note}"
        results[finder] = r

    return results


# ---------------------------------------------------------------------------
# Baryon fraction  (mirrors camels_library.baryon_fraction_FoF)
# ---------------------------------------------------------------------------

def get_baryon_fraction(suite, set_name, realization, snapnum, RMmin, RMmax, bins,
                         subfind_path: str | None = None, fetch_public: bool = False) -> Result | None:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization, snapnum)
        if catalog is not None:
            # >50 CDM particles per halo, matching the upstream cut.
            keep = catalog["group_len_type"][:, 1] > 50
            halo_mass = catalog["group_mass"][keep]
            mass_type = catalog["group_mass_type"][keep]

            RM_bins = np.logspace(np.log10(RMmin), np.log10(RMmax), bins + 1)
            RM_mean = 10 ** (0.5 * (np.log10(RM_bins[1:]) + np.log10(RM_bins[:-1])))

            Om = catalog["omega_m"]
            # baryon fraction in units of the cosmic baryon fraction (0.049/Om)
            fraction = ((mass_type[:, 0] + mass_type[:, 4] + mass_type[:, 5]) / halo_mass) / (0.049 / Om)

            total = np.histogram(halo_mass / Om, RM_bins, weights=fraction)[0]
            counts = np.histogram(halo_mass / Om, RM_bins)[0]
            populated = counts > 0
            mean_fraction = np.zeros(bins)
            mean_fraction[populated] = total[populated] / counts[populated]

            return Result(
                x=RM_mean[populated], y=mean_fraction[populated],
                x_label="Mass / Omega_m [Msun/h]", y_label="Baryon fraction / cosmic fraction",
                log_y=False, source="real",
                note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
                      f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"catalog #{SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]})"),
            )

    return None


# ---------------------------------------------------------------------------
# Stellar mass function  (mirrors camels_library.stellar_mass_function)
# ---------------------------------------------------------------------------

def get_stellar_mass_function(suite, set_name, realization, snapnum, SMmin, SMmax, bins,
                               subfind_path: str | None = None, fetch_public: bool = False) -> Result | None:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization, snapnum)
        if catalog is not None:
            SM = catalog["subhalo_stellar_mass"]
            bins_SM = np.logspace(np.log10(SMmin), np.log10(SMmax), bins + 1)
            mean_SM = 0.5 * (bins_SM[1:] + bins_SM[:-1])
            dSM = bins_SM[1:] - bins_SM[:-1]

            SMF = np.histogram(SM, bins_SM)[0]
            SMF = SMF / (catalog["box_size"] ** 3 * dSM)

            return Result(
                x=mean_SM, y=np.clip(SMF, 1e-12, None),
                x_label="Stellar mass [Msun/h]", y_label="dn/dlogM [(Mpc/h)^-3]",
                source="real",
                note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
                      f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"catalog #{SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]})"),
            )

    if subfind_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up real subfind read here")
        except Exception:
            pass

    return None


def _render_result_png(compute, set_name, realizations, overlay=None) -> bytes | None:
    """Shared static matplotlib rendering for every 1D `Result`-shaped
    statistic (Stellar Mass Function, Halo Mass Function, Baryon Fraction,
    Power Spectrum, Bispectrum, SFR History) - mirrors app.py's own single
    shared plotting block (the generic `else:` branch every one of these six
    statistics dispatches through - see `_compute_result`), including its
    two real per-statistic overlay curves (SFR History's symbolic-regression
    fit, Power Spectrum's linear-theory Pk). This is the codebase's own
    evidence for the abstraction, not an invented one: figsize=(8, 4.5),
    lw=2, per-realization label, conditional log scale from the Result's own
    log_x/log_y, grid(alpha=0.3, which="both"), legend only when comparing
    more than one realization or an overlay is drawn, tight_layout(). This
    is the *default* render for these statistics in the Streamlit prototype
    - the new frontend's interactive Plotly chart is the opt-in
    alternative, not the reverse.

    `compute` is a one-realization-at-a-time callable, already bound to
    every other real parameter via the caller's own closure - this function
    stays agnostic to how different each statistic's real signature is.
    `overlay(ax) -> bool`, if given, draws one extra dashed curve directly
    on the axis and returns whether it actually drew anything (so the
    legend only appears once there's something real to label) - matches
    app.py's own `show_legend = True` only firing inside the same
    conditional that actually plots the overlay curve. Realizations with no
    real data are dropped the same way app.py's own generic block does;
    returns None (not an error - api/deps.py's require() 404s it, same
    honesty as every other real-data-only endpoint) if none remain."""
    results = {r: compute(r) for r in realizations}
    results = {r: res for r, res in results.items() if res is not None}
    if not results:
        return None
    first_result = next(iter(results.values()))

    # Real fix (2026-08-06, code-quality audit): built via Figure/
    # FigureCanvasAgg (_finish_png), whole render body locked via
    # `_PNG_RENDER_LOCK` - see that lock's own docs for why every
    # render_*_png function in this file needs this, not just the one
    # (render_field_map_2d_png) where it was first caught, and why the lock
    # must wrap the ENTIRE render body (imshow/plot/tight_layout do
    # thread-unsafe work too, not just the final print_png). dpi=150/
    # facecolor="white" now live on the Figure itself rather than a
    # savefig() kwarg - the frontend's white --color-surface-chart card
    # assumes a white facecolor; matplotlib's own default can drift with
    # rcParams, so this is asserted, not assumed.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(8, 4.5), dpi=150, facecolor="white")
        ax = fig.subplots()
        for r, result in results.items():
            ax.plot(result.x, result.y, lw=2, label=f"{set_name}_{r}")

        show_legend = len(results) > 1
        if overlay is not None and overlay(ax):
            show_legend = True

        if first_result.log_x:
            ax.set_xscale("log")
        if first_result.log_y:
            ax.set_yscale("log")
        ax.set_xlabel(first_result.x_label)
        ax.set_ylabel(first_result.y_label)
        ax.grid(alpha=0.3, which="both")
        if show_legend:
            ax.legend(fontsize=8)
        fig.tight_layout()
        return _finish_png(fig)


def _render_mass_range_png(compute, suite, set_name, realizations, snapnum, mmin, mmax, bins,
                            fetch_public: bool = False) -> bytes | None:
    """Mass-range statistics (Stellar Mass Function, Halo Mass Function,
    Baryon Fraction) - identical shape modulo which get_* function computes
    the curve and its mass-param names. Thin wrapper over
    _render_result_png, which every 1D Result-shaped statistic shares."""
    return _render_result_png(
        lambda r: compute(suite, set_name, r, snapnum, mmin, mmax, bins, fetch_public=fetch_public),
        set_name, realizations,
    )


def render_stellar_mass_function_png(suite, set_name, realizations, snapnum, SMmin, SMmax, bins,
                                      fetch_public: bool = False) -> bytes | None:
    return _render_mass_range_png(get_stellar_mass_function, suite, set_name, realizations, snapnum,
                                   SMmin, SMmax, bins, fetch_public=fetch_public)


def render_halo_mass_function_png(suite, set_name, realizations, snapnum, RMmin, RMmax, bins,
                                   fetch_public: bool = False) -> bytes | None:
    return _render_mass_range_png(get_halo_mass_function, suite, set_name, realizations, snapnum,
                                   RMmin, RMmax, bins, fetch_public=fetch_public)


def render_baryon_fraction_png(suite, set_name, realizations, snapnum, RMmin, RMmax, bins,
                                fetch_public: bool = False) -> bytes | None:
    return _render_mass_range_png(get_baryon_fraction, suite, set_name, realizations, snapnum,
                                   RMmin, RMmax, bins, fetch_public=fetch_public)


def render_power_spectrum_png(suite, set_name, realizations, snapnum, grid, MAS, threads, ptype,
                               fetch_public: bool = False, k_range: str = "standard",
                               rsd_axis: int | None = None, multipole: str = "P0",
                               show_linear_pk: bool = False) -> bytes | None:
    """Mirrors app.py's own "Power Spectrum" + show_linear_pk overlay
    exactly (get_linear_pk_ics, dashed black line, only drawn if real data
    exists for this suite/set/first realization)."""
    def overlay(ax) -> bool:
        if not show_linear_pk:
            return False
        lin = get_linear_pk_ics(suite, set_name, realizations[0])
        if lin is None:
            return False
        k_lin, Pk_lin = lin
        ax.plot(k_lin, Pk_lin, "k--", lw=1.5, label="linear theory, z=0 (from ICs)")
        return True

    return _render_result_png(
        lambda r: get_power_spectrum(suite, set_name, r, snapnum, grid, MAS, threads, ptype,
                                      fetch_public=fetch_public, k_range=k_range,
                                      rsd_axis=rsd_axis, multipole=multipole),
        set_name, realizations, overlay=overlay,
    )


def render_bispectrum_png(suite, set_name, realizations, field, mu_index=BK_EQUILATERAL_MU_INDEX,
                           k_range: str = "lowk", rsd_axis: int | None = None, ell: int = 0,
                           fetch_public: bool = False) -> bytes | None:
    return _render_result_png(
        lambda r: get_bispectrum(
            suite, set_name, r, field, mu_index=mu_index,
            k_range=k_range, rsd_axis=rsd_axis, ell=ell, fetch_public=fetch_public,
        ),
        set_name, realizations,
    )


def render_sfr_history_png(suite, set_name, realizations, z_min, z_max, bins,
                            fetch_public: bool = False, show_symbolic_fit: bool = False,
                            Om: float | None = None, s8: float | None = None,
                            A1: float | None = None, A3: float | None = None) -> bytes | None:
    """Mirrors app.py's own "SFR History" + show_symbolic_fit overlay
    exactly (SFRHSymbolicModel.predict_log_sfr, dashed black line, always
    drawn when the checkbox is on - unlike the linear-Pk overlay, this one
    has no real-data availability check since it's a closed-form equation,
    not a fetched file)."""
    def overlay(ax) -> bool:
        if not show_symbolic_fit:
            return False
        z_curve = np.linspace(z_min, max(z_min + 1e-3, z_max), 200)
        log_sfr = SFRHSymbolicModel.predict_log_sfr(z_curve, Om, s8, A1, A3)
        ax.plot(z_curve, 10 ** log_sfr, "k--", lw=2, label="symbolic-regression fit (real)")
        return True

    return _render_result_png(
        lambda r: get_sfr_history(suite, set_name, r, z_min, z_max, bins, fetch_public=fetch_public),
        set_name, realizations, overlay=overlay,
    )


def get_onep_param_value(suite, param_index, variation, snapnum=N_SNAPSHOTS - 1):
    """Real value of one 1P parameter for one variation, read directly from
    the real FOF_Subfind file's own Header/Parameters attrs (via the same
    cached fetch every other Subfind-based feature uses - no extra
    download). Returns None if this parameter's real value can't be read
    (the two elimination-only entries, sigma_8/n_s - see ONEP_TNG_PARAMS) or
    the fetch fails (e.g. p15's missing n2/n1 variations)."""
    entry = next((p for p in ONEP_TNG_PARAMS if p["index"] == param_index), None)
    if entry is None or entry["attr_key"] is None:
        return None
    realization = onep_realization_id(param_index, variation)
    catalog = _fetch_public_subfind(suite, "1P", realization, snapnum)
    if catalog is None:
        return None
    return catalog["raw_params"].get(entry["attr_key"])


# ---------------------------------------------------------------------------
# Halo/subhalo catalog browser (no equivalent single camels_library function -
# exposes the same real Subfind catalog HMF/SMF already fetch, as a table)
# ---------------------------------------------------------------------------

def get_halo_catalog(suite, set_name, realization, snapnum=N_SNAPSHOTS - 1,
                      fetch_public: bool = False) -> Catalog | None:
    """Real subhalo catalog as a browsable table. No synthetic version -
    a fabricated catalog isn't useful the way a fabricated curve is, so this
    returns None outright when real data isn't available (fetch_public off,
    or an unsupported suite), rather than inventing fake rows. `snapnum` uses
    the same 0-33 schedule as Pk/SFRH - the full range is real, not just z=0.
    Note: SubfindID here only matches SubLink's tree at the *same* snapnum -
    get_merger_history takes a matching root_snapnum for this reason."""
    if not fetch_public:
        return None
    catalog = _fetch_public_subfind(suite, set_name, realization, snapnum)
    if catalog is None:
        return None

    frame = pd.DataFrame({
        # Positional index into the raw (unfiltered) Subfind subhalo arrays -
        # this is also exactly the "SubfindID" SubLink's merger trees index
        # by (cross-checked directly, see get_merger_history), so keeping it
        # as a real column (not just the DataFrame's row position) lets a
        # user pick a row here and trace its history there.
        "SubfindID": np.arange(len(catalog["subhalo_stellar_mass"])),
        "Stellar Mass [Msun/h]": catalog["subhalo_stellar_mass"],
        "Gas Mass [Msun/h]": catalog["subhalo_gas_mass"],
        "DM Mass [Msun/h]": catalog["subhalo_dm_mass"],
        "BH Mass [Msun/h]": catalog["subhalo_bh_mass"],
        "Half-mass Radius [Mpc/h]": catalog["subhalo_halfmass_rad"],
        "SFR [Msun/yr]": catalog["subhalo_sfr"],
        "Vmax [km/s]": catalog["subhalo_vmax"],
        "Stellar Metallicity": catalog["subhalo_metallicity"],
    })
    # Starless subhalos (dark, DM-only) are real and correctly included in
    # stellar_mass_function()'s histogram upstream, but aren't useful rows in
    # a browsable table - this filter is a display choice, not a science one.
    mask = frame["Stellar Mass [Msun/h]"] > 0
    frame = frame[mask.to_numpy()].reset_index(drop=True)

    raw_extra = catalog.get("subhalo_raw_extra", {})
    raw_extra_frame = pd.DataFrame({k: v[mask.to_numpy()] for k, v in raw_extra.items()})
    raw_frame = pd.concat([frame, raw_extra_frame], axis=1)

    return Catalog(
        frame=frame, box_size=catalog["box_size"], redshift=catalog["redshift"], raw_frame=raw_frame,
        note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
              f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
              f"catalog #{SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]}, {len(frame)} subhalos with stars)"),
    )


# ---------------------------------------------------------------------------
# CAMELS-SAM catalog browser (no equivalent camels_library function - a
# completely separate dataset/format from the hydro-suite Subfind catalogs)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=16)
def _fetch_sam_galprop_tail(set_name, realization, octant=SAM_DEFAULT_OCTANT, max_bytes=4_000_000):
    """Fetch the tail of one octant's real galprop_0-99.dat file. The real
    file is ordered by redshift (high-z first), so its last bytes are z=0 -
    confirmed directly against the real file, not assumed. Only one of 8
    spatial octants (a real 1/8-volume sample) and a byte-range sample of a
    500MB-1.5GB file, not the complete realization. Returns a pandas
    DataFrame filtered to the final (z~0) snapshot, or None."""
    if set_name not in PUBLIC_SAM_SETS:
        return None
    url = f"{PUBLIC_DATA_URL}/SCSAM/{set_name}/{set_name}_{realization}/sc-sam/{octant}/galprop_0-99.dat"
    try:
        req = urllib.request.Request(url, headers={"Range": f"bytes=-{max_bytes}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    # first line is likely a partial row (we started mid-file via a tail
    # range) - drop it; also drop any stray header/comment lines
    lines = raw.splitlines()[1:]
    n_cols = len(GALPROP_COLUMNS)
    rows = [line.split() for line in lines if line.strip() and not line.startswith("#")]
    rows = [r for r in rows if len(r) == n_cols]
    if not rows:
        return None

    df = pd.DataFrame(np.array(rows, dtype=np.float64), columns=GALPROP_COLUMNS)
    z_min = df["redshift"].min()
    return df[np.isclose(df["redshift"], z_min, atol=1e-3)].reset_index(drop=True)


def get_sam_catalog(set_name, realization, fetch_public: bool = False) -> Catalog | None:
    """Real CAMELS-SAM galaxy catalog as a browsable table. No synthetic
    version, same reasoning as get_halo_catalog() - a fabricated SAM catalog
    isn't a useful stand-in. Returns None if unavailable."""
    if not fetch_public:
        return None
    df = _fetch_sam_galprop_tail(set_name, realization)
    if df is None or len(df) == 0:
        return None

    frame = pd.DataFrame({
        "Stellar Mass [Msun]": df["mstar"] * 1e9,
        "Halo Mass [Msun]": df["mhalo"] * 1e9,
        "BH Mass [Msun]": df["mBH"] * 1e9,
        "Cold Gas Mass [Msun]": df["mcold"] * 1e9,
        "SFR [Msun/yr]": df["sfr"],
        "x [Mpc]": df["x_position"], "y [Mpc]": df["y_position"], "z [Mpc]": df["z_position"],
    })
    mask = frame["Stellar Mass [Msun]"] > 0
    frame = frame[mask.to_numpy()].reset_index(drop=True)
    if len(frame) == 0:
        return None

    # raw_frame: curated columns plus every other real GALPROP column (41
    # total, e.g. mass_outflow_rate, tmerge, r_disk, sfrave1gyr) - the escape
    # hatch, same row order as frame.
    already = {"mstar", "mhalo", "mBH", "mcold", "sfr", "x_position", "y_position", "z_position"}
    raw_extra = df[mask.to_numpy()][[c for c in GALPROP_COLUMNS if c not in already]].reset_index(drop=True)
    raw_frame = pd.concat([frame, raw_extra], axis=1)

    return Catalog(
        frame=frame, box_size=CAMELS_SAM_BOX_SIZE, redshift=float(df["redshift"].iloc[0]), raw_frame=raw_frame,
        note=(f"z ~ {df['redshift'].iloc[0]:.2f} - public CAMELS data release "
              f"(SCSAM/{set_name}/{set_name}_{realization}/sc-sam/{SAM_DEFAULT_OCTANT}, "
              f"{len(frame)} galaxies with stars - one of 8 spatial octants, tail sample of "
              f"the full merger-tree catalog, not the complete realization)"),
    )


@lru_cache(maxsize=64)
def _fetch_blackhole_mergers_task(suite, set_name, realization, task):
    """Real per-MPI-task black hole merger log (a few KB) - see
    PUBLIC_BLACKHOLE_MERGERS_SUITES's own comment for the real column
    convention/its evidence. Returns a list of (scale_factor, id1, mass1,
    id2, mass2) tuples, or None if this task file doesn't exist (e.g. a
    task that never logged a merger has no file at all - confirmed real,
    not every one of the 48 is guaranteed present)."""
    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"blackhole_mergers/blackhole_mergers_{task}.txt")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    rows = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) != 6:
            continue
        try:
            _this_task, a, id1, mass1, id2, mass2 = parts
            rows.append((float(a), int(id1), float(mass1), int(id2), float(mass2)))
        except ValueError:
            continue
    return rows or None


def get_blackhole_mergers(suite, set_name, realization, fetch_public: bool = False) -> Catalog | None:
    """Real black hole merger event log for one realization - see
    PUBLIC_BLACKHOLE_MERGERS_SUITES's own comment for real suite coverage
    and the (undocumented, inferred-from-GIZMO's-own-convention) column
    meaning. No synthetic version - a fabricated merger event log isn't a
    useful stand-in the way a power-law curve is. Fetches all 48 real
    per-task files (cheap, unlike blackhole_details) and concatenates -
    real, not a sample."""
    if not fetch_public or suite not in PUBLIC_BLACKHOLE_MERGERS_SUITES:
        return None

    all_rows = []
    for task in range(N_BLACKHOLE_MERGER_TASKS):
        task_rows = _fetch_blackhole_mergers_task(suite, set_name, realization, task)
        if task_rows:
            all_rows.extend(task_rows)
    if not all_rows:
        return None

    scale, id1, mass1, id2, mass2 = zip(*all_rows)
    frame = pd.DataFrame({
        "Redshift": [1.0 / a - 1.0 for a in scale],
        "Swallower BH ID": id1,
        "Swallower BH Mass [Msun/h]": [m * 1e10 for m in mass1],
        "Swallowed BH ID": id2,
        "Swallowed BH Mass [Msun/h]": [m * 1e10 for m in mass2],
    })
    # Real artifact confirmed directly (not assumed): a small number of
    # mergers are logged identically by two tasks (likely a domain-boundary
    # ghost copy of the interacting BHs) - exact-duplicate rows are the same
    # real event recorded twice, not two distinct mergers.
    frame = frame.drop_duplicates().sort_values("Redshift", ascending=False).reset_index(drop=True)

    return Catalog(
        frame=frame, box_size=25.0, redshift=float(frame["Redshift"].min()), raw_frame=None,
        note=(f"{len(frame)} real merger events, z={frame['Redshift'].max():.2f} to "
              f"{frame['Redshift'].min():.2f} - public CAMELS data release "
              f"(Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/blackhole_mergers/, "
              f"{N_BLACKHOLE_MERGER_TASKS} per-task files concatenated). Column meaning is not "
              f"documented by CAMELS itself - inferred from GIZMO's own known black-hole-merger-"
              f"log convention and cross-checked against this file's own task-number column)."),
    )


# ---------------------------------------------------------------------------
# Galaxy scaling relations  (mirrors camels_library.properties_vs_SM)
# ---------------------------------------------------------------------------

def _mean_per_bin(values, weights, bins_SM, counts):
    """np.histogram-weighted mean per bin, matching properties_vs_SM()'s
    "sum then divide only where count != 0" pattern - bins with no galaxies
    stay 0 rather than NaN, same as upstream."""
    total = np.histogram(values, bins_SM, weights=weights)[0]
    populated = counts != 0
    total[populated] /= counts[populated]
    return total


def get_scaling_relations(suite, set_name, realization, SMmin, SMmax, bins, snapnum=N_SNAPSHOTS - 1,
                           fetch_public: bool = False) -> ScalingRelations | None:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization, snapnum)
        if catalog is not None:
            SM = catalog["subhalo_stellar_mass"]
            bins_SM = np.logspace(np.log10(SMmin), np.log10(SMmax), bins + 1)
            mean_SM = 0.5 * (bins_SM[1:] + bins_SM[:-1])
            counts = np.histogram(SM, bins_SM)[0]

            Vmax = catalog["subhalo_vmax"]
            finite_vmax = np.isfinite(Vmax)  # upstream also drops inf Vmax entries

            return ScalingRelations(
                stellar_mass=mean_SM,
                radius=_mean_per_bin(SM, catalog["subhalo_stellar_halfmass_rad"], bins_SM, counts),
                bh_mass=_mean_per_bin(SM, catalog["subhalo_bh_mass"], bins_SM, counts),
                sfr=_mean_per_bin(SM, catalog["subhalo_sfr"], bins_SM, counts),
                vmax=_mean_per_bin(SM[finite_vmax], Vmax[finite_vmax], bins_SM,
                                    np.histogram(SM[finite_vmax], bins_SM)[0]),
                metallicity=_mean_per_bin(SM, catalog["subhalo_metallicity"], bins_SM, counts),
                counts=counts,
                source="real",
                note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
                      f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"catalog #{SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]})"),
            )

    return None


def render_scaling_relations_png(suite, set_name, realization, SMmin, SMmax, bins,
                                  snapnum=N_SNAPSHOTS - 1, fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "Galaxy Scaling Relations" block exactly - the
    2x2 panel (radius/BH mass/SFR/Vmax vs. stellar mass) plus a 5th, real-
    data-only mass-metallicity panel - but combined into one figure via
    GridSpec (app.py renders these as two separate st.pyplot() calls; this
    app's PlotTile only hosts one image per tile, so the metallicity row is
    appended below the 2x2 grid instead of shown as a second image). Returns
    None (no synthetic fallback) when get_scaling_relations itself does."""
    result = get_scaling_relations(suite, set_name, realization, SMmin, SMmax, bins,
                                    snapnum=snapnum, fetch_public=fetch_public)
    if result is None:
        return None
    populated = result.counts > 0
    panels = [
        (result.radius, "Stellar half-mass radius [kpc/h]"),
        (result.bh_mass, "BH mass [Msun/h]"),
        (result.sfr, "SFR [Msun/yr]"),
        (result.vmax, "Vmax [km/s]"),
    ]

    has_metallicity = result.metallicity is not None
    # Real fix (2026-08-06, code-quality audit): Figure/FigureCanvasAgg
    # (_finish_png), whole render body locked - see _PNG_RENDER_LOCK's own
    # docs for why the lock must wrap the entire body, not just the tail.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(9, 7 + (2.8 if has_metallicity else 0)), dpi=150, facecolor="white")
        gs = fig.add_gridspec(3 if has_metallicity else 2, 2)

        for i, (y, ylabel) in enumerate(panels):
            ax = fig.add_subplot(gs[i // 2, i % 2])
            y_plot = np.clip(y[populated], 1e-6, None)  # some bins can average to SFR=0
            ax.plot(result.stellar_mass[populated], y_plot, "o-", lw=1.5, ms=4)
            ax.set_xscale("log")
            ax.set_yscale("log")
            ax.set_xlabel("Stellar mass [Msun/h]")
            ax.set_ylabel(ylabel)
            ax.grid(alpha=0.3, which="both")

        if has_metallicity:
            ax2 = fig.add_subplot(gs[2, :])
            ax2.plot(result.stellar_mass[populated], result.metallicity[populated], "o-",
                      lw=1.5, ms=4, color="tab:green")
            ax2.set_xscale("log")
            ax2.set_xlabel("Stellar mass [Msun/h]")
            ax2.set_ylabel("Mean stellar metallicity (mass fraction)")
            ax2.grid(alpha=0.3, which="both")

        fig.tight_layout()
        return _finish_png(fig)


# ---------------------------------------------------------------------------
# SFR history  (mirrors camels_library.star_formation_rate_history)
# ---------------------------------------------------------------------------

# Real per-timestep SFR log, confirmed real (2026-08-02) at
# Sims/{suite}/L25n256/{set}/{set}_{realization}/extra_files/sfr.txt - the
# native Arepo/Gadget-mufasa "sfr.txt" diagnostic file, NOT documented
# anywhere in docs/source/*.rst (only referenced indirectly via the
# undocumented star_formation_rate_history() function in camels_library.py,
# which expects exactly this column layout). Real for IllustrisTNG/SIMBA/
# Astrid; confirmed absent for Swift-EAGLE (different native output, same
# reason its raw snapshots are excluded elsewhere in this app).
PUBLIC_SFRH_SUITES = {"IllustrisTNG", "SIMBA", "Astrid"}


@lru_cache(maxsize=32)
def _fetch_public_sfrh(suite, set_name, realization):
    """Real cosmic SFR history for one realization, read directly from the
    simulation's own sfr.txt log (one row per internal timestep - 264k+ rows
    over the IllustrisTNG LH_1 box, from the ICs' z=127 down to z=0). Column
    layout (scale factor a, ..., total box SFR [Msun/yr], ...) matches
    camels_library.star_formation_rate_history()'s own column selection
    (data[:,2]/(BoxSize/h)**3) - reused here rather than guessed. Returns
    (z_ascending, sfrd_ascending) or None. Note: the raw file's rows are in
    ascending scale-factor order, i.e. DESCENDING redshift - reversed here
    before returning, since np.interp requires ascending x - camels_library's
    own version interpolates without reversing first, which would silently
    misinterpolate; not replicated here (see the commented-out reversed line
    still sitting unused in that source)."""
    if suite not in PUBLIC_SFRH_SUITES:
        return None

    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"extra_files/sfr.txt")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    try:
        data = np.loadtxt(raw.splitlines())
    except ValueError:
        return None
    if data.ndim != 2 or data.shape[1] < 3:
        return None

    h = 0.6711
    box_size = 25.0  # Mpc/h, same L25n256 box used everywhere else in this app
    a = data[:, 0]
    z = 1.0 / a - 1.0
    sfrd = data[:, 2] / (box_size / h) ** 3  # Msun/yr/(Mpc/h)^3

    order = np.argsort(z)  # ascending z (raw file is ascending a, i.e. descending z)
    return z[order], sfrd[order]


def get_sfr_history(suite, set_name, realization, z_min, z_max, bins,
                     sfrh_path: str | None = None, fetch_public: bool = False) -> Result | None:
    if fetch_public:
        fetched = _fetch_public_sfrh(suite, set_name, realization)
        if fetched is not None:
            z_raw, sfrd_raw = fetched
            bins_z = np.linspace(z_min, z_max, bins)
            sfrd = np.interp(bins_z, z_raw, sfrd_raw)
            return Result(
                x=bins_z, y=np.clip(sfrd, 1e-12, None),
                x_label="Redshift", y_label="SFRD [Msun/yr/Mpc^3]",
                log_x=False, source="real",
                note=(f"public CAMELS data release (Sims/{suite}/L25n256/{set_name}/"
                      f"{set_name}_{realization}/extra_files/sfr.txt, {len(z_raw)} real "
                      f"timesteps from z={z_raw.max():.1f} to z={z_raw.min():.2f}, "
                      f"interpolated onto the chosen bin grid)"),
            )

    if sfrh_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up real sfrh file read here")
        except Exception:
            pass

    return None


class SFRHSymbolicModel:
    """Closed-form fit for log10(SFR) discovered via symbolic regression on
    the IllustrisTNG LH set (upstream: scripts/symbolic_regression/test_formula.py,
    the "errors9.txt" formula). Unlike every other function in this module,
    this is real - not synthetic - CAMELS output: an actual equation the
    upstream repo produced, not a stand-in for one.

    A2 (wind speed) and A4 (AGN kinetic feedback speed) do not appear in the
    formula - the search dropped them, only Om, s8, A1 and A3 are used.
    """

    # parameter ranges, from docs/source/parameters.rst (IllustrisTNG LH/1P sets)
    Z_RANGE  = (0.0, 7.0)
    OM_RANGE = (0.1, 0.5)    # Omega_m
    S8_RANGE = (0.6, 1.0)    # sigma_8
    A1_RANGE = (0.25, 4.0)   # A_SN1  - energy per unit SFR of galactic winds
    A3_RANGE = (0.25, 4.0)   # A_AGN1 - energy per unit BH accretion rate

    FIDUCIAL = {"Om": 0.3, "s8": 0.8, "A1": 1.0, "A3": 1.0}

    @staticmethod
    def predict_log_sfr(z, Om, s8, A1, A3):
        """log10(SFR) at redshift(s) z, for the given cosmology/feedback params."""
        return (2.317 * np.log(1 + z) + 0.696 / ((1 + z) * A3)
                 - 0.0389 * (1 + z) / Om - 0.379 * (1 + z) / s8
                 - 1.333 - A1 ** 0.391)


# ---------------------------------------------------------------------------
# 3D density field  (stand-in for a real gridded snapshot / CMD 3D grid;
# no equivalent camels_library function exists yet — see docs' empty
# "3D fields slices" stub)
# ---------------------------------------------------------------------------

def _downsample_grid(field, target):
    """Block-average a cubic grid down to a smaller cubic size (must evenly
    divide the source size) - used so real data (only published at
    128/256/512) can still be shown at whatever resolution the UI's
    performance slider picked."""
    n = field.shape[0]
    if target == n:
        return field
    factor = n // target
    trimmed = field[:factor * target, :factor * target, :factor * target]
    return trimmed.reshape(target, factor, target, factor, target, factor).mean(axis=(1, 3, 5))


CMD_MASS_TYPE_FIELDS = {"Mtot", "Mgas", "Mcdm", "Mstar"}  # meaningful to show as overdensity


def get_density_field_3d(suite, set_name, realization, snapnum, grid, field=DEFAULT_CMD_FIELD,
                          snapshot_path: str | None = None, fetch_public: bool = False) -> Field3D | None:
    z = _snapshot_to_redshift(snapnum)

    if fetch_public:
        cmd_fetch = _fetch_public_cmd_grid(suite, set_name, realization, 128, z, field=field)
        if cmd_fetch is not None:
            raw_grid, actual_z = cmd_fetch
            density = _downsample_grid(raw_grid, grid) if grid <= 128 else raw_grid
            if field in CMD_MASS_TYPE_FIELDS:
                density = density / density.mean()  # mass field -> overdensity rho/mean(rho)
                units = "overdensity ρ/ρ̄"
            else:
                units = f"{CMD_FIELDS[field]} (CMD units)"
            return Field3D(
                density=density, box_size=25.0, source="real",
                note=(f"z = {actual_z:.2f} (nearest published redshift), {units} - CMD public data "
                      f"release (3D_grids/{suite}/{field}_{set_name}_128, one realization via HTTP "
                      f"Range request, downsampled {128}->{min(grid, 128)})"),
            )

        snap_fetch = _fetch_and_grid_snapshot(suite, set_name, realization, grid, field=field,
                                               snapnum=snapnum)
        if snap_fetch is not None:
            density, box_size, actual_z, n_used = snap_fetch
            return Field3D(
                density=density, box_size=box_size, source="real",
                note=(f"z = {actual_z:.2f}, overdensity ρ/ρ̄ ({CMD_FIELDS[field]}) - real particles "
                      f"from a public snapshot (Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"{n_used:,} particles gridded with Pylians' MAS_library)"),
            )

    if snapshot_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up user-supplied local snapshot gridding here")
        except Exception:
            pass  # fall through - no real data available

    return None


# ---------------------------------------------------------------------------
# 3D particle cloud (no equivalent camels_library function - a raw scatter
# view of real DM particle positions, distinct from the gridded density field)
# ---------------------------------------------------------------------------

def get_particle_cloud(suite, set_name, realization, max_particles=50_000,
                        snapnum=N_SNAPSHOTS - 1, fetch_public: bool = False) -> ParticleCloud | None:
    """Real DM particle positions as a 3D point cloud. Reuses the same
    lazy-fetch helper the density-field gridder uses (cached, so viewing
    both for the same realization doesn't re-fetch). `snapnum` previously
    wasn't accepted at all - this always fetched snapshot 90 (z=0)
    regardless of the sidebar's Snapshot slider, a real bug (confirmed by
    the user, fixed 2026-08-02). Meant for pydeck's GPU-instanced
    PointCloudLayer, which handles far more points smoothly than Plotly's
    scatter3d. Returns None (no synthetic fallback) when no real fetch
    succeeds."""
    if fetch_public:
        fetched = _fetch_snapshot_positions(suite, set_name, realization, part_type=1,
                                             max_particles=max_particles, snapnum=snapnum)
        if fetched is not None:
            pos, box_size, redshift = fetched
            return ParticleCloud(
                positions=pos, box_size=box_size, source="real",
                note=(f"z = {redshift:.2f} - real DM particles from a public snapshot "
                      f"(Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"{pos.shape[0]:,} particles shown via stride subsampling)"),
            )

    return None


# ---------------------------------------------------------------------------
# VIDE void catalog  (no equivalent camels_library function - built from
# scratch, no existing reader for VIDE's output format anywhere in this repo)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=32)
def _fetch_public_vide_catalog(suite, set_name, realization):
    """Real void catalog from VIDE (a watershed void finder), the
    `centers_central_*.out` file - position, radius, density contrast per
    void. Only IllustrisTNG/LH/z=0.00 is populated in the public release.
    Returns a dict of arrays, or None."""
    if suite not in PUBLIC_VIDE_SUITES or set_name != "LH":
        return None
    prefix = VIDE_SUITE_PREFIX[suite]
    tag = f"{prefix}_LH_{realization}_ss1.0"
    url = (f"{PUBLIC_DATA_URL}/VIDE_Voids/{suite}/{tag}/sample_{tag}_z0.00_d00/"
           f"centers_central_{tag}_z0.00_d00.out")
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            raw = resp.read().decode()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    lines = [line for line in raw.strip().splitlines() if not line.startswith("#")]
    if not lines:
        return None
    # columns: x,y,z (Mpc/h), vol_norm, radius (Mpc/h), redshift, vol (Mpc/h^3),
    # void_id, density_contrast, num_part, parent_id, tree_level, n_children, central_density
    data = np.atleast_2d(np.loadtxt(lines))
    extra = pd.DataFrame({
        "void_id": data[:, 7].astype(int),
        "vol [Mpc/h^3]": data[:, 6],
        "vol_norm": data[:, 3],
        "num_part": data[:, 9].astype(int),
        "central_density": data[:, 13],
        "parent_id": data[:, 10].astype(int),
        "tree_level": data[:, 11].astype(int),
        "n_children": data[:, 12].astype(int),
    })
    return {
        "positions": data[:, 0:3],
        "radius": data[:, 4],
        "density_contrast": data[:, 8],
        "extra": extra,
    }


def get_void_catalog(suite, set_name, realization, fetch_public: bool = False) -> VoidCatalog | None:
    """Real void catalog overlay for the 3D Density Field view. Returns None
    (no synthetic fallback) when unavailable - the frontend treats this as
    "no voids to overlay," not a tile-level error, since the overlay is an
    optional checkbox on top of the (separately real-data-only) density
    field."""
    if fetch_public:
        real = _fetch_public_vide_catalog(suite, set_name, realization)
        if real is not None:
            return VoidCatalog(
                positions=real["positions"], radius=real["radius"],
                density_contrast=real["density_contrast"], box_size=25.0, extra=real["extra"],
                source="real",
                note=(f"z = 0.00 (only redshift VIDE_Voids publishes) - public CAMELS data release "
                      f"(VIDE_Voids/{suite}/{VIDE_SUITE_PREFIX[suite]}_LH_{realization}_ss1.0, "
                      f"{real['radius'].shape[0]} voids, VIDE watershed void finder, LH set only)"),
            )

    return None


# ---------------------------------------------------------------------------
# 2D field map  (real: CMD's public 2D maps - the single most common CAMELS
# ML workflow in practice, per community usage research)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=32)
def _fetch_public_cmd_map(suite, set_name, realization, field=DEFAULT_CMD_FIELD):
    """Real 2D field map (256x256) from CMD's public 2D maps. Only z=0.00
    is published for this data source (unlike the 3D grids' 5 redshifts).
    Returns the map array, or None if unavailable."""
    if not CMD_2D_MAPS_URL or suite not in PUBLIC_CMD_MAP_SUITES or field not in CMD_FIELDS:
        return None
    folder = CMD_MAP_SUITE_FOLDER[suite]
    url = f"{CMD_2D_MAPS_URL}/{folder}/Maps_{field}_{folder}_{set_name}_z=0.00.npy"
    return _fetch_npy_stack_slice(url, realization)


def get_field_map_2d(suite, set_name, realization, field=DEFAULT_CMD_FIELD,
                      fetch_public: bool = False) -> Map2D | None:
    if fetch_public:
        real_map = _fetch_public_cmd_map(suite, set_name, realization, field)
        if real_map is not None:
            if field in CMD_MASS_TYPE_FIELDS:
                real_map = real_map / real_map.mean()
                units = "overdensity ρ/ρ̄"
            else:
                units = f"{CMD_FIELDS[field]} (CMD units)"
            return Map2D(
                values=real_map, box_size=25.0, source="real",
                note=(f"z = 0.00 (only redshift CMD publishes for 2D maps), {units} - "
                      f"CMD public data release (2D_maps/{CMD_MAP_SUITE_FOLDER[suite]}/"
                      f"{field}_{set_name}, one realization via HTTP Range request)"),
            )

    return None


def render_field_map_2d_png(suite, set_name, realization, field=DEFAULT_CMD_FIELD,
                             fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "2D Field Map" block exactly: a log-normed
    imshow heatmap with a colorbar. Returns None (no synthetic fallback)
    when get_field_map_2d itself does.

    Real fix (2026-08-06, ticket #12 - grouped 2D Field Map view, later
    generalized app-wide via `_finish_png` - see its own docs): the
    grouped view fires several of these requests concurrently (one per
    mosaic cell) - confirmed directly this used to fail under that load
    (9 requests fired one at a time all returned 200; fired together, ~8
    of 9 came back 500). Fixed by building the Figure via matplotlib's own
    Figure/FigureCanvasAgg API instead of plt.subplots()/plt.close(), and
    serializing the actual render step via `_PNG_RENDER_LOCK`."""
    result = get_field_map_2d(suite, set_name, realization, field=field, fetch_public=fetch_public)
    if result is None:
        return None

    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(7, 6), dpi=150, facecolor="white")
        ax = fig.add_subplot(111)
        im = ax.imshow(
            result.values.T, origin="lower", cmap="inferno",
            norm=LogNorm(vmin=max(result.values.min(), 1e-6), vmax=result.values.max()),
            extent=[0, result.box_size, 0, result.box_size],
        )
        ax.set_xlabel("x [Mpc/h]")
        ax.set_ylabel("y [Mpc/h]")
        cbar_label = "overdensity ρ/ρ̄" if field in CMD_MASS_TYPE_FIELDS else field
        fig.colorbar(im, ax=ax, label=cbar_label)
        fig.tight_layout()
        return _finish_png(fig)


@lru_cache(maxsize=16)
def _fetch_xray_profiles(suite, set_name, realization):
    """Real per-halo X-ray luminosity profiles from the single shared reduced
    file (fsspec lazy HTTP reads - the 457MB file is never downloaded whole,
    same trick as the raw-snapshot readers). Returns an XrayProfiles or None
    if this suite/set/realization has no entry (e.g. SIMBA's few missing LH
    realizations)."""
    if suite not in PUBLIC_XRAY_SUITES:
        return None

    key = f"{set_name}_{realization}"
    try:
        with fsspec.open(PUBLIC_XRAY_URL, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                if suite not in hf or key not in hf[suite]:
                    return None
                snap_grp = hf[suite][key].get(XRAY_SNAP_KEY)
                if snap_grp is None:
                    return None
                r_edges = hf["Rbins"][:]
                lums, masses = [], []
                for halo_name in sorted(snap_grp.keys()):
                    sa = snap_grp[halo_name].get("SIMPUTAnalysis")
                    if sa is None or "L_0.5_2.0keV_Dens" not in sa:
                        continue
                    lums.append(sa["L_0.5_2.0keV_Dens"][:])
                    masses.append(float(snap_grp[halo_name].attrs["lM200c"]))
    except Exception:
        logger.exception("_fetch_xray_profiles failed for suite=%s set_name=%s realization=%s", suite, set_name, realization)
        return None

    if not lums:
        return None

    r_centers = np.sqrt(r_edges[:-1] * r_edges[1:])  # geometric-mean bin centers, kpc/h
    return XrayProfiles(
        r_centers=r_centers, luminosities=np.array(lums), log_mass=np.array(masses),
        note=(f"z = {SNAPSHOT_REDSHIFTS[XRAY_SNAPNUM]:.2f} (only {XRAY_SNAP_KEY} is published "
              f"for this product) - public CAMELS data release (X-rays/CAMELS.Xray.hdf5, "
              f"{suite}/{key}, {len(lums)} halos, 0.5-2.0 keV band, reduced SIMPUTAnalysis profile)"),
    )


def get_xray_profiles(suite, set_name, realization, fetch_public: bool = False) -> XrayProfiles | None:
    """Real X-ray halo luminosity profiles as a browsable population view.
    No synthetic version - like the catalog browsers, a fabricated X-ray
    profile isn't useful the way a fabricated curve is, and unlike Pk/HMF/etc.
    there's no cheap physically-motivated illustrative model to fall back on."""
    if not fetch_public:
        return None
    return _fetch_xray_profiles(suite, set_name, realization)


def render_xray_profiles_png(suite, set_name, realization, fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "X-ray Halo Profiles" block exactly: one line
    per halo colored by log10(M200c) (viridis), log-log axes, a colorbar.
    Returns None (not raising) when get_xray_profiles itself returns None -
    real-data only, no synthetic fallback, same as the JSON endpoint's own
    require()-raises-404 behavior (the router is what turns this into an
    HTTP error, not this function)."""
    profiles = get_xray_profiles(suite, set_name, realization, fetch_public=fetch_public)
    if profiles is None:
        return None

    # Real fix (2026-08-06, code-quality audit): Figure/FigureCanvasAgg
    # (_finish_png), whole render body locked - see _PNG_RENDER_LOCK's own
    # docs. plt.Normalize/plt.get_cmap/plt.cm.ScalarMappable below are
    # left outside the concern entirely (still fine to call without the
    # lock in principle) - plain object constructors/a read-only colormap
    # lookup, not part of pyplot's global figure-state - but they're
    # cheap and always immediately followed by figure work, so keeping
    # them inside the same lock scope isn't worth special-casing out.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(8, 5), dpi=150, facecolor="white")
        ax = fig.subplots()
        norm = plt.Normalize(profiles.log_mass.min(), profiles.log_mass.max())
        cmap = plt.get_cmap("viridis")
        for lum, mass in zip(profiles.luminosities, profiles.log_mass):
            ax.plot(profiles.r_centers, lum, color=cmap(norm(mass)), alpha=0.6, lw=1.2)
        ax.set_xscale("log")
        ax.set_yscale("log")
        ax.set_xlabel("r [kpc/h]")
        ax.set_ylabel("L (0.5-2.0 keV) [erg/s]")
        ax.grid(alpha=0.3, which="both")
        sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
        sm.set_array([])
        fig.colorbar(sm, ax=ax, label="log10 M200c [Msun/h]")
        fig.tight_layout()
        return _finish_png(fig)


def _parse_indexed_header(header_line):
    """Parse a '#name0(0) name1(1) ...' style header (the AHF/Rockstar
    convention) into a plain list of column names, stripping each token's
    trailing '(N)' index."""
    tokens = header_line.lstrip("#").split()
    return [re.sub(r"\(\d+\)$", "", tok) for tok in tokens]


@lru_cache(maxsize=32)
def _fetch_ahf_halos(suite, set_name, realization, snapnum=AHF_SNAPNUM):
    """Real AHF halo catalog. The exact filename encodes AHF's own computed
    redshift to 3 decimals (confirmed real - e.g. "z5.994" for snap000, not
    exactly our SNAPSHOT_REDSHIFTS table's 6.00), so it's discovered via a
    real directory listing + regex, never constructed. Small file (1-4MB),
    fetched whole - no need for range requests at this size. AHF's own
    filename numbering already matches SNAPSHOT_REDSHIFTS index-for-index
    (confirmed via the redshift string, e.g. z5.994 for snap000 = z=6.00),
    so `snapnum` is used directly, no remapping needed."""
    if suite not in PUBLIC_AHF_SUITES:
        return None

    dir_url = f"{PUBLIC_DATA_URL}/AHF/{suite}/{set_name}/{set_name}_{realization}/AHF/"
    try:
        req = urllib.request.Request(dir_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            listing_html = resp.read().decode(errors="replace")
        matches = re.findall(rf'snap{snapnum:03d}[^"<>\s]*\.AHF_halos', listing_html)
        if not matches:
            return None
        req = urllib.request.Request(dir_url + matches[0], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    lines = text.splitlines()
    if not lines or not lines[0].startswith("#"):
        return None
    columns = _parse_indexed_header(lines[0])
    rows = [line.split() for line in lines[1:] if line.strip()]
    rows = [r for r in rows if len(r) == len(columns)]
    if not rows:
        return None
    df = pd.DataFrame(rows, columns=columns).apply(pd.to_numeric, errors="coerce")

    # Use the filename's own redshift string, not our SNAPSHOT_REDSHIFTS
    # table (confirmed slightly different - AHF computes its own).
    z_match = re.search(r"\.z([\d.]+)\.AHF_halos", matches[0])
    z_str = z_match.group(1) if z_match else "0"

    frame = pd.DataFrame({
        "Halo Mass [Msun/h]": df["Mvir"],
        "Stellar Mass [Msun/h]": df["M_star"],
        "Gas Mass [Msun/h]": df["M_gas"],
        "Rvir [kpc/h]": df["Rvir"],
        "x [Mpc/h]": df["Xc"] / 1e3, "y [Mpc/h]": df["Yc"] / 1e3, "z [Mpc/h]": df["Zc"] / 1e3,
        "N substructures": df["numSubStruct"],
    })
    mask = df["Mvir"] > 0
    frame = frame[mask.to_numpy()].reset_index(drop=True)
    if len(frame) == 0:
        return None
    # raw_frame: the curated columns plus every other real AHF column (86
    # total) - the escape hatch, same row order as frame.
    raw_extra = df[mask.to_numpy()].reset_index(drop=True)
    raw_extra = raw_extra[[c for c in raw_extra.columns if c not in
                           ("Mvir", "M_star", "M_gas", "Rvir", "Xc", "Yc", "Zc", "numSubStruct")]]
    raw_frame = pd.concat([frame, raw_extra], axis=1)
    return Catalog(
        frame=frame, box_size=25.0, redshift=float(z_str), raw_frame=raw_frame,
        note=(f"z = {z_str} (AHF's own computed redshift, snapshot {snapnum}) - public "
              f"CAMELS data release (AHF/{suite}/{set_name}_{realization}/AHF/{matches[0]}, "
              f"{len(frame)} halos)"),
    )


@lru_cache(maxsize=32)
def _fetch_rockstar_halos(suite, set_name, realization, snapnum=N_SNAPSHOTS - 1):
    """Real Rockstar halo catalog. For z=0 (snapnum=33), scale factor a=1.0 is
    exact by definition, so the filename could be constructed directly - but
    for any other snapshot each suite computes its own scale factors
    (confirmed real, not assumed: SIMBA's are ~0.0001-0.0003 off from
    IllustrisTNG's at the same schedule position), so the real filename is
    always discovered via a directory listing + closest-redshift match,
    same spirit as AHF's discovery."""
    if suite not in PUBLIC_ROCKSTAR_SUITES:
        return None

    target_z = SNAPSHOT_REDSHIFTS[snapnum]
    dir_url = f"{PUBLIC_DATA_URL}/Rockstar/{suite}/L25n256/{set_name}/{set_name}_{realization}/hlists/"
    try:
        req = urllib.request.Request(dir_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            listing_html = resp.read().decode(errors="replace")
        scale_factors = sorted(set(float(m) for m in
                                    re.findall(r'hlist_([\d.]+)\.list', listing_html)))
        if not scale_factors:
            return None
        best_a = min(scale_factors, key=lambda a: abs((1.0 / a - 1.0) - target_z))
        filename = f"hlist_{best_a:.5f}.list"

        req = urllib.request.Request(dir_url + filename, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    lines = text.splitlines()
    header_lines = [ln for ln in lines if ln.startswith("#")]
    if not header_lines:
        return None
    columns = _parse_indexed_header(header_lines[0])
    rows = [line.split() for line in lines if line.strip() and not line.startswith("#")]
    rows = [r for r in rows if len(r) == len(columns)]
    if not rows:
        return None
    df = pd.DataFrame(rows, columns=columns).apply(pd.to_numeric, errors="coerce")

    frame = pd.DataFrame({
        "id": df["id"],  # real Rockstar halo id at this snapshot - only meaningful here
                         # (like Subfind's SubfindID), kept so a row can be picked and
                         # traced via Consistent Trees at the root snapshot.
        "Halo Mass [Msun/h]": df["Mvir"],
        "Stellar Mass [Msun/h]": df["SM"],
        "Gas Mass [Msun/h]": df["Gas"],
        "BH Mass [Msun/h]": df["BH_Mass"],
        "Vmax [km/s]": df["vmax"],
        "x [Mpc/h]": df["x"], "y [Mpc/h]": df["y"], "z [Mpc/h]": df["z"],
        "Type": df["Type"],  # 0 = central, 1 = satellite (consistent-trees convention)
    })
    mask = df["Mvir"] > 0
    frame = frame[mask.to_numpy()].reset_index(drop=True)
    if len(frame) == 0:
        return None
    # raw_frame: curated columns plus every other real Rockstar column (85
    # total) - the escape hatch, same row order as frame.
    raw_extra = df[mask.to_numpy()].reset_index(drop=True)
    raw_extra = raw_extra[[c for c in raw_extra.columns if c not in
                           ("id", "Mvir", "SM", "Gas", "BH_Mass", "vmax", "x", "y", "z", "Type")]]
    raw_frame = pd.concat([frame, raw_extra], axis=1)
    real_z = 1.0 / best_a - 1.0
    return Catalog(
        frame=frame, box_size=25.0, redshift=real_z, raw_frame=raw_frame,
        note=(f"z = {real_z:.2f} (scale factor a={best_a:.5f}) - public CAMELS data release "
              f"(Rockstar/{suite}/L25n256/{set_name}_{realization}/hlists/{filename}, "
              f"{len(frame)} halos)"),
    )


@lru_cache(maxsize=32)
def _fetch_caesar_halos(suite, set_name, realization, snapnum=N_SNAPSHOTS - 1):
    """Real CAESAR halo catalog. Masses/positions live in a flattened
    dict-of-dicts HDF5 layout (e.g. dataset name "masses.total", not a
    nested group) - confirmed via a real lazy read before assuming the
    schema, not from docs. Uses SUBFIND_GROUPNUM_FOR_SNAPSHOT - confirmed
    real that CAESAR's own caesar_newsnaps_XXX.hdf5 numbering matches
    FOF_Subfind's exactly (same 34 real numbers, same redshifts)."""
    if not HAVE_FSSPEC or suite not in PUBLIC_CAESAR_SUITES:
        return None

    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    url = (f"{PUBLIC_DATA_URL}/Caesar/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"caesar_newsnaps_{groupnum:03d}.hdf5")
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                hd = hf["halo_data"]
                redshift = float(hf["simulation_attributes"].attrs["redshift"])
                box_size = float(hf["simulation_attributes"].attrs["boxsize"]) / 1e3  # kpccm -> Mpc/h
                frame = pd.DataFrame({
                    "Halo Mass [Msun]": hd["dicts/masses.total"][:],
                    "Stellar Mass [Msun]": hd["dicts/masses.stellar"][:],
                    "Gas Mass [Msun]": hd["dicts/masses.gas"][:],
                    "BH Mass [Msun]": hd["dicts/masses.bh"][:],
                    "SFR [Msun/yr]": hd["sfr"][:],
                    "x [Mpc/h]": hd["pos"][:, 0] / 1e3,
                    "y [Mpc/h]": hd["pos"][:, 1] / 1e3,
                    "z [Mpc/h]": hd["pos"][:, 2] / 1e3,
                })

                # raw_frame: every other 1D halo-level quantity CAESAR has
                # (radii.*, metallicities.*, ages.*, local densities, particle
                # counts, etc.) - the escape hatch. Collected dynamically
                # rather than hardcoded, since CAESAR's real "dicts" tree is
                # large and this way nothing new gets missed if it grows.
                n_halos = len(frame)
                already = {"dicts/masses.total", "dicts/masses.stellar", "dicts/masses.gas",
                           "dicts/masses.bh", "sfr", "pos"}
                raw_cols = {}

                def collect(name, obj):
                    if (isinstance(obj, h5py.Dataset) and obj.ndim == 1
                            and obj.shape[0] == n_halos and name not in already):
                        raw_cols[name.replace("/", ".")] = obj[:]
                hd.visititems(collect)
    except Exception:
        logger.exception("_fetch_caesar_halos failed for suite=%s set_name=%s realization=%s", suite, set_name, realization)
        return None

    mask = frame["Halo Mass [Msun]"] > 0
    frame = frame[mask.to_numpy()].reset_index(drop=True)
    if len(frame) == 0:
        return None
    raw_extra = pd.DataFrame({k: v[mask.to_numpy()] for k, v in raw_cols.items()})
    raw_frame = pd.concat([frame, raw_extra], axis=1)
    return Catalog(
        frame=frame, box_size=box_size, redshift=redshift, raw_frame=raw_frame,
        note=(f"z = {redshift:.2f} - public CAMELS data release (Caesar/{suite}/L25n256/"
              f"{set_name}_{realization}/caesar_newsnaps_{groupnum:03d}.hdf5, "
              f"{len(frame)} halos)"),
    )


@lru_cache(maxsize=32)
def _fetch_caesar_galaxies(suite, set_name, realization, snapnum=N_SNAPSHOTS - 1):
    """Real CAESAR galaxy catalog - CAESAR's 6D-FOF galaxy finder result,
    fully precomputed (not the raw fof6d_tags file, which requires
    reconstructing CAESAR's internal particle-filtering/sort pipeline to
    decode - a real dead end investigated 2026-08-02, see fof6d.py on
    GitHub). This reads `galaxy_data` from the SAME caesar_newsnaps file
    already used for halos - same dict-of-dicts schema as halo_data, so this
    reuses that exact parsing pattern. Cross-validated (2026-08-02):
    global_lists/galaxy_glist (per-gas-particle galaxy membership) has max
    index 376, exactly matching galaxy_data's 377 rows for the same file.
    `parent_halo_index` links each galaxy back to a row in the CAESAR halo
    catalog (_fetch_caesar_halos) - same realization/snapshot, same ordering
    convention CAESAR itself uses, not independently re-verified beyond that
    the row counts and general schema are real."""
    if not HAVE_FSSPEC or suite not in PUBLIC_CAESAR_SUITES:
        return None

    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    url = (f"{PUBLIC_DATA_URL}/Caesar/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"caesar_newsnaps_{groupnum:03d}.hdf5")
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                gd = hf["galaxy_data"]
                redshift = float(hf["simulation_attributes"].attrs["redshift"])
                box_size = float(hf["simulation_attributes"].attrs["boxsize"]) / 1e3  # kpccm -> Mpc/h
                frame = pd.DataFrame({
                    "Stellar Mass [Msun]": gd["dicts/masses.stellar"][:],
                    "Gas Mass [Msun]": gd["dicts/masses.gas"][:],
                    "BH Mass [Msun]": gd["dicts/masses.bh"][:],
                    "Total Mass [Msun]": gd["dicts/masses.total"][:],
                    "SFR [Msun/yr]": gd["sfr"][:],
                    "Stellar Half-Mass Radius [kpc/h]": gd["dicts/radii.stellar_half_mass"][:],
                    "x [Mpc/h]": gd["pos"][:, 0] / 1e3,
                    "y [Mpc/h]": gd["pos"][:, 1] / 1e3,
                    "z [Mpc/h]": gd["pos"][:, 2] / 1e3,
                    "Parent Halo Index": gd["parent_halo_index"][:],
                })

                # raw_frame escape hatch: this catalog is unusually rich -
                # real multi-band photometry (~100 filters, attenuated and
                # dust-free), radii/rotation/velocity-dispersion/metallicity
                # dicts, etc. Collected dynamically, same pattern as
                # _fetch_caesar_halos, since hardcoding this many fields
                # would be unwieldy and would silently miss new ones.
                n_gal = len(frame)
                already = {"dicts/masses.stellar", "dicts/masses.gas", "dicts/masses.bh",
                           "dicts/masses.total", "sfr", "dicts/radii.stellar_half_mass",
                           "pos", "parent_halo_index"}
                raw_cols = {}

                def collect(name, obj):
                    if (isinstance(obj, h5py.Dataset) and obj.ndim == 1
                            and obj.shape[0] == n_gal and name not in already):
                        raw_cols[name.replace("/", ".")] = obj[:]
                gd.visititems(collect)
    except Exception:
        logger.exception("_fetch_caesar_galaxies failed for suite=%s set_name=%s realization=%s", suite, set_name, realization)
        return None

    mask = frame["Stellar Mass [Msun]"] > 0
    frame = frame[mask.to_numpy()].reset_index(drop=True)
    if len(frame) == 0:
        return None
    raw_extra = pd.DataFrame({k: v[mask.to_numpy()] for k, v in raw_cols.items()})
    raw_frame = pd.concat([frame, raw_extra], axis=1)
    return Catalog(
        frame=frame, box_size=box_size, redshift=redshift, raw_frame=raw_frame,
        note=(f"z = {redshift:.2f} - public CAMELS data release (Caesar/{suite}/L25n256/"
              f"{set_name}_{realization}/caesar_newsnaps_{groupnum:03d}.hdf5, galaxy_data, "
              f"{len(frame)} galaxies, CAESAR's 6D-FOF galaxy finder, {len(raw_cols)} extra "
              f"real fields incl. ~100-filter photometry, radii, rotation/kinematics)"),
    )


def get_alt_halo_catalog(finder, suite, set_name, realization, snapnum=N_SNAPSHOTS - 1,
                          fetch_public: bool = False) -> Catalog | None:
    """Real halo/galaxy catalog from an alternate finder (AHF/Rockstar/CAESAR/
    CAESAR Galaxies), as a browsable table alongside the Subfind-based
    Catalog Browser. No synthetic version - same reasoning as
    get_halo_catalog(). `snapnum` uses the same 0-33 schedule as Pk/SFRH/the
    Snapshot slider - all finders now support the full range, not just z=0."""
    if not fetch_public:
        return None
    if finder == "AHF":
        return _fetch_ahf_halos(suite, set_name, realization, snapnum)
    if finder == "Rockstar":
        return _fetch_rockstar_halos(suite, set_name, realization, snapnum)
    if finder == "CAESAR":
        return _fetch_caesar_halos(suite, set_name, realization, snapnum)
    if finder == "CAESAR Galaxies":
        return _fetch_caesar_galaxies(suite, set_name, realization, snapnum)
    return None


SUBLINK_VARIANTS = {
    "SubLink": "SubLink",           # standard, DM-particle-linked tree
    "SubLink_gal": "SubLink_gal",   # baryon-particle-linked tree - a distinct,
                                     # galaxy-centric merger history, not just a
                                     # naming variant. Confirmed real (2026-08-02)
                                     # for IllustrisTNG/SIMBA/Astrid with the
                                     # EXACT SAME Tree schema as standard SubLink,
                                     # so it reuses this same fetch/walk code.
}


@lru_cache(maxsize=8)
def _fetch_sublink_tree(suite, set_name, realization, variant="SubLink"):
    """Real SubLink (or SubLink_gal) merger tree for one whole realization (a
    single flat compound-dtype array covering every subhalo at every
    snapshot - no per-halo range request is possible, so this fetches
    ~5-70MB once per realization; cached so repeated subhalo lookups within
    it are free). Returns (tree_array, id_to_row_dict) or None."""
    if suite not in PUBLIC_SUBLINK_SUITES or variant not in SUBLINK_VARIANTS:
        return None

    folder = SUBLINK_VARIANTS[variant]
    url = f"{PUBLIC_DATA_URL}/{folder}/{suite}/{set_name}/{set_name}_{realization}/tree.hdf5"
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                tree = hf["Tree"][:]
    except Exception:
        logger.exception("_fetch_sublink_tree failed for suite=%s set_name=%s realization=%s variant=%s", suite, set_name, realization, variant)
        return None

    id_to_row = {int(sid): i for i, sid in enumerate(tree["SubhaloID"])}
    return tree, id_to_row


def get_merger_history(suite, set_name, realization, subfind_id, root_snapnum=SUBLINK_Z0_SNAPNUM,
                        variant="SubLink", fetch_public: bool = False):
    """Real main-branch mass accretion history for one subhalo, walking
    FirstProgenitorID backward through the SubLink (or SubLink_gal) tree,
    starting from `subfind_id` at `root_snapnum`. No synthetic version - same
    reasoning as get_halo_catalog(). `root_snapnum` MUST match the snapshot
    the caller's SubfindID actually came from (e.g. the Catalog Browser's
    current snapshot) - SubfindID is only meaningful within a single
    snapshot's Subfind catalog, so tracing from the wrong root_snapnum would
    silently look up an unrelated subhalo."""
    if not fetch_public or not HAVE_FSSPEC:
        return None
    fetched = _fetch_sublink_tree(suite, set_name, realization, variant)
    if fetched is None:
        return None
    tree, id_to_row = fetched

    root_mask = (tree["SnapNum"] == root_snapnum) & (tree["SubfindID"] == subfind_id)
    root_rows = np.nonzero(root_mask)[0]
    if len(root_rows) == 0:
        return None

    row = int(root_rows[0])
    snaps, masses, nparts = [], [], []
    seen = set()
    while row is not None and row not in seen:
        seen.add(row)
        snaps.append(int(tree["SnapNum"][row]))
        masses.append(float(tree["Mass"][row]) * 1e10)
        nparts.append(int(tree["NumParticles"][row]))
        fp_id = int(tree["FirstProgenitorID"][row])
        row = id_to_row.get(fp_id) if fp_id != -1 else None

    redshifts = np.array([SNAPSHOT_REDSHIFTS[s] for s in snaps])
    return MergerHistory(
        redshift=redshifts, mass=np.array(masses), subfind_id=subfind_id,
        num_particles=np.array(nparts),
        note=(f"Main-branch mass history for SubfindID {subfind_id} at snapshot "
              f"{root_snapnum} (z={SNAPSHOT_REDSHIFTS[root_snapnum]:.2f}), {len(snaps)} "
              f"snapshots back to z={redshifts.max():.2f} - public CAMELS data release "
              f"({SUBLINK_VARIANTS[variant]}/{suite}/{set_name}_{realization}/tree.hdf5, "
              f"following FirstProgenitorID)"),
    )


# Consistent Trees - Rockstar's own real companion merger-tree product (a
# `trees/` folder sits alongside `hlists/` for every real Rockstar
# realization), distinct from SubLink/SubLink_gal which trace Subfind
# subhalos instead. Same suites as Rockstar itself (both come from the same
# real per-suite Rockstar run).
PUBLIC_CONSISTENT_TREES_SUITES = PUBLIC_ROCKSTAR_SUITES

# Confirmed real, 2026-08-04: locations.dat's "TreeRootID" is exactly the
# real Rockstar halo "id" at the root (last/z=0, a=1.0) timestep - checked
# directly against IllustrisTNG/LH_0's own hlist_1.00000.list, whose first
# two real halo ids (349562, 352985) are the first two TreeRootIDs in
# locations.dat, in the same order. So a halo picked from the Catalog
# Browser's Rockstar table (at the root snapshot) can be looked up directly
# by its own "id" column - no separate ID-translation step needed.


@lru_cache(maxsize=8)
def _fetch_consistent_trees_locations(suite, set_name, realization):
    """Real locations.dat: maps every tree's root halo ID to an exact byte
    offset (and filename) within the real tree_*.dat file(s), so one halo's
    branch can be range-fetched without downloading the whole (~100MB+)
    file. Small file (~KB-hundreds of KB), fetched and parsed whole, then
    reused for every halo looked up in this realization."""
    if suite not in PUBLIC_CONSISTENT_TREES_SUITES:
        return None
    url = (f"{PUBLIC_DATA_URL}/Rockstar/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"trees/locations.dat")
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    rows = []
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) != 4:
            continue
        root_id, _file_id, offset, filename = parts
        rows.append((int(root_id), int(offset), filename))
    return tuple(rows) if rows else None


@lru_cache(maxsize=8)
def _fetch_consistent_trees_header(suite, set_name, realization, filename):
    """Real column header for a tree file - every tree in the same file
    shares one schema, so this is fetched once (a few KB, one Range request)
    and reused for every halo's branch in that file."""
    url = (f"{PUBLIC_DATA_URL}/Rockstar/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"trees/{filename}")
    req = urllib.request.Request(url, headers={"Range": "bytes=0-4000", "User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None
    header_line = next((ln for ln in text.splitlines()
                        if ln.startswith("#") and "Tree_root_ID" in ln), None)
    return _parse_indexed_header(header_line) if header_line else None


def get_consistent_trees_history(suite, set_name, realization, halo_id, fetch_public: bool = False):
    """Real main-branch mass accretion history for one Rockstar halo, walking
    Consistent Trees' desc_id/mmp? relationship backward from `halo_id` at
    the root (z=0) timestep. `halo_id` must be a real "id" value from the
    Catalog Browser's Rockstar table *at the root snapshot* - like SubLink's
    SubfindID, Consistent Trees' ids are only meaningful at the snapshot
    they came from, and the root snapshot is the only one this function
    supports (that's what locations.dat's TreeRootID indexes)."""
    if not fetch_public:
        return None
    locations = _fetch_consistent_trees_locations(suite, set_name, realization)
    if locations is None:
        return None

    matches = [loc for loc in locations if loc[0] == halo_id]
    if not matches:
        return None
    _root_id, offset, filename = matches[0]

    # Exact byte range for just this tree: from its own offset to the next
    # larger offset in the same file (or a generous cap if it's the last one).
    same_file_offsets = sorted(o for (_, o, f) in locations if f == filename)
    later = [o for o in same_file_offsets if o > offset]
    end = later[0] if later else offset + 20_000_000

    columns = _fetch_consistent_trees_header(suite, set_name, realization, filename)
    if columns is None:
        return None

    url = f"{PUBLIC_DATA_URL}/Rockstar/{suite}/L25n256/{set_name}/{set_name}_{realization}/trees/{filename}"
    req = urllib.request.Request(
        url, headers={"Range": f"bytes={offset}-{end - 1}", "User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    rows = [line.split() for line in text.splitlines() if line.strip() and not line.startswith("#")]
    rows = [r for r in rows if len(r) == len(columns)]
    if not rows:
        return None
    df = pd.DataFrame(rows, columns=columns).apply(pd.to_numeric, errors="coerce")

    id_to_row = {int(v): i for i, v in enumerate(df["id"])}
    row = id_to_row.get(halo_id)
    if row is None:
        return None

    scales, masses, nparts = [], [], []
    seen = set()
    current_id = halo_id
    while row is not None and row not in seen:
        seen.add(row)
        scales.append(float(df["scale"].iloc[row]))
        masses.append(float(df["Mvir"].iloc[row]))
        nparts.append(int(df["num_prog"].iloc[row]))  # progenitor count as a resolution/activity proxy
        # Main progenitor: the row whose desc_id is this one and mmp?==1 -
        # Consistent Trees' own convention for "most massive progenitor".
        candidates = df.index[(df["desc_id"] == current_id) & (df["mmp?"] == 1)]
        if len(candidates) == 0:
            row = None
        else:
            row = int(candidates[0])
            current_id = int(df["id"].iloc[row])

    redshifts = np.array([1.0 / s - 1.0 for s in scales])
    return MergerHistory(
        redshift=redshifts, mass=np.array(masses), subfind_id=halo_id,
        num_particles=np.array(nparts),
        note=(f"Main-branch mass history for Rockstar halo id {halo_id} at the root "
              f"snapshot, {len(scales)} snapshots back to z={redshifts.max():.2f} - public "
              f"CAMELS data release (Rockstar/{suite}/L25n256/{set_name}_{realization}/"
              f"trees/{filename}, following desc_id/mmp?)"),
    )


@lru_cache(maxsize=16)
def _fetch_halo_profiles_file(suite, set_name, realization, snapnum):
    """Real precomputed SO/CGM radial profiles for one snapshot (illstack_
    CAMELS). Small file (<1MB), fetched whole. Returns the raw arrays
    (still in the file's native code units - see get_halo_profiles for the
    documented conversion) or None. Also dynamically collects every other
    real per-halo 1-D field this file has (confirmed via a direct h5py
    inspection: ~44 `Group*`/`ID` fields beyond M200c/R200c - SFR, BH mass,
    alternate mass/radius definitions, gas/star element abundances,
    substructure count, position/velocity, etc.) rather than hardcoding a
    column list, so it stays correct if the file ever adds fields."""
    if not HAVE_FSSPEC or suite not in PUBLIC_PROFILES_SUITES or set_name not in PUBLIC_PROFILES_SETS:
        return None

    url = (f"{PUBLIC_DATA_URL}/Profiles/{suite}/{set_name}/{set_name}_{realization}/"
           f"{suite}_{set_name}_{realization}_{snapnum:03d}.hdf5")
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                r_raw = hf["r"][:]
                profiles = hf["Profiles"][:]           # (4, n_halos, 25)
                n_counts = hf["n"][:]                  # (4, n_halos, 25) - particles per bin
                m200c_raw = hf["Group_M_Crit200"][:]   # 1e10 Msun/h
                n_halos_total = m200c_raw.shape[0]
                metadata_raw = {
                    key: hf[key][:] for key in hf.keys()
                    if isinstance(hf[key], h5py.Dataset) and hf[key].ndim == 1
                    and hf[key].shape[0] == n_halos_total
                }
    except Exception:
        logger.exception("_fetch_halo_profiles_file failed for suite=%s set_name=%s realization=%s snapnum=%s", suite, set_name, realization, snapnum)
        return None
    return r_raw, profiles, n_counts, m200c_raw, metadata_raw


def get_halo_profiles(suite, set_name, realization, snapnum, field, fetch_public: bool = False):
    """Real spherically-averaged gas profiles (density/pressure/temperature/
    metallicity) for every halo at one snapshot. No synthetic version - same
    reasoning as get_halo_catalog(). Unit conversions follow the exact
    formulas documented in docs/source/Profiles.rst of the upstream repo
    (verified 2026-08-01 against real numbers, not just copied blindly) -
    except metallicity, which upstream's own example script leaves as
    `/Zsun` with Zsun never defined (a real upstream bug); this returns the
    raw mass-weighted mass fraction instead of guessing that constant."""
    if not fetch_public or field not in PROFILES_FIELD_INDEX:
        return None
    fetched = _fetch_halo_profiles_file(suite, set_name, realization, snapnum)
    if fetched is None:
        return None
    r_raw, profiles, n_counts, m200c_raw, metadata_raw = fetched

    h = 0.6711
    z = SNAPSHOT_REDSHIFTS[snapnum]
    comoving_factor = 1.0 + z
    Msun_g = 1.989e33
    kpc_cm = 3.0856e21
    kb = 1.38e-16       # erg/K
    erg_to_keV = 6.242e8

    density_conv = Msun_g * kpc_cm ** -3 * 1e10 * h ** 2 * comoving_factor ** 3
    pressure_conv = density_conv * 1e10 * erg_to_keV
    temp_conv_to_keV = (1e5) ** 2 * kb * erg_to_keV
    K_per_keV = 1.0 / (kb * erg_to_keV)

    r = r_raw / h / comoving_factor
    m200c = m200c_raw * 1e10 / h
    valid = m200c > 0

    idx = PROFILES_FIELD_INDEX[field]
    raw_vals = profiles[idx][valid]
    n_vals = n_counts[idx][valid]
    if field == "Gas Density":
        values, units = raw_vals * density_conv, "g/cm^3"
    elif field == "Thermal Pressure":
        values, units = raw_vals * pressure_conv, "keV/cm^3"
    elif field == "Temperature":
        values, units = raw_vals * temp_conv_to_keV * K_per_keV, "K"
    else:
        values, units = raw_vals, "mass fraction"

    metadata = pd.DataFrame({k: v[valid] for k, v in metadata_raw.items()})

    return HaloProfiles(
        r=r, values=values, log_mass=np.log10(m200c[valid]), field=field, units=units,
        n_part=n_vals, metadata=metadata,
        note=(f"z = {z:.2f} - public CAMELS data release (Profiles/{suite}/{set_name}/"
              f"{set_name}_{realization}/{suite}_{set_name}_{realization}_{snapnum:03d}.hdf5, "
              f"{int(valid.sum())} halos, illstack_CAMELS SO/CGM profiles)"),
    )


def render_halo_profiles_png(suite, set_name, realization, snapnum, field, highlight_rank: int = 1,
                              fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "Halo Gas Profiles" block exactly: every halo's
    profile as a faint line colored by log10(M200c) (viridis), one
    highlighted with real Poisson-derived error bars (relative error ~
    1/sqrt(n), n = real particle count per bin - illstack_CAMELS doesn't
    publish uncertainties directly). Returns None when get_halo_profiles
    itself returns None (real-data only, no synthetic fallback)."""
    hprof = get_halo_profiles(suite, set_name, realization, snapnum, field, fetch_public=fetch_public)
    if hprof is None:
        return None

    order = np.argsort(hprof.log_mass)[::-1]  # most massive first
    highlight_rank = max(1, min(highlight_rank, len(order)))
    hi = int(order[highlight_rank - 1])

    # Real fix (2026-08-06, code-quality audit): see render_xray_profiles_png's
    # own comment for why plt.Normalize/plt.get_cmap don't need to change,
    # and _PNG_RENDER_LOCK's own docs for why the lock wraps the whole body.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(8, 5), dpi=150, facecolor="white")
        ax = fig.subplots()
        norm = plt.Normalize(hprof.log_mass.min(), hprof.log_mass.max())
        cmap = plt.get_cmap("viridis")
        for i, (row, mass) in enumerate(zip(hprof.values, hprof.log_mass)):
            if i == hi:
                continue
            positive = row > 0
            ax.plot(hprof.r[positive], row[positive], color=cmap(norm(mass)), alpha=0.4, lw=1.0)

        hi_row, hi_n = hprof.values[hi], hprof.n_part[hi]
        hi_mask = (hi_row > 0) & (hi_n > 0)
        hi_yerr = hi_row[hi_mask] / np.sqrt(hi_n[hi_mask])
        ax.errorbar(hprof.r[hi_mask], hi_row[hi_mask], yerr=hi_yerr, fmt="o-", ms=4,
                    color="crimson", lw=2, capsize=3, zorder=5,
                    label=f"highlighted (log M200c={hprof.log_mass[hi]:.2f})")
        ax.set_xscale("log")
        ax.set_yscale("log")
        ax.set_xlabel("r [kpc]")
        ax.set_ylabel(f"{hprof.field} [{hprof.units}]")
        ax.grid(alpha=0.3, which="both")
        ax.legend(fontsize=8, loc="upper right")
        sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
        sm.set_array([])
        fig.colorbar(sm, ax=ax, label="log10 M200c [Msun]")
        fig.tight_layout()
        return _finish_png(fig)


@lru_cache(maxsize=16)
def _fetch_photometry_bands(suite, set_name, realization, snapnum=N_SNAPSHOTS - 1,
                             sps_model="BC03", spectra_type="attenuated"):
    """Real per-subhalo band luminosities for one snapshot/SPS model/spectra
    type, plus the SubhaloIndex needed to cross-match with the Subfind
    catalog. Fetched lazily - the file is 40-250MB, but only the small
    per-band arrays for the requested filter groups are actually read, not
    the whole file. `emission` is fixed to "luminosity" (rest-frame): for a
    *color* (a same-source band ratio), flux vs. luminosity cancels out the
    same distance factor in both bands, so exposing it wouldn't change the
    result - not worth the extra control for this feature."""
    if not HAVE_FSSPEC or suite not in PUBLIC_PHOTOMETRY_SUITES:
        return None
    if sps_model not in PHOTOMETRY_SPS_MODELS or spectra_type not in PHOTOMETRY_SPECTRA_TYPES:
        return None

    file_suite = PHOTOMETRY_SUITE_FILENAME.get(suite, suite)
    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    url = (f"{PUBLIC_DATA_URL}/Photometry/{suite}/L25n256/{set_name}/"
           f"{file_suite}_{set_name}_{realization}_photometry.hdf5")
    snap_key = f"snap_{groupnum:03d}"
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                if snap_key not in hf or sps_model not in hf[snap_key]:
                    return None
                sub_idx = hf[snap_key]["SubhaloIndex"][:]
                base = hf[f"{snap_key}/{sps_model}/photometry/luminosity/{spectra_type}"]
                bands = {}
                for spec in PHOTOMETRY_FILTER_GROUPS.values():
                    group = spec["hdf5_group"]
                    for name in spec["bands"]:
                        if group is None:
                            if name in base:  # ungrouped (GALEX/UV) - direct dataset
                                bands[name] = base[name][:]
                        elif group in base and name in base[group]:
                            bands[name] = base[group][name][:]
    except Exception:
        logger.exception("_fetch_photometry_bands failed for suite=%s set_name=%s realization=%s", suite, set_name, realization)
        return None
    return sub_idx, bands


def get_color_mass_diagram(suite, set_name, realization, color=None, band1=None, band2=None,
                            snapnum=N_SNAPSHOTS - 1, sps_model="BC03", spectra_type="attenuated",
                            fetch_public: bool = False):
    """Real galaxy color (band1 - band2) vs. real stellar mass, cross-
    matching the Photometry catalog with the Subfind catalog via
    SubhaloIndex. No synthetic version - same reasoning as
    get_halo_catalog(). `color` (a key into PHOTOMETRY_COLORS) is kept for
    backward compatibility; pass band1/band2 directly to use any of the real
    filter families (SLOAN/Generic/HST/JWST/UKIRT/UV-GALEX)."""
    if not fetch_public:
        return None
    if color is not None and color in PHOTOMETRY_COLORS:
        band1, band2 = PHOTOMETRY_COLORS[color]
    color_label = color or f"{band1} - {band2}"
    if not band1 or not band2:
        return None

    fetched = _fetch_photometry_bands(suite, set_name, realization, snapnum, sps_model, spectra_type)
    if fetched is None:
        return None
    sub_idx, bands = fetched

    # Cross-match at the SAME snapshot the photometry itself uses - both
    # products must agree on redshift for the join to mean anything.
    subfind = _fetch_public_subfind(suite, set_name, realization, snapnum)
    if subfind is None:
        return None
    mstar_all = subfind["subhalo_stellar_mass"]  # already Msun/h

    if band1 not in bands or band2 not in bands:
        return None
    in_range = sub_idx < len(mstar_all)
    sub_idx, L1, L2 = sub_idx[in_range], bands[band1][in_range], bands[band2][in_range]

    with np.errstate(divide="ignore", invalid="ignore"):
        color_vals = -2.5 * np.log10(L1 / L2)
    mstar = mstar_all[sub_idx]
    mask = (mstar > 0) & np.isfinite(color_vals)
    if mask.sum() == 0:
        return None

    groupnum = SUBFIND_GROUPNUM_FOR_SNAPSHOT[snapnum]
    return ColorMassDiagram(
        color=color_vals[mask], log_mass=np.log10(mstar[mask]), color_label=color_label,
        note=(f"z = {subfind['redshift']:.2f} - public CAMELS data release (Photometry/{suite}/"
              f"L25n256/{set_name}/{suite}_{set_name}_{realization}_photometry.hdf5, "
              f"{sps_model} model, {spectra_type}, snap_{groupnum:03d}, "
              f"{int(mask.sum())} galaxies cross-matched with the Subfind catalog via SubhaloIndex)"),
    )


def render_color_mass_diagram_png(suite, set_name, realization, band1=None, band2=None,
                                   snapnum=N_SNAPSHOTS - 1, sps_model="BC03", spectra_type="attenuated",
                                   fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "Color-Mass Diagram" block exactly: a plain
    scatter of color vs. log10 stellar mass. Returns None (real-data only,
    no synthetic fallback) when get_color_mass_diagram itself does."""
    result = get_color_mass_diagram(
        suite, set_name, realization, band1=band1, band2=band2, snapnum=snapnum,
        sps_model=sps_model, spectra_type=spectra_type, fetch_public=fetch_public,
    )
    if result is None:
        return None

    # Real fix (2026-08-06, code-quality audit): Figure/FigureCanvasAgg
    # (_finish_png), whole render body locked - see _PNG_RENDER_LOCK's own
    # docs for why.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(7, 5.5), dpi=150, facecolor="white")
        ax = fig.subplots()
        ax.scatter(result.log_mass, result.color, s=14, alpha=0.5, c="#2b5f8a")
        ax.set_xlabel("log10 Stellar Mass [Msun/h]")
        ax.set_ylabel(f"{result.color_label} [mag]")
        ax.grid(alpha=0.3, which="both")
        fig.tight_layout()
        return _finish_png(fig)


@lru_cache(maxsize=32)
def _fetch_bispectrum_highk(suite, set_name, realization, bk_type, rsd_axis=None):
    """Real high-k (HIPSTER pair-counting) k1=k2 bispectrum Legendre
    multipoles - see BK_HIGHK_ELLS's own comment for the real column
    convention (same 6 ells whether real-space or RSD). Small file, fetched
    whole. Returns (k [h/Mpc], {ell: Bk array}) sorted by k, or None."""
    if suite not in PUBLIC_BK_SUITES or set_name != "LH":
        return None

    rs_part = f"_RS{rsd_axis}" if rsd_axis is not None else ""
    url = (f"{PUBLIC_DATA_URL}/Bk/{suite}/{set_name}/{set_name}_{realization}/"
           f"Bk_{bk_type}_highk{rs_part}_z=0.00.txt")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]
    if not lines:
        return None
    try:
        data = np.loadtxt(lines)
    except ValueError:
        return None
    if data.ndim != 2 or data.shape[1] < 3:
        return None

    k1, k2 = data[:, 0], data[:, 1]
    equal = np.isclose(k1, k2)
    if equal.sum() == 0:
        return None

    n_ell_cols = data.shape[1] - 2
    if n_ell_cols != len(BK_HIGHK_ELLS):
        # Real schema mismatch (e.g. a future file with a different column
        # count) - refuse to silently misattribute columns to ell values
        # rather than guess.
        return None

    order = np.argsort(k1[equal])
    k = k1[equal][order]
    bk_by_ell = {ell: data[equal, 2 + i][order] for i, ell in enumerate(BK_HIGHK_ELLS)}
    return k, bk_by_ell


@lru_cache(maxsize=32)
def _fetch_bispectrum(suite, set_name, realization, bk_type, mu_index=BK_EQUILATERAL_MU_INDEX):
    """Real low-k (FFT-based) k1=k2 bispectrum at one mu bin, real-space,
    z=0.00. Small file (~37KB), fetched whole. Returns (k [h/Mpc], Bk
    [(Mpc/h)^6]) sorted by k, or None."""
    if suite not in PUBLIC_BK_SUITES or set_name != "LH":
        return None

    url = f"{PUBLIC_DATA_URL}/Bk/{suite}/{set_name}/{set_name}_{realization}/Bk_{bk_type}_lowk_z=0.00.txt"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    lines = text.splitlines()
    if len(lines) < 16:
        return None
    try:
        data = np.loadtxt(lines[15:])
    except ValueError:
        return None

    k1, k2 = data[:, 0], data[:, 1]
    equal = np.isclose(k1, k2)
    if equal.sum() == 0:
        return None
    k = k1[equal]
    bk = data[equal, 2 + mu_index]
    order = np.argsort(k)
    return k[order], bk[order]


def get_bispectrum(suite, set_name, realization, field, mu_index=BK_EQUILATERAL_MU_INDEX,
                    k_range: str = "lowk", rsd_axis: int | None = None, ell: int = 0,
                    fetch_public: bool = False) -> Result | None:
    """Real k1=k2 matter/gas/dark-matter bispectrum. `k_range="lowk"`
    (default) is the original FFT-based estimator at one mu (triangle-shape)
    bin - mu_index=7 (mu=0.5) is the equilateral configuration. `k_range=
    "highk"` is the separate HIPSTER-based estimator (see
    _fetch_bispectrum_highk) - real-space or redshift-space (`rsd_axis` in
    {0,1,2}), reporting Legendre multipoles B_ell instead of mu bins. No
    synthetic version either way - a fabricated bispectrum shape isn't a
    useful illustrative stand-in the way a power-law Pk/HMF curve is."""
    if not fetch_public or field not in BK_TYPES:
        return None

    if k_range == "highk":
        fetched = _fetch_bispectrum_highk(suite, set_name, realization, BK_TYPES[field], rsd_axis)
        if fetched is None:
            return None
        k, bk_by_ell = fetched
        if ell not in bk_by_ell:
            return None
        bk = bk_by_ell[ell]
        rs_label = "real-space" if rsd_axis is None else f"redshift-space, axis {rsd_axis}"
        rs_part = f"_RS{rsd_axis}" if rsd_axis is not None else ""
        return Result(
            x=k, y=bk, x_label="k [h/Mpc]", y_label=f"B_{ell}(k,k) [(Mpc/h)^6]",
            source="real",
            note=(f"z = 0.00, {rs_label}, k1=k2, Legendre multipole ell={ell} - public CAMELS "
                  f"data release (Bk/{suite}/{set_name}/{set_name}_{realization}/"
                  f"Bk_{BK_TYPES[field]}_highk{rs_part}_z=0.00.txt, HIPSTER pair-counting "
                  f"estimator, {field})"),
        )

    if not (0 <= mu_index < len(BK_MU_VALUES)):
        return None
    fetched = _fetch_bispectrum(suite, set_name, realization, BK_TYPES[field], mu_index)
    if fetched is None:
        return None
    k, bk = fetched
    mu = BK_MU_VALUES[mu_index]
    shape = "equilateral (k1=k2=k3)" if mu_index == BK_EQUILATERAL_MU_INDEX else f"k1=k2, mu={mu:+.1f}"
    return Result(
        x=k, y=bk, x_label="k [h/Mpc]", y_label=f"B(k,k,mu={mu:+.1f}) [(Mpc/h)^6]",
        source="real",
        note=(f"z = 0.00, real-space, {shape} - public CAMELS "
              f"data release (Bk/{suite}/{set_name}/{set_name}_{realization}/"
              f"Bk_{BK_TYPES[field]}_lowk_z=0.00.txt, low-k FFT-based estimator, {field})"),
    )


@lru_cache(maxsize=16)
def _fetch_pdf_array(suite, field, grid, redshift):
    """Real (1000, 500) histogram-count array - every LH realization's CMD
    grid pixel-value histogram for one field, in a single small (~4MB)
    file. Returns the raw int array or None."""
    if not HAVE_FSSPEC or suite not in PUBLIC_PDF_SUITES:
        return None
    if field not in CMD_FIELDS or grid not in PUBLIC_PDF_GRIDS:
        return None

    url = f"{PUBLIC_DATA_URL}/PDF/hist_Grids_{field}_{suite}_LH_{grid}_z={redshift:.1f}.npy"
    try:
        with fsspec.open(url, "rb") as fobj:
            data = np.load(fobj)
    except Exception:
        logger.exception("_fetch_pdf_array failed for suite=%s field=%s grid=%s redshift=%s", suite, field, grid, redshift)
        return None
    return data


def get_field_pdf(suite, field, grid=128, redshift=0.0, fetch_public: bool = False):
    """Real ensemble mean +/- std PDF (histogram of CMD grid pixel values)
    across all 1000 LH realizations for one field/suite/redshift. No
    synthetic version - same reasoning as get_halo_catalog(). x-axis is a
    raw bin index, not a physical value - see PUBLIC_PDF_* comment above for
    why (no bin-edge/value-range info is published)."""
    if not fetch_public:
        return None
    data = _fetch_pdf_array(suite, field, grid, redshift)
    if data is None:
        return None
    return FieldPDF(
        bin_index=np.arange(data.shape[1]), mean_counts=data.mean(axis=0),
        std_counts=data.std(axis=0), field=field,
        note=(f"z = {redshift:.2f}, grid={grid}^3 - public CAMELS data release (PDF/hist_Grids_"
              f"{field}_{suite}_LH_{grid}_z={redshift:.1f}.npy), mean +/- std across all "
              f"{data.shape[0]} LH realizations. x-axis is the raw histogram bin index (0-499) - "
              f"the exact field-value range/transform used to bin isn't published, so only "
              f"relative distribution shape is shown, not calibrated bin values."),
    )


def render_field_pdf_png(suite, field, grid=128, redshift=0.0, fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "Field PDF" block exactly: mean line +/- 1 std
    band (fill_between) across the ensemble, log-y. Returns None
    (real-data only, no synthetic fallback) when get_field_pdf itself
    does."""
    pdf = get_field_pdf(suite, field, grid=grid, redshift=redshift, fetch_public=fetch_public)
    if pdf is None:
        return None

    # Real fix (2026-08-06, code-quality audit): Figure/FigureCanvasAgg
    # (_finish_png), whole render body locked - see _PNG_RENDER_LOCK's own
    # docs for why.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(8, 4.5), dpi=150, facecolor="white")
        ax = fig.subplots()
        ax.plot(pdf.bin_index, pdf.mean_counts, lw=2, color="#2b5f8a", label="mean")
        lower = np.clip(pdf.mean_counts - pdf.std_counts, 1e-3, None)
        ax.fill_between(pdf.bin_index, lower, pdf.mean_counts + pdf.std_counts,
                         alpha=0.3, color="#2b5f8a", label="±1 std across realizations")
        ax.set_yscale("log")
        ax.set_xlabel("bin index (0-499, uncalibrated)")
        ax.set_ylabel(f"count [{pdf.field}]")
        ax.grid(alpha=0.3, which="both")
        ax.legend(fontsize=8)
        fig.tight_layout()
        return _finish_png(fig)


def get_lya_spectrum(suite, set_name, realization, snapnum, sightline,
                      fetch_public: bool = False) -> LymanAlphaSpectrum | None:
    """Real Lyman-alpha transmission spectrum for one of 5000 sightlines at
    one snapshot. No synthetic version - a fabricated absorption spectrum
    isn't a useful illustrative stand-in the way a power-law curve is."""
    if not fetch_public or not HAVE_FSSPEC or suite not in PUBLIC_LYA_SUITES:
        return None
    if not (0 <= sightline < LYA_N_SIGHTLINES):
        return None

    url = (f"{PUBLIC_DATA_URL}/Lya/{suite}/{set_name}/{set_name}_{realization}/"
           f"SPECTRA_{snapnum:03d}/Lya-spectra.hdf5")
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                tau_ds = hf["tau/H/1/1215"]
                if sightline >= tau_ds.shape[0]:
                    return None
                tau = tau_ds[sightline, :]
                colden = hf["colden/H/1"][sightline, :]
                z = float(hf["Header"].attrs["redshift"])
    except Exception:
        logger.exception("get_lya_spectrum failed for suite=%s set_name=%s realization=%s snapnum=%s sightline=%s", suite, set_name, realization, snapnum, sightline)
        return None

    flux = np.exp(-tau)
    return LymanAlphaSpectrum(
        pixel=np.arange(len(flux)), flux=flux, sightline=sightline, colden=colden,
        note=(f"z = {z:.2f} - public CAMELS data release (Lya/{suite}/{set_name}/"
              f"{set_name}_{realization}/SPECTRA_{snapnum:03d}/Lya-spectra.hdf5, sightline "
              f"{sightline} of {LYA_N_SIGHTLINES}, hydrogen Ly-alpha 1215A optical depth). "
              f"x-axis is the raw spectral pixel index - no velocity/wavelength calibration "
              f"is applied (fake_spectra's own dv isn't safely re-derivable from the file's "
              f"stored header alone)."),
    )


def render_lya_spectrum_png(suite, set_name, realization, snapnum, sightline,
                             fetch_public: bool = False) -> bytes | None:
    """Mirrors app.py's own "Lyman-alpha Spectrum" block exactly: a 2-row
    shared-x figure (transmitted flux on top, HI column density below,
    log-y). Returns None (real-data only, no synthetic fallback) when
    get_lya_spectrum itself does."""
    lya = get_lya_spectrum(suite, set_name, realization, snapnum, sightline, fetch_public=fetch_public)
    if lya is None:
        return None

    # Real fix (2026-08-06, code-quality audit): Figure/FigureCanvasAgg
    # (_finish_png), whole render body locked - see _PNG_RENDER_LOCK's own
    # docs for why.
    with _PNG_RENDER_LOCK:
        fig = Figure(figsize=(9, 6), dpi=150, facecolor="white")
        ax, ax2 = fig.subplots(2, 1, sharex=True)
        ax.plot(lya.pixel, lya.flux, lw=1.2, color="#2b5f8a")
        ax.set_ylim(0, 1.05)
        ax.set_ylabel("transmitted flux (e^-tau)")
        ax.grid(alpha=0.3)
        ax2.plot(lya.pixel, lya.colden, lw=1.2, color="#8a4a2b")
        ax2.set_yscale("log")
        ax2.set_xlabel("spectral pixel (uncalibrated)")
        ax2.set_ylabel("HI column density")
        ax2.grid(alpha=0.3, which="both")
        fig.tight_layout()
        return _finish_png(fig)
