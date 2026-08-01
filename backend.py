"""
CAMELS Explorer — backend

This module mirrors the function signatures of the real analysis routines in
`camels_library/camels_library.py` (compute_Pk, halo_mass_function,
stellar_mass_function, star_formation_rate_history), but stands in synthetic
data when no real data source is available.

Real data comes from the public CAMELS data release (Globus/Binder/direct-URL
access - see docs/source/data_access.rst upstream), fetched over plain HTTP:
precomputed Pk files, FOF/Subfind catalogs, CMD 3D grids (via HTTP Range
requests, so a multi-GB stacked file is never downloaded whole), and - when
Pylians (`MAS_library`/`readgadget`) is installed - real per-particle gridding
of a raw snapshot, streamed lazily via `fsspec` rather than downloaded whole.
"""

from __future__ import annotations

import ast
import hashlib
import re
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from functools import lru_cache

import h5py
import numpy as np
import pandas as pd

try:
    import fsspec
    import MAS_library as MASL
    HAVE_CAMELS_LIBRARY = True
except ImportError:
    HAVE_CAMELS_LIBRARY = False

PUBLIC_DATA_URL = "https://users.flatironinstitute.org/~camels"
CMD_DATA_URL = "<ask-the-camels-team-for-this-url>"


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

SET_REALIZATIONS = {
    "LH": 1000,   # Latin Hypercube: varied cosmology + astrophysics
    "CV": 27,     # Cosmic Variance: fixed params, varied initial phases
    "1P": 66,     # One-parameter-at-a-time
    "EX": 4,      # Extreme
}

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
# computed from the full particle set (including black holes).
PK_SUFFIX_FOR_PTYPE = {
    (0,): "g",       # gas
    (1,): "c",       # CDM
    (4,): "s",       # stars
    (0, 1, 4): "m",  # total matter
}

# Suites with public FOF/Subfind catalogs in the first-generation box.
PUBLIC_SUBFIND_SUITES = {"IllustrisTNG", "SIMBA", "Astrid", "Swift-EAGLE"}

# FOF/Subfind catalogs are numbered on their own output schedule (~0-90),
# not the 34-snapshot schedule Pk/SFRH use - 90 is the last one, z~0.
# The snapshot slider doesn't yet select among catalog redshifts; see the
# note this produces on Result.
PUBLIC_SUBFIND_GROUPNUM = 90

# Raw snapshots use the same ~0-90 output schedule as FOF/Subfind (written at
# the same steps). Verified directly: IllustrisTNG, SIMBA, and Astrid all use
# the Gadget-style HDF5 layout (scalar or length-1 BoxSize, PartTypeN groups)
# that _fetch_and_grid_snapshot()/readgadget assume. Swift-EAGLE does NOT -
# it's SWIFT's own native format (BoxSize is a 3-vector, entirely different
# top-level groups: DMParticles/GasParticles/Cosmology/Units/...) and would
# need dedicated reading code, not a Gadget-format bug fix. Excluded here
# until that's built, rather than silently mishandled.
PUBLIC_SIMS_SUITES = {"IllustrisTNG", "SIMBA", "Astrid"}
PUBLIC_SIMS_SNAPNUM = 90

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
CMD_2D_MAPS_URL = "<ask-the-camels-team-for-this-url>"
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
PHOTOMETRY_SNAPNUM = PUBLIC_SUBFIND_GROUPNUM  # 90
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
# deliberately out of scope for now. Scoped to the **equilateral**
# configuration (k1=k2=k3) for a genuine 1D line plot matching this app's
# other statistics - confirmed the file's own mu convention directly (not
# assumed): mu is the angle between the k1/k2 vectors, so a true equilateral
# triangle (all 3 sides equal) needs mu=0.5, not mu=0 (mu=0 would be a
# right-angle configuration instead) - verified with real k1==k2 rows before
# picking the mu bin.
PUBLIC_BK_SUITES = {"IllustrisTNG", "SIMBA"}
BK_TYPES = {"Total Matter": "m", "Gas": "g", "Dark Matter": "c"}
BK_EQUILATERAL_MU_INDEX = 7  # mu_arr[7] == 0.5

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
    source: str = "synthetic"   # "synthetic" | "real"
    note: str = ""


@dataclass
class Field3D:
    density: np.ndarray   # (grid, grid, grid), values ~ rho/mean_rho
    box_size: float        # Mpc/h
    source: str = "synthetic"
    note: str = ""


@dataclass
class Map2D:
    values: np.ndarray   # (256, 256) for real CMD maps
    box_size: float       # Mpc/h
    source: str = "synthetic"
    note: str = ""


@dataclass
class Catalog:
    frame: pd.DataFrame
    box_size: float   # Mpc/h
    redshift: float
    source: str = "real"   # no synthetic version - see get_halo_catalog()
    note: str = ""


@dataclass
class ParticleCloud:
    positions: np.ndarray   # (N, 3), Mpc/h
    box_size: float         # Mpc/h
    source: str = "synthetic"
    note: str = ""


@dataclass
class VoidCatalog:
    positions: np.ndarray         # (N, 3), Mpc/h
    radius: np.ndarray            # Mpc/h
    density_contrast: np.ndarray
    box_size: float                # Mpc/h
    source: str = "synthetic"
    note: str = ""


