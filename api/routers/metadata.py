"""Real catalog metadata for UI pickers (suite/set/statistic lists) - not
plot data. Every value here is read directly from backend.py's own
constants, so this endpoint can never drift out of sync with what the
other routers actually support.
"""

from __future__ import annotations

from fastapi import APIRouter

import backend as B

router = APIRouter(tags=["metadata"])

# The "4 suites" figure quoted throughout the app (see CanvasStatsRow) -
# PUBLIC_PK_SUITES and PUBLIC_SUBFIND_SUITES are identical sets in
# backend.py; either would do, PK is used here as the more fundamental
# product. Filtering SUITES (not just listing the set directly) preserves
# backend.py's own suite ordering instead of Python set iteration order.
_PRIMARY_SUITES = [s for s in B.SUITES if s in B.PUBLIC_PK_SUITES]

# Real, short descriptions transcribed from SET_REALIZATIONS's own comments
# in backend.py - not reworded or invented here.
_SET_DESCRIPTIONS = {
    "LH": "Latin Hypercube: varied cosmology + astrophysics",
    "CV": "Cosmic Variance: fixed params, varied initial phases",
    "1P": "One-parameter-at-a-time",
    "EX": "Extreme",
    "BE": "Butterfly Effect: fixed ICs/cosmology/astrophysics, varied evolution seed",
}
# Middle dot, not an em dash - matches the app's own existing separator
# convention (ParamsSidebar's "PANEL 1 · FOCUSED"), and per direct user
# feedback (2026-08-04): an em dash here read as "AI generated."
_SET_LABELS = {
    "LH": "LH · Latin Hypercube",
    "CV": "CV · Cosmic Variance",
    "1P": "1P · One-Parameter",
    "EX": "EX · Extreme",
    "BE": "BE · Butterfly Effect",
}

# Per-statistic real suite coverage, read directly from backend.py's own
# PUBLIC_*_SUITES gates (the same sets those functions already check before
# attempting a real fetch) - added 2026-08-05 so the frontend can prune its
# Suite dropdowns to only what's real, instead of letting a user configure
# a combination that can only ever show "No data available" (removing
# synthetic fallback made that outcome common enough to be worth
# preventing, not just disclosing). A statistic missing here means every
# suite in `suites` is real for it (Stellar Mass Function, Baryon Fraction,
# Galaxy Scaling Relations, 2D Field Map, and Color-Mass Diagram all happen
# to cover all 4 - deliberately NOT widened to the _DM suites added
# 2026-08-07, since baryonic quantities are physically undefined for a
# DM-only run, see backend.py's own guards in those 3 functions) - absent,
# not a guessed "all suites" list, so this can never silently drift if a
# 5th suite is ever added to _PRIMARY_SUITES.
#
# Power Spectrum and Halo Mass Function are explicitly widened past
# _PRIMARY_SUITES here (2026-08-07, issue #15) - both are real and
# physically meaningful for a DM-only run (there's still a real matter
# power spectrum / halo mass function with no baryons), unlike the 3
# statistics above that stay at the default 4. Note this is genuinely
# wider than `suites`, not narrower - `SingleRealizationFields`'s own
# suiteOptions filter is `catalog.suites ∩ allowedSuites`, so widening
# _PRIMARY_SUITES itself would have been the wrong lever (it would have
# silently offered _DM suites to every *other* unrestricted statistic
# too) - this list is deliberately its own literal, not derived from
# _PRIMARY_SUITES, precisely so it can include suites the default doesn't.
_STATISTIC_SUITES = {
    "SFR History": B.PUBLIC_SFRH_SUITES,
    "3D Density Field": B.PUBLIC_CMD_GRID_SUITES,  # == PUBLIC_SIMS_SUITES pre-2026-08-07 - now
                                                    # a deliberately separate literal, see its own comment
    "3D Particle Cloud": B.PUBLIC_SIMS_SUITES,
    "X-ray Halo Profiles": B.PUBLIC_XRAY_SUITES,
    "X-ray Photon Spectrum": B.PUBLIC_XRAY_SUITES,
    "Halo Gas Profiles": B.PUBLIC_PROFILES_SUITES,
    "Bispectrum": B.PUBLIC_BK_SUITES,
    "Field PDF": B.PUBLIC_PDF_SUITES,
    "Lyman-alpha Spectrum": B.PUBLIC_LYA_SUITES,
    "Power Spectrum": B.PUBLIC_PK_SUITES,
    "Halo Mass Function": B.PUBLIC_SUBFIND_SUITES,
    "Spread Metric": B.PUBLIC_SPREAD_METRIC_SUITES,
    "Group Matching": B.PUBLIC_GROUP_MATCHING_SUITES,
    "AHF Radial Profiles": B.PUBLIC_AHF_SUITES,
}

