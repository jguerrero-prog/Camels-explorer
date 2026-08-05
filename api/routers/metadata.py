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
}
# Middle dot, not an em dash - matches the app's own existing separator
# convention (ParamsSidebar's "PANEL 1 · FOCUSED"), and per direct user
# feedback (2026-08-04): an em dash here read as "AI generated."
_SET_LABELS = {
    "LH": "LH · Latin Hypercube",
    "CV": "CV · Cosmic Variance",
    "1P": "1P · One-Parameter",
    "EX": "EX · Extreme",
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
        ],
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
        "sfrh_symbolic_model": {
            "fiducial": B.SFRHSymbolicModel.FIDUCIAL,
            "om_range": B.SFRHSymbolicModel.OM_RANGE,
            "s8_range": B.SFRHSymbolicModel.S8_RANGE,
            "a1_range": B.SFRHSymbolicModel.A1_RANGE,
            "a3_range": B.SFRHSymbolicModel.A3_RANGE,
        },
    }