@dataclass
class ScalingRelations:
    stellar_mass: np.ndarray   # Msun/h, bin centers
    radius: np.ndarray         # kpc/h, mean stellar half-mass radius per bin
    bh_mass: np.ndarray        # Msun/h, mean per bin
    sfr: np.ndarray            # Msun/yr, mean per bin
    vmax: np.ndarray           # km/s, mean per bin
    counts: np.ndarray         # galaxies per bin - bins with 0 count are unpopulated, not zero-valued
    source: str = "synthetic"
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
    redshift: np.ndarray   # one entry per snapshot along the main branch, root (z=0) first
    mass: np.ndarray       # Msun/h, SubLink's total Subhalo mass at each snapshot
    subfind_id: int        # the z=0 SubfindID this history was traced from
    source: str = "real"   # real-data only, no synthetic fallback (see get_merger_history)
    note: str = ""


@dataclass
class HaloProfiles:
    r: np.ndarray          # kpc (physical), 25 log-spaced bins
    values: np.ndarray      # shape (n_halos, 25), units depend on `units`
    log_mass: np.ndarray    # log10 M200c [Msun], shape (n_halos,)
    field: str
    units: str
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


@lru_cache(maxsize=16)
def _fetch_public_subfind(suite, set_name, realization):
    """Download one real FOF/Subfind catalog from the public CAMELS data
    release. Only the highest-numbered (~z=0) catalog is fetched for now -
    catalogs use their own ~0-90 numbering, unrelated to the 34-snapshot
    schedule the snapshot slider drives elsewhere in this app. Returns a dict
    of numpy arrays/floats, or None if unavailable. Cached - HMF, SMF, and
    the catalog browser all pull from the same fetched file at no extra
    download cost once a (suite, set, realization) has been seen."""
    if suite not in PUBLIC_SUBFIND_SUITES:
        return None

    url = (f"{PUBLIC_DATA_URL}/FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"groups_{PUBLIC_SUBFIND_GROUPNUM:03d}.hdf5")
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
    if suite not in PUBLIC_CMD_GRID_SUITES or grid_res not in (128, 256, 512) or field not in CMD_FIELDS:
        return None
    z = min(CMD_GRID_REDSHIFTS, key=lambda cz: abs(cz - redshift))

    url = f"{CMD_DATA_URL}/{suite}/Grids_{field}_{suite}_{set_name}_{grid_res}_z={z}.npy"
    grid = _fetch_npy_stack_slice(url, realization)
    if grid is None:
        return None
    return grid, z


@lru_cache(maxsize=8)
def _fetch_snapshot_positions(suite, set_name, realization, part_type=1, max_particles=2_000_000):
    """Stream real particle positions lazily from a raw public snapshot over
    HTTP (fsspec issues Range requests under the hood, so the ~2-2.5GB file
    is never downloaded whole), subsampled via a stride to ~max_particles.
    Real particles, just coarser sampling, not synthetic. Shared by the
    density-field gridder and the particle-cloud viewer so switching between
    them on the same (suite, set, realization) doesn't re-fetch. Returns
    (positions [Mpc/h, N x 3], box_size [Mpc/h], redshift), or None."""
    if suite not in PUBLIC_SIMS_SUITES:
        return None

    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"snapshot_{PUBLIC_SIMS_SNAPNUM:03d}.hdf5")
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
        return None

    return pos, box_size, redshift


@lru_cache(maxsize=8)
def _fetch_snapshot_field_positions(suite, set_name, realization, field, max_particles=2_000_000):
    """Real particle positions + per-particle mass weights for one of the
    mass-type fields (Mgas/Mcdm/Mstar/Mtot), for weighted gridding. Separate
    from _fetch_snapshot_positions (which is DM-only/unweighted, used by the
    particle-cloud view) since this needs per-species mass weights. Only
    the 4 mass-type fields are supported - see RAW_SNAPSHOT_MASS_FIELDS for
    why the derived-physics fields aren't implemented here. Returns
    (positions [Mpc/h, N x 3], weights [Msun/h], box_size, redshift) or None."""
    if suite not in PUBLIC_SIMS_SUITES or field not in RAW_SNAPSHOT_MASS_FIELDS:
        return None

    url = (f"{PUBLIC_DATA_URL}/Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"snapshot_{PUBLIC_SIMS_SNAPNUM:03d}.hdf5")
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
        return None

    return pos, weights, box_size, redshift


def _fetch_and_grid_snapshot(suite, set_name, realization, grid_res, field=DEFAULT_CMD_FIELD,
                             max_particles=2_000_000):
    """Real per-particle gridding: real particle positions (mass-weighted
    for the selected field) painted onto a grid with the real
    `MAS_library.MA()`. Needs Pylians installed; returns
    (grid, box_size, redshift, n_particles_used) or None."""
    if not HAVE_CAMELS_LIBRARY:
        return None
    fetched = _fetch_snapshot_field_positions(suite, set_name, realization, field,
                                              max_particles=max_particles)
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
        return None  # any gridding failure -> caller falls back to synthetic

    return delta, box_size, redshift, pos.shape[0]


# ---------------------------------------------------------------------------
# Power spectrum  (mirrors camels_library.compute_Pk)
# ---------------------------------------------------------------------------

def get_power_spectrum(suite, set_name, realization, snapnum, grid, MAS, threads, ptype,
                        snapshot_path: str | None = None, fetch_public: bool = False) -> Result:
    z = _snapshot_to_redshift(snapnum)

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
            pass  # fall through to synthetic

    rng = np.random.default_rng(_seed(suite, set_name, realization, snapnum, grid, MAS, tuple(ptype)))
    k = np.logspace(-2, np.log10(grid * np.pi / 25.0), 60)  # h/Mpc, box ~25 Mpc/h
    k0 = 0.02 * (1 + z)
    ns = 0.96
    amp = 2e4 / (1 + z) ** 1.2
    Pk = amp * k ** ns / (1 + (k / k0) ** (ns + 3))
    Pk *= 1 + 0.03 * np.sin(20 * np.log(k)) * rng.normal(1, 0.05, size=k.shape)  # BAO-ish wiggle
    Pk *= rng.normal(1, 0.02, size=k.shape)  # sample variance-ish noise
    return Result(
        x=k, y=np.abs(Pk),
        x_label="k [h/Mpc]", y_label="P(k) [(Mpc/h)$^3$]",
        note=f"z = {z:.2f}, ptype = {ptype}, grid = {grid}, MAS = {MAS}",
    )


# ---------------------------------------------------------------------------
# Halo mass function  (mirrors camels_library.halo_mass_function)
# ---------------------------------------------------------------------------

def get_halo_mass_function(suite, set_name, realization, snapnum, RMmin, RMmax, bins,
                            subfind_path: str | None = None, fetch_public: bool = False) -> Result:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization)
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
                      f"catalog #{PUBLIC_SUBFIND_GROUPNUM} - snapshot slider not used for this source)"),
            )

    if subfind_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up real subfind read here")
        except Exception:
            pass

    rng = np.random.default_rng(_seed(suite, set_name, realization, snapnum, "hmf"))
    M = np.logspace(np.log10(RMmin), np.log10(RMmax), bins)
    Mstar = 10 ** (13.2 + 0.15 * rng.normal())
    n = 3e-3 * (M / 1e11) ** -1.9 * np.exp(-(M / Mstar) ** 0.9)
    n *= rng.normal(1, 0.08, size=M.shape)
    return Result(
        x=M, y=np.clip(n, 1e-12, None),
        x_label="Mass / Omega_m [Msun/h]", y_label="dn/dlogM [(Mpc/h)^-3]",
        note=f"z = {_snapshot_to_redshift(snapnum):.2f}",
    )