# Per-statistic real SET coverage that varies BY SUITE (2026-08-08, issue
# #30) - Spread Metric's real set coverage genuinely differs per suite
# (SIMBA has no real 1P here; Astrid does) in a way `_STATISTIC_SETS`
# below can't express (one flat list, suite-independent). A statistic
# missing here has no such per-suite variation - `_STATISTIC_SETS`/no
# restriction at all still applies uniformly across its allowed suites.
_STATISTIC_SETS_FOR_SUITE = {
    "Spread Metric": {suite: sorted(sets) for suite, sets in B.PUBLIC_SPREAD_METRIC_SETS.items()},
    # Real (2026-08-08, issue #51): SIMBA's own real collated X-ray file has
    # no EX entries at all - a genuine per-suite asymmetry, not a fetch gap.
    "X-ray Halo Profiles": {suite: sorted(sets) for suite, sets in B.PUBLIC_XRAY_PROFILES_SETS.items()},
}

# Per-statistic real SET coverage, for the two statistics whose real gate
# is narrower than "any set" (see backend.py's own `set_name != "LH"` /
# `set_name not in PUBLIC_PROFILES_SETS` checks). Absent means every set in
# `sets` (plus SB/1P where those already resolve) is real for it.
_STATISTIC_SETS = {
    "Bispectrum": ["LH"],
    "Halo Gas Profiles": [s for s in B.SET_REALIZATIONS if s in B.PUBLIC_PROFILES_SETS],
    # Real (2026-08-07, issue #18): 1P's real X-ray SIMPUT folder uses the
    # *legacy* "1P_{1..6}_{n5..5}" naming (no "p", 6 params), same as AHF/
    # Halo Gas Profiles/Lyman-alpha - none of which this app wires up for
    # 1P yet, and not resolved here either. See backend.py's own
    # PUBLIC_XRAY_SIMPUT_SETS comment.
    "X-ray Photon Spectrum": [s for s in B.SET_REALIZATIONS if s in B.PUBLIC_XRAY_SIMPUT_SETS],
    # Real (2026-08-08, issue #29): LH only for now - CV (cross-suite, same
    # ICs at a fixed realization) and 1P (its own folder-naming shim) are
    # real but deliberately deferred, see backend.py's own module comment.
    "Group Matching": [s for s in B.SET_REALIZATIONS if s in B.PUBLIC_GROUP_MATCHING_SETS],
    # Real (2026-08-08, issue #25): LH only for now - only LH_0 has been
    # directly verified against the real .AHF_profiles/nbins join (see
    # backend.py's own module comment). AHF's own directory structure would
    # likely accept other sets too, but that's untested, not confirmed.
    "AHF Radial Profiles": ["LH"],
}


