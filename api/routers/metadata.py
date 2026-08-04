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
    }