# ---------------------------------------------------------------------------
# Baryon fraction  (mirrors camels_library.baryon_fraction_FoF)
# ---------------------------------------------------------------------------

def get_baryon_fraction(suite, set_name, realization, snapnum, RMmin, RMmax, bins,
                         subfind_path: str | None = None, fetch_public: bool = False) -> Result:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization)
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
                      f"catalog #{PUBLIC_SUBFIND_GROUPNUM} - snapshot slider not used for this source)"),
            )

    # Synthetic fallback: baryon fraction rises with halo mass toward the
    # cosmic value (small halos lose gas to feedback more efficiently),
    # roughly matching the real trend's shape.
    rng = np.random.default_rng(_seed(suite, set_name, realization, snapnum, "baryonfrac"))
    M = np.logspace(np.log10(RMmin), np.log10(RMmax), bins)
    pivot = 10 ** (12.5 + 0.2 * rng.normal())
    fraction = 1.0 / (1 + (pivot / M) ** 0.7)
    fraction *= rng.normal(1, 0.05, size=M.shape)
    return Result(
        x=M, y=np.clip(fraction, 0, 1.3),
        x_label="Mass / Omega_m [Msun/h]", y_label="Baryon fraction / cosmic fraction",
        log_y=False,
        note=f"z = {_snapshot_to_redshift(snapnum):.2f}",
    )


# ---------------------------------------------------------------------------
# Stellar mass function  (mirrors camels_library.stellar_mass_function)
# ---------------------------------------------------------------------------

def get_stellar_mass_function(suite, set_name, realization, snapnum, SMmin, SMmax, bins,
                               subfind_path: str | None = None, fetch_public: bool = False) -> Result:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization)
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
                      f"catalog #{PUBLIC_SUBFIND_GROUPNUM} - snapshot slider not used for this source)"),
            )

    if subfind_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up real subfind read here")
        except Exception:
            pass

    rng = np.random.default_rng(_seed(suite, set_name, realization, snapnum, "smf"))
    M = np.logspace(np.log10(SMmin), np.log10(SMmax), bins)
    Mstar = 10 ** (10.7 + 0.1 * rng.normal())
    n = 5e-3 * (M / 1e10) ** -1.3 * np.exp(-(M / Mstar) ** 1.2)
    n *= rng.normal(1, 0.1, size=M.shape)
    return Result(
        x=M, y=np.clip(n, 1e-12, None),
        x_label="Stellar mass [Msun/h]", y_label="dn/dlogM [(Mpc/h)^-3]",
        note=f"z = {_snapshot_to_redshift(snapnum):.2f}",
    )


# ---------------------------------------------------------------------------
# Halo/subhalo catalog browser (no equivalent single camels_library function -
# exposes the same real Subfind catalog HMF/SMF already fetch, as a table)
# ---------------------------------------------------------------------------