@router.get("/metadata")
def metadata():
    return {
        "suites": _PRIMARY_SUITES,
        "sets": [
            {
                "name": name,
                "label": _SET_LABELS[name],
                "realizations": count,
                "description": _SET_DESCRIPTIONS[name],
            }
            for name, count in B.SET_REALIZATIONS.items()
        ] + [
            {
                "name": "SB",
                "label": "SB · Sobol Sequence",
                # Unlike every other set, SB's realization count is per-
                # suite, not one flat number (see sb_realizations_for_suite
                # below) - null here, not a guess, so the frontend knows to
                # look there instead.
                "realizations": None,
                "description": "Sobol sequence: dense parameter-space sampling (IllustrisTNG/Astrid only)",
            },
        ],
        # SB's real per-suite folder name differs (IllustrisTNG "SB28",
        # Astrid "SB7") - resolved server-side (api/deps.py's
        # resolved_set_name) for any real fetch, but the frontend still
        # needs the real per-suite realization count itself to bound its
        # own Realization slider/compare-mode picker. A suite missing from
        # this map (SIMBA/Swift-EAGLE) has no real SB set at all.
        "sb_realizations_for_suite": B.SB_REALIZATIONS_FOR_SUITE,
        "statistics": B.STATISTICS,
        "n_snapshots": B.N_SNAPSHOTS,
        # Per-statistic real constants, added 2026-08-05 as each statistic's
        # own sidebar needed them - same "never drift out of sync" reason
        # suites/sets/statistics are read from backend.py above rather than
        # hardcoded a second time in the frontend.
        "bispectrum": {
            "fields": list(B.BK_TYPES.keys()),
            "mu_values": B.BK_MU_VALUES,
            "equilateral_mu_index": B.BK_EQUILATERAL_MU_INDEX,
        },
        "cmd_fields": [{"key": k, "label": v} for k, v in B.CMD_FIELDS.items()],
        "default_cmd_field": B.DEFAULT_CMD_FIELD,
        "profiles_fields": list(B.PROFILES_FIELD_INDEX.keys()),
        "photometry": {
            "sps_models": B.PHOTOMETRY_SPS_MODELS,
            "spectra_types": B.PHOTOMETRY_SPECTRA_TYPES,
            "filter_groups": {
                name: group["bands"] for name, group in B.PHOTOMETRY_FILTER_GROUPS.items()
            },
        },
        "pdf_grids": B.PUBLIC_PDF_GRIDS,
        "pdf_redshifts": B.PUBLIC_PDF_REDSHIFTS,
        "lya_n_sightlines": B.LYA_N_SIGHTLINES,
        # 1P (One-Parameter-at-a-time) picker constants - real folders are
        # named "1P_p{index}_{variation}", not "1P_{realization}" like every
        # other set, so the frontend needs these to build a parameter+
        # variation picker instead of a plain realization slider (mirrors
        # app.py's own onep_supported branch). Only IllustrisTNG's
        # parameters have real names (diffed from real output-file headers,
        # see backend.py); other suites in onep_max_index_for_suite get
        # generic "p{N}" labels.
        "onep_tng_params": [
            {"index": p["index"], "name": p["name"], "category": p["category"]}
            for p in B.ONEP_TNG_PARAMS
        ],
        "onep_max_index_for_suite": B.ONEP_MAX_INDEX_FOR_SUITE,
        "onep_tng_missing_variations": {
            str(index): sorted(variations)
            for index, variations in B.ONEP_TNG_MISSING_VARIATIONS.items()
        },
        # Real parameter NAMES for the *legacy* 1P scheme (issue #51's own
        # follow-up investigation - see backend.py's own
        # LEGACY_ONEP_PARAM_NAMES comment for the evidence) - suite-keyed
        # since the 4 astrophysical params' own letter prefix differs by
        # suite (A_/B_/C_).
        "legacy_onep_param_names": B.LEGACY_ONEP_PARAM_NAMES,
        # Real fix (2026-08-07, issue #15): this used to filter each
        # statistic's allowed suites through B.SUITES, which was always a
        # no-op for every pre-existing entry here (their PUBLIC_*_SUITES
        # were already correct, real subsets of the 4 hydro suites, all of
        # which are in B.SUITES) - but it silently capped every entry at
        # _PRIMARY_SUITES's own 4, which broke the moment Power Spectrum/
        # Halo Mass Function needed to offer the 4 new "_DM" suites too
        # (never added to B.SUITES, precisely so _PRIMARY_SUITES itself -
        # the *default* Suite dropdown every other statistic falls back to -
        # doesn't grow just because PUBLIC_PK_SUITES did). Each
        # `_STATISTIC_SUITES` entry is already the real, authoritative
        # suite list for that statistic; serializing it directly (sorted
        # for a deterministic order) is correct for both the narrowing
        # entries (SFR History, Bispectrum, etc.) and the new widening ones.
        "statistic_suites": {
            statistic: sorted(allowed)
            for statistic, allowed in _STATISTIC_SUITES.items()
        },
        "statistic_sets": _STATISTIC_SETS,
        "statistic_sets_for_suite": _STATISTIC_SETS_FOR_SUITE,
        "sfrh_symbolic_model": {
            "fiducial": B.SFRHSymbolicModel.FIDUCIAL,
            "om_range": B.SFRHSymbolicModel.OM_RANGE,
            "s8_range": B.SFRHSymbolicModel.S8_RANGE,
            "a1_range": B.SFRHSymbolicModel.A1_RANGE,
            "a3_range": B.SFRHSymbolicModel.A3_RANGE,
        },
    }
