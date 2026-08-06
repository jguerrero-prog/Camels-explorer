"""Shared helpers used by every router."""

from fastapi import HTTPException

import backend as B


def resolved_set_name(suite: str, set_name: str) -> str:
    """FastAPI dependency: resolves the UI-facing "SB" set name into its
    real per-suite folder (see backend.py's own resolve_set_name) before
    any router passes it to backend.py. Declared as a dependency (not a
    plain call inside each endpoint) so every endpoint gets this for free
    just by typing its `set_name` param as `= Depends(resolved_set_name)` -
    FastAPI resolves `suite`/`set_name` from the same request's query
    params to call this, matched by name, the same way `app.py` resolves
    the real folder once at the top of its own sidebar rather than
    per-statistic."""
    return B.resolve_set_name(suite, set_name)


def require(value):
    """backend.py returns None to mean 'no real data for this selection' -
    not an error, an expected outcome (unsupported suite/set, ungenerated
    product, etc. - see backend.py's own real-vs-synthetic discipline).
    HTTP 404 is the right status for that: the resource genuinely doesn't
    exist for these params. Raise here so every router gets identical,
    correct behavior instead of each one re-deciding what "no data" means.
    """
    if value is None:
        raise HTTPException(status_code=404, detail="No data available for this selection.")
    return value