def get_halo_catalog(suite, set_name, realization, fetch_public: bool = False) -> Catalog | None:
    """Real subhalo catalog as a browsable table. No synthetic version -
    a fabricated catalog isn't useful the way a fabricated curve is, so this
    returns None outright when real data isn't available (fetch_public off,
    or an unsupported suite), rather than inventing fake rows."""
    if not fetch_public:
        return None
    catalog = _fetch_public_subfind(suite, set_name, realization)
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
    frame = frame[frame["Stellar Mass [Msun/h]"] > 0].reset_index(drop=True)

    return Catalog(
        frame=frame, box_size=catalog["box_size"], redshift=catalog["redshift"],
        note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
              f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
              f"catalog #{PUBLIC_SUBFIND_GROUPNUM}, {len(frame)} subhalos with stars)"),
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
    frame = frame[frame["Stellar Mass [Msun]"] > 0].reset_index(drop=True)
    if len(frame) == 0:
        return None

    return Catalog(
        frame=frame, box_size=CAMELS_SAM_BOX_SIZE, redshift=float(df["redshift"].iloc[0]),
        note=(f"z ~ {df['redshift'].iloc[0]:.2f} - public CAMELS data release "
              f"(SCSAM/{set_name}/{set_name}_{realization}/sc-sam/{SAM_DEFAULT_OCTANT}, "
              f"{len(frame)} galaxies with stars - one of 8 spatial octants, tail sample of "
              f"the full merger-tree catalog, not the complete realization)"),
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


def get_scaling_relations(suite, set_name, realization, SMmin, SMmax, bins,
                           fetch_public: bool = False) -> ScalingRelations:
    if fetch_public:
        catalog = _fetch_public_subfind(suite, set_name, realization)
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
                counts=counts,
                source="real",
                note=(f"z = {catalog['redshift']:.2f} - public CAMELS data release "
                      f"(FOF_Subfind/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"catalog #{PUBLIC_SUBFIND_GROUPNUM} - snapshot slider not used for this source)"),
            )

    rng = np.random.default_rng(_seed(suite, set_name, realization, "scaling"))
    mean_SM = np.logspace(np.log10(SMmin), np.log10(SMmax), bins)
    counts = np.full(bins, 50)  # synthetic stand-in - treat every bin as populated
    noise = lambda scale: rng.normal(1, scale, size=mean_SM.shape)  # noqa: E731

    return ScalingRelations(
        stellar_mass=mean_SM,
        radius=6.0 * (mean_SM / 1e10) ** 0.3 * noise(0.1),                    # kpc/h
        bh_mass=1e6 * (mean_SM / 1e10) ** 1.2 * noise(0.2),                   # Msun/h
        sfr=np.clip(0.3 * (mean_SM / 1e10) ** 0.8 * noise(0.15), 1e-4, None),  # Msun/yr
        vmax=120.0 * (mean_SM / 1e10) ** 0.2 * noise(0.08),                   # km/s
        counts=counts,
        note="illustrative power-law scalings (synthetic)",
    )


# ---------------------------------------------------------------------------
# SFR history  (mirrors camels_library.star_formation_rate_history)
# ---------------------------------------------------------------------------

def get_sfr_history(suite, set_name, realization, z_min, z_max, bins,
                     sfrh_path: str | None = None) -> Result:
    if sfrh_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up real sfrh file read here")
        except Exception:
            pass

    rng = np.random.default_rng(_seed(suite, set_name, realization, "sfrh"))
    z = np.linspace(z_min, z_max, bins)
    peak = 2.0 + 0.3 * rng.normal()
    sfrd = 0.18 * (1 + z) ** 2.7 / (1 + ((1 + z) / (1 + peak)) ** 5.6)
    sfrd *= rng.normal(1, 0.05, size=z.shape)
    return Result(
        x=z, y=np.clip(sfrd, 1e-6, None),
        x_label="Redshift", y_label="SFRD [Msun/yr/Mpc^3]",
        log_x=False,
        note="Madau-Dickinson-like shape (synthetic)",
    )


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
                          snapshot_path: str | None = None, fetch_public: bool = False) -> Field3D:
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

        snap_fetch = _fetch_and_grid_snapshot(suite, set_name, realization, grid, field=field)
        if snap_fetch is not None:
            density, box_size, actual_z, n_used = snap_fetch
            return Field3D(
                density=density, box_size=box_size, source="real",
                note=(f"z = {actual_z:.2f}, overdensity ρ/ρ̄ ({CMD_FIELDS[field]}) - real particles "
                      f"from a public snapshot (Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"{n_used:,} particles gridded with Pylians' MAS_library, "
                      f"snapshot slider not used for this source)"),
            )

    if snapshot_path and HAVE_CAMELS_LIBRARY:
        try:
            raise NotImplementedError("wire up user-supplied local snapshot gridding here")
        except Exception:
            pass  # fall through to synthetic

    rng = np.random.default_rng(_seed(suite, set_name, realization, snapnum, grid, "field3d"))
    box_size = 25.0  # Mpc/h, matches the LH/CV/1P box used elsewhere in this prototype

    # White noise -> FFT -> shape by a synthetic P(k) -> back to real space.
    # This gives a Gaussian random field with cosmic-web-like correlations,
    # which we then lognormal-transform so densities are positive and
    # clustered (knots/filaments/voids) instead of symmetric noise.
    white = rng.normal(size=(grid, grid, grid))
    field_k = np.fft.rfftn(white)

    kfreq = np.fft.fftfreq(grid) * grid
    kfreq_z = np.fft.rfftfreq(grid) * grid
    kx, ky, kz = np.meshgrid(kfreq, kfreq, kfreq_z, indexing="ij")
    kmag = np.sqrt(kx**2 + ky**2 + kz**2)
    kmag[0, 0, 0] = 1.0  # avoid divide-by-zero at the DC mode

    k0 = 0.06 * grid / 32 * (1 + z)
    Pk_shape = (kmag ** 0.96) / (1 + (kmag / k0) ** 3.9)

    field_k *= np.sqrt(Pk_shape)
    field = np.fft.irfftn(field_k, s=(grid, grid, grid))
    field = (field - field.mean()) / field.std()

    sigma = 1.1
    density = np.exp(sigma * field - 0.5 * sigma**2)  # lognormal density field, mean ~ 1

    return Field3D(
        density=density, box_size=box_size,
        note=f"z = {z:.2f}, {grid}^3 grid, box = {box_size:.0f} Mpc/h",
    )


