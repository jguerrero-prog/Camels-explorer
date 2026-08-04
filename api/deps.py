"""Shared helpers used by every router."""

from fastapi import HTTPException


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
