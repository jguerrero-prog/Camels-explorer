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
# suite in `suites` is real for it (Power Spectrum, Halo/Stellar Mass
# Function, Baryon Fraction, Galaxy Scaling Relations, 2D Field Map, and
# Color-Mass Diagram all happen to cover all 4) - absent, not a guessed
# "all suites" list, so this can never silently drift if a 5th suite is
# ever added to _PRIMARY_SUITES.
_STATISTIC_SUITES = {
    "SFR History": B.PUBLIC_SFRH_SUITES,
    "3D Density Field": B.PUBLIC_CMD_GRID_SUITES,  # == PUBLIC_SIMS_SUITES, its raw-snapshot fallback
    "3D Particle Cloud": B.PUBLIC_SIMS_SUITES,
    "X-ray Halo Profiles": B.PUBLIC_XRAY_SUITES,
    "Halo Gas Profiles": B.PUBLIC_PROFILES_SUITES,
    "Bispectrum": B.PUBLIC_BK_SUITES,
    "Field PDF": B.PUBLIC_PDF_SUITES,
    "Lyman-alpha Spectrum": B.PUBLIC_LYA_SUITES,
}

# Per-statistic real SET coverage, for the two statistics whose real gate
# is narrower than "any set" (see backend.py's own `set_name != "LH"` /
# `set_name not in PUBLIC_PROFILES_SETS` checks). Absent means every set in
# `sets` (plus SB/1P where those already resolve) is real for it.
_STATISTIC_SETS = {
    "Bispectrum": ["LH"],
    "Halo Gas Profiles": [s for s in B.SET_REALIZATIONS if s in B.PUBLIC_PROFILES_SETS],
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
        "statistic_suites": {
            statistic: [s for s in B.SUITES if s in allowed]
            for statistic, allowed in _STATISTIC_SUITES.items()
        },
        "statistic_sets": _STATISTIC_SETS,
        "sfrh_symbolic_model": {
            "fiducial": B.SFRHSymbolicModel.FIDUCIAL,
            "om_range": B.SFRHSymbolicModel.OM_RANGE,
            "s8_range": B.SFRHSymbolicModel.S8_RANGE,
            "a1_range": B.SFRHSymbolicModel.A1_RANGE,
            "a3_range": B.SFRHSymbolicModel.A3_RANGE,
        },
    }