# ---------------------------------------------------------------------------
# 3D particle cloud (no equivalent camels_library function - a raw scatter
# view of real DM particle positions, distinct from the gridded density field)
# ---------------------------------------------------------------------------

def get_particle_cloud(suite, set_name, realization, max_particles=50_000,
                        fetch_public: bool = False) -> ParticleCloud:
    """Real DM particle positions as a 3D point cloud, or a synthetic
    clustered stand-in. Reuses the same lazy-fetch helper the density-field
    gridder uses (cached, so viewing both for the same realization doesn't
    re-fetch) - real particles, not synthetic, when available. Meant for
    pydeck's GPU-instanced PointCloudLayer, which handles far more points
    smoothly than Plotly's scatter3d."""
    if fetch_public:
        fetched = _fetch_snapshot_positions(suite, set_name, realization, part_type=1,
                                             max_particles=max_particles)
        if fetched is not None:
            pos, box_size, redshift = fetched
            return ParticleCloud(
                positions=pos, box_size=box_size, source="real",
                note=(f"z = {redshift:.2f} - real DM particles from a public snapshot "
                      f"(Sims/{suite}/L25n256/{set_name}/{set_name}_{realization}, "
                      f"{pos.shape[0]:,} particles shown via stride subsampling)"),
            )

    # Synthetic fallback: a handful of Gaussian "halo" clusters plus a
    # diffuse background - echoes the same knots/voids character as the
    # synthetic density field without needing the FFT machinery.
    rng = np.random.default_rng(_seed(suite, set_name, realization, "particles"))
    box_size = 25.0
    n_clusters = 8
    centers = rng.uniform(0, box_size, size=(n_clusters, 3))
    weights = rng.dirichlet(np.full(n_clusters, 0.6))  # uneven cluster sizes
    n_clustered = int(max_particles * 0.7)
    counts = (weights * n_clustered).astype(int)
    clustered = np.vstack([
        rng.normal(centers[i], box_size * 0.04, size=(max(counts[i], 1), 3))
        for i in range(n_clusters)
    ])
    diffuse = rng.uniform(0, box_size, size=(max_particles - clustered.shape[0], 3))
    positions = np.mod(np.vstack([clustered, diffuse]), box_size).astype(np.float32)

    return ParticleCloud(
        positions=positions, box_size=box_size,
        note=f"{max_particles:,} synthetic points, {n_clusters} illustrative clusters",
    )


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
    return {
        "positions": data[:, 0:3],
        "radius": data[:, 4],
        "density_contrast": data[:, 8],
    }


def get_void_catalog(suite, set_name, realization, fetch_public: bool = False) -> VoidCatalog:
    if fetch_public:
        real = _fetch_public_vide_catalog(suite, set_name, realization)
        if real is not None:
            return VoidCatalog(
                positions=real["positions"], radius=real["radius"],
                density_contrast=real["density_contrast"], box_size=25.0,
                source="real",
                note=(f"z = 0.00 (only redshift VIDE_Voids publishes) - public CAMELS data release "
                      f"(VIDE_Voids/{suite}/{VIDE_SUITE_PREFIX[suite]}_LH_{realization}_ss1.0, "
                      f"{real['radius'].shape[0]} voids, VIDE watershed void finder, LH set only)"),
            )

    # Synthetic fallback: a handful of non-overlapping-ish spheres with a
    # radius/density-contrast range roughly matching the real catalog.
    rng = np.random.default_rng(_seed(suite, set_name, realization, "voids"))
    box_size = 25.0
    n_voids = int(rng.integers(5, 15))
    positions = rng.uniform(0, box_size, size=(n_voids, 3))
    radius = rng.uniform(2.5, 10.0, size=n_voids)
    density_contrast = rng.uniform(1.0, 2.5, size=n_voids)
    return VoidCatalog(
        positions=positions, radius=radius, density_contrast=density_contrast, box_size=box_size,
        note=f"{n_voids} synthetic voids (illustrative)",
    )


# ---------------------------------------------------------------------------
# 2D field map  (real: CMD's public 2D maps - the single most common CAMELS
# ML workflow in practice, per community usage research)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=32)
def _fetch_public_cmd_map(suite, set_name, realization, field=DEFAULT_CMD_FIELD):
    """Real 2D field map (256x256) from CMD's public 2D maps. Only z=0.00
    is published for this data source (unlike the 3D grids' 5 redshifts).
    Returns the map array, or None if unavailable."""
    if suite not in PUBLIC_CMD_MAP_SUITES or field not in CMD_FIELDS:
        return None
    folder = CMD_MAP_SUITE_FOLDER[suite]
    url = f"{CMD_2D_MAPS_URL}/{folder}/Maps_{field}_{folder}_{set_name}_z=0.00.npy"
    return _fetch_npy_stack_slice(url, realization)


def get_field_map_2d(suite, set_name, realization, field=DEFAULT_CMD_FIELD,
                      fetch_public: bool = False) -> Map2D:
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

    # Synthetic fallback: 2D analogue of the 3D density field's white-noise
    # -> shaped-Pk -> lognormal recipe, so the same suite/realization looks
    # like a plausible slice of the same structure the 3D view would show.
    rng = np.random.default_rng(_seed(suite, set_name, realization, "map2d"))
    grid = 256
    box_size = 25.0
    white = rng.normal(size=(grid, grid))
    field_k = np.fft.rfft2(white)
    kfreq = np.fft.fftfreq(grid) * grid
    kfreq_x = np.fft.rfftfreq(grid) * grid
    kx, ky = np.meshgrid(kfreq, kfreq_x, indexing="ij")
    kmag = np.sqrt(kx**2 + ky**2)
    kmag[0, 0] = 1.0
    Pk_shape = (kmag ** 0.96) / (1 + (kmag / 2.0) ** 3.9)
    field_k *= np.sqrt(Pk_shape)
    real_field = np.fft.irfft2(field_k, s=(grid, grid))
    real_field = (real_field - real_field.mean()) / real_field.std()
    values = np.exp(1.1 * real_field - 0.5 * 1.1**2)

    return Map2D(
        values=values, box_size=box_size,
        note=f"illustrative overdensity map (synthetic), {CMD_FIELDS[field]}",
    )


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


def _parse_indexed_header(header_line):
    """Parse a '#name0(0) name1(1) ...' style header (the AHF/Rockstar
    convention) into a plain list of column names, stripping each token's
    trailing '(N)' index."""
    tokens = header_line.lstrip("#").split()
    return [re.sub(r"\(\d+\)$", "", tok) for tok in tokens]


@lru_cache(maxsize=16)
def _fetch_ahf_halos(suite, set_name, realization):
    """Real AHF halo catalog. The exact filename encodes AHF's own computed
    redshift to 3 decimals (confirmed real - e.g. "z5.994" for snap000, not
    exactly our SNAPSHOT_REDSHIFTS table's 6.00), so it's discovered via a
    real directory listing + regex, never constructed. Small file (1-4MB),
    fetched whole - no need for range requests at this size."""
    if suite not in PUBLIC_AHF_SUITES:
        return None

    dir_url = f"{PUBLIC_DATA_URL}/AHF/{suite}/{set_name}/{set_name}_{realization}/AHF/"
    try:
        req = urllib.request.Request(dir_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            listing_html = resp.read().decode(errors="replace")
        matches = re.findall(rf'snap{AHF_SNAPNUM:03d}[^"<>\s]*\.AHF_halos', listing_html)
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
    frame = frame[frame["Halo Mass [Msun/h]"] > 0].reset_index(drop=True)
    if len(frame) == 0:
        return None
    return Catalog(
        frame=frame, box_size=25.0, redshift=float(z_str),
        note=(f"z = {z_str} (AHF's own computed redshift for its highest snapshot) - public "
              f"CAMELS data release (AHF/{suite}/{set_name}_{realization}/AHF/{matches[0]}, "
              f"{len(frame)} halos)"),
    )


@lru_cache(maxsize=16)
def _fetch_rockstar_halos(suite, set_name, realization):
    """Real Rockstar halo catalog at z=0. Scale factor a=1.0 is exact by
    definition there, so the filename is constructed directly - unlike AHF,
    no directory listing needed."""
    if suite not in PUBLIC_ROCKSTAR_SUITES:
        return None

    url = (f"{PUBLIC_DATA_URL}/Rockstar/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"hlists/{ROCKSTAR_HLIST_Z0}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
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
        "Halo Mass [Msun/h]": df["Mvir"],
        "Stellar Mass [Msun/h]": df["SM"],
        "Gas Mass [Msun/h]": df["Gas"],
        "BH Mass [Msun/h]": df["BH_Mass"],
        "Vmax [km/s]": df["vmax"],
        "x [Mpc/h]": df["x"], "y [Mpc/h]": df["y"], "z [Mpc/h]": df["z"],
        "Type": df["Type"],  # 0 = central, 1 = satellite (consistent-trees convention)
    })
    frame = frame[frame["Halo Mass [Msun/h]"] > 0].reset_index(drop=True)
    if len(frame) == 0:
        return None
    return Catalog(
        frame=frame, box_size=25.0, redshift=0.0,
        note=(f"z = 0.00 (scale factor a=1.0) - public CAMELS data release "
              f"(Rockstar/{suite}/L25n256/{set_name}_{realization}/hlists/{ROCKSTAR_HLIST_Z0}, "
              f"{len(frame)} halos)"),
    )


@lru_cache(maxsize=16)
def _fetch_caesar_halos(suite, set_name, realization):
    """Real CAESAR halo catalog. Masses/positions live in a flattened
    dict-of-dicts HDF5 layout (e.g. dataset name "masses.total", not a
    nested group) - confirmed via a real lazy read before assuming the
    schema, not from docs."""
    if not HAVE_CAMELS_LIBRARY or suite not in PUBLIC_CAESAR_SUITES:
        return None

    url = (f"{PUBLIC_DATA_URL}/Caesar/{suite}/L25n256/{set_name}/{set_name}_{realization}/"
           f"caesar_newsnaps_{CAESAR_SNAPNUM:03d}.hdf5")
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
    except Exception:
        return None

    frame = frame[frame["Halo Mass [Msun]"] > 0].reset_index(drop=True)
    if len(frame) == 0:
        return None
    return Catalog(
        frame=frame, box_size=box_size, redshift=redshift,
        note=(f"z = {redshift:.2f} - public CAMELS data release (Caesar/{suite}/L25n256/"
              f"{set_name}_{realization}/caesar_newsnaps_{CAESAR_SNAPNUM:03d}.hdf5, "
              f"{len(frame)} halos)"),
    )


def get_alt_halo_catalog(finder, suite, set_name, realization, fetch_public: bool = False) -> Catalog | None:
    """Real halo catalog from an alternate finder (AHF/Rockstar/CAESAR), as a
    browsable table alongside the Subfind-based Catalog Browser. No synthetic
    version - same reasoning as get_halo_catalog()."""
    if not fetch_public:
        return None
    if finder == "AHF":
        return _fetch_ahf_halos(suite, set_name, realization)
    if finder == "Rockstar":
        return _fetch_rockstar_halos(suite, set_name, realization)
    if finder == "CAESAR":
        return _fetch_caesar_halos(suite, set_name, realization)
    return None


@lru_cache(maxsize=8)
def _fetch_sublink_tree(suite, set_name, realization):
    """Real SubLink merger tree for one whole realization (a single flat
    compound-dtype array covering every subhalo at every snapshot - no
    per-halo range request is possible, so this fetches ~50-70MB once per
    realization; cached so repeated subhalo lookups within it are free).
    Returns (tree_array, id_to_row_dict) or None."""
    if suite not in PUBLIC_SUBLINK_SUITES:
        return None

    url = f"{PUBLIC_DATA_URL}/SubLink/{suite}/{set_name}/{set_name}_{realization}/tree.hdf5"
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                tree = hf["Tree"][:]
    except Exception:
        return None

    id_to_row = {int(sid): i for i, sid in enumerate(tree["SubhaloID"])}
    return tree, id_to_row


def get_merger_history(suite, set_name, realization, subfind_id, fetch_public: bool = False):
    """Real main-branch mass accretion history for one z=0 subhalo, walking
    FirstProgenitorID backward through the SubLink tree. No synthetic
    version - same reasoning as get_halo_catalog()."""
    if not fetch_public or not HAVE_CAMELS_LIBRARY:
        return None
    fetched = _fetch_sublink_tree(suite, set_name, realization)
    if fetched is None:
        return None
    tree, id_to_row = fetched

    root_mask = (tree["SnapNum"] == SUBLINK_Z0_SNAPNUM) & (tree["SubfindID"] == subfind_id)
    root_rows = np.nonzero(root_mask)[0]
    if len(root_rows) == 0:
        return None

    row = int(root_rows[0])
    snaps, masses = [], []
    seen = set()
    while row is not None and row not in seen:
        seen.add(row)
        snaps.append(int(tree["SnapNum"][row]))
        masses.append(float(tree["Mass"][row]) * 1e10)
        fp_id = int(tree["FirstProgenitorID"][row])
        row = id_to_row.get(fp_id) if fp_id != -1 else None

    redshifts = np.array([SNAPSHOT_REDSHIFTS[s] for s in snaps])
    return MergerHistory(
        redshift=redshifts, mass=np.array(masses), subfind_id=subfind_id,
        note=(f"Main-branch mass history for z=0 SubfindID {subfind_id}, {len(snaps)} "
              f"snapshots back to z={redshifts.max():.2f} - public CAMELS data release "
              f"(SubLink/{suite}/{set_name}_{realization}/tree.hdf5, following "
              f"FirstProgenitorID)"),
    )


@lru_cache(maxsize=16)
def _fetch_halo_profiles_file(suite, set_name, realization, snapnum):
    """Real precomputed SO/CGM radial profiles for one snapshot (illstack_
    CAMELS). Small file (<1MB), fetched whole. Returns the raw arrays
    (still in the file's native code units - see get_halo_profiles for the
    documented conversion) or None."""
    if not HAVE_CAMELS_LIBRARY or suite not in PUBLIC_PROFILES_SUITES or set_name not in PUBLIC_PROFILES_SETS:
        return None

    url = (f"{PUBLIC_DATA_URL}/Profiles/{suite}/{set_name}/{set_name}_{realization}/"
           f"{suite}_{set_name}_{realization}_{snapnum:03d}.hdf5")
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                r_raw = hf["r"][:]
                profiles = hf["Profiles"][:]           # (4, n_halos, 25)
                m200c_raw = hf["Group_M_Crit200"][:]   # 1e10 Msun/h
    except Exception:
        return None
    return r_raw, profiles, m200c_raw


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
    r_raw, profiles, m200c_raw = fetched

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
    if field == "Gas Density":
        values, units = raw_vals * density_conv, "g/cm^3"
    elif field == "Thermal Pressure":
        values, units = raw_vals * pressure_conv, "keV/cm^3"
    elif field == "Temperature":
        values, units = raw_vals * temp_conv_to_keV * K_per_keV, "K"
    else:
        values, units = raw_vals, "mass fraction"

    return HaloProfiles(
        r=r, values=values, log_mass=np.log10(m200c[valid]), field=field, units=units,
        note=(f"z = {z:.2f} - public CAMELS data release (Profiles/{suite}/{set_name}/"
              f"{set_name}_{realization}/{suite}_{set_name}_{realization}_{snapnum:03d}.hdf5, "
              f"{int(valid.sum())} halos, illstack_CAMELS SO/CGM profiles)"),
    )


@lru_cache(maxsize=16)
def _fetch_photometry_bands(suite, set_name, realization):
    """Real per-subhalo SDSS-band luminosities (BC03 model, dust-attenuated)
    at z=0, plus the SubhaloIndex needed to cross-match with the Subfind
    catalog. Fetched lazily - the file is 40-250MB, but only the small
    per-band arrays we need are actually read, not the whole file."""
    if not HAVE_CAMELS_LIBRARY or suite not in PUBLIC_PHOTOMETRY_SUITES:
        return None

    file_suite = PHOTOMETRY_SUITE_FILENAME.get(suite, suite)
    url = (f"{PUBLIC_DATA_URL}/Photometry/{suite}/L25n256/{set_name}/"
           f"{file_suite}_{set_name}_{realization}_photometry.hdf5")
    snap_key = f"snap_{PHOTOMETRY_SNAPNUM:03d}"
    try:
        with fsspec.open(url, "rb") as fobj:
            with h5py.File(fobj, "r") as hf:
                if snap_key not in hf:
                    return None
                g = hf[snap_key]
                sub_idx = g["SubhaloIndex"][:]
                att = g["BC03/photometry/luminosity/attenuated/SLOAN"]
                bands = {name: att[name][:] for name in att.keys()}
    except Exception:
        return None
    return sub_idx, bands


def get_color_mass_diagram(suite, set_name, realization, color: str, fetch_public: bool = False):
    """Real galaxy color (e.g. g-r) vs. real stellar mass, cross-matching
    the Photometry catalog with the Subfind catalog via SubhaloIndex. No
    synthetic version - same reasoning as get_halo_catalog()."""
    if not fetch_public or color not in PHOTOMETRY_COLORS:
        return None
    fetched = _fetch_photometry_bands(suite, set_name, realization)
    if fetched is None:
        return None
    sub_idx, bands = fetched

    subfind = _fetch_public_subfind(suite, set_name, realization)
    if subfind is None:
        return None
    mstar_all = subfind["subhalo_stellar_mass"]  # already Msun/h

    b1, b2 = PHOTOMETRY_COLORS[color]
    if b1 not in bands or b2 not in bands:
        return None
    in_range = sub_idx < len(mstar_all)
    sub_idx, L1, L2 = sub_idx[in_range], bands[b1][in_range], bands[b2][in_range]

    with np.errstate(divide="ignore", invalid="ignore"):
        color_vals = -2.5 * np.log10(L1 / L2)
    mstar = mstar_all[sub_idx]
    mask = (mstar > 0) & np.isfinite(color_vals)
    if mask.sum() == 0:
        return None

    return ColorMassDiagram(
        color=color_vals[mask], log_mass=np.log10(mstar[mask]), color_label=color,
        note=(f"z = 0.00 - public CAMELS data release (Photometry/{suite}/L25n256/{set_name}/"
              f"{suite}_{set_name}_{realization}_photometry.hdf5, BC03 model, dust-attenuated, "
              f"{int(mask.sum())} galaxies cross-matched with the Subfind catalog via SubhaloIndex)"),
    )


@lru_cache(maxsize=32)
def _fetch_bispectrum(suite, set_name, realization, bk_type):
    """Real low-k (FFT-based) equilateral bispectrum, real-space, z=0.00.
    Small file (~37KB), fetched whole. Returns (k [h/Mpc], Bk [(Mpc/h)^6])
    sorted by k, or None."""
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
    bk = data[equal, 2 + BK_EQUILATERAL_MU_INDEX]
    order = np.argsort(k)
    return k[order], bk[order]


def get_bispectrum(suite, set_name, realization, field, fetch_public: bool = False) -> Result | None:
    """Real equilateral-configuration matter/gas/dark-matter bispectrum. No
    synthetic version - a fabricated bispectrum shape isn't a useful
    illustrative stand-in the way a power-law Pk/HMF curve is, so this
    returns None outright when real data isn't available."""
    if not fetch_public or field not in BK_TYPES:
        return None
    fetched = _fetch_bispectrum(suite, set_name, realization, BK_TYPES[field])
    if fetched is None:
        return None
    k, bk = fetched
    return Result(
        x=k, y=bk, x_label="k [h/Mpc]", y_label="B(k,k,k) [(Mpc/h)^6]",
        source="real",
        note=(f"z = 0.00, real-space, equilateral configuration (k1=k2=k3) - public CAMELS "
              f"data release (Bk/{suite}/{set_name}/{set_name}_{realization}/"
              f"Bk_{BK_TYPES[field]}_lowk_z=0.00.txt, low-k FFT-based estimator, {field})"),
    )


@lru_cache(maxsize=16)
def _fetch_pdf_array(suite, field, grid, redshift):
    """Real (1000, 500) histogram-count array - every LH realization's CMD
    grid pixel-value histogram for one field, in a single small (~4MB)
    file. Returns the raw int array or None."""
    if not HAVE_CAMELS_LIBRARY or suite not in PUBLIC_PDF_SUITES:
        return None
    if field not in CMD_FIELDS or grid not in PUBLIC_PDF_GRIDS:
        return None

    url = f"{PUBLIC_DATA_URL}/PDF/hist_Grids_{field}_{suite}_LH_{grid}_z={redshift:.1f}.npy"
    try:
        with fsspec.open(url, "rb") as fobj:
            data = np.load(fobj)
    except Exception:
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


def get_lya_spectrum(suite, set_name, realization, snapnum, sightline,
                      fetch_public: bool = False) -> LymanAlphaSpectrum | None:
    """Real Lyman-alpha transmission spectrum for one of 5000 sightlines at
    one snapshot. No synthetic version - a fabricated absorption spectrum
    isn't a useful illustrative stand-in the way a power-law curve is."""
    if not fetch_public or not HAVE_CAMELS_LIBRARY or suite not in PUBLIC_LYA_SUITES:
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
                z = float(hf["Header"].attrs["redshift"])
    except Exception:
        return None

    flux = np.exp(-tau)
    return LymanAlphaSpectrum(
        pixel=np.arange(len(flux)), flux=flux, sightline=sightline,
        note=(f"z = {z:.2f} - public CAMELS data release (Lya/{suite}/{set_name}/"
              f"{set_name}_{realization}/SPECTRA_{snapnum:03d}/Lya-spectra.hdf5, sightline "
              f"{sightline} of {LYA_N_SIGHTLINES}, hydrogen Ly-alpha 1215A optical depth). "
              f"x-axis is the raw spectral pixel index - no velocity/wavelength calibration "
              f"is applied (fake_spectra's own dv isn't safely re-derivable from the file's "
              f"stored header alone)."),
    )
