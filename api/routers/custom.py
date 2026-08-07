"""Real cross-realization queries for the Add Plot modal's "Custom" tab -
proxies Flatiron's own live FlatHUB API (flathub.flatironinstitute.org),
not backend.py's per-realization file fetchers. See flathub_client.py's
module docstring for why: this is Flatiron's own indexed query engine for
the identical public CAMELS Subfind catalog, and building/maintaining an
equivalent index ourselves would be real new infrastructure this app
doesn't otherwise need.

Filters/fields here are always real, human-readable names and values
(e.g. simulation_suite="IllustrisTNG", type="Subhalo") - never FlatHUB's
internal enum-index/boolean encoding, which is an implementation detail
`_encode_filters` hides from every caller.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

import flathub_client as F

router = APIRouter(prefix="/custom", tags=["custom"])
logger = logging.getLogger(__name__)

# Real fix (2026-08-06, code-quality audit): every FlathubError below used
# to be re-raised as `HTTPException(502, f"FlatHUB query failed: {e}")` -
# `str(FlathubError)` wraps the raw underlying exception (urllib/timeout
# error text, which can include internal detail like hostnames/paths), put
# directly into the client-facing response body. Now logged server-side
# (the real detail stays reachable there) and returned to the client as one
# fixed, generic message - the client never needed more than "the query
# failed, here's the real row/data endpoint that failed" to react
# correctly (e.g. show a retry).
_FLATHUB_ERROR_DETAIL = "FlatHUB query failed - the external FlatHUB API may be unreachable or slow. Try again in a moment."


def _encode_filters(filters: dict) -> dict:
    """Translate real field names/values into FlatHUB's own wire encoding -
    enum fields as their integer index (or bool, for the one field whose
    dtype is boolean - see flathub_client.enum_index) - range/value filters
    otherwise pass through unchanged. Keeps every real field name/value
    this router accepts human-readable; the index/bool encoding is purely
    an implementation detail of the proxied API."""
    schema = {f["name"]: f for f in F.real_fields()}
    out = {}
    for key, value in filters.items():
        if key in ("sample", "seed"):
            out[key] = value
            continue
        field = schema.get(key)
        if field is None:
            raise HTTPException(400, f"Unknown field: {key!r}")
        if "enum" in field and isinstance(value, str):
            out[key] = F.enum_index(key, value)
        elif "enum" in field and isinstance(value, list):
            out[key] = [F.enum_index(key, v) for v in value]
        else:
            out[key] = value
    return out


def _parse_json_query(raw: Optional[str], param_name: str):
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except ValueError as e:
        raise HTTPException(400, f"{param_name} must be valid JSON") from e


@router.get("/fields")
def custom_fields():
    """Every real, queryable field for the CAMELS catalog, flattened to
    leaf-level names (Group_CM_x, params_Omega_m, etc.) - Group_*,
    Subhalo_*, params_*, plus simulation_suite/simulation_set/snapshot/
    redshift/type/id - with real descriptions, units, and live min/max/avg
    stats where available. Powers the X/Y/Color axis pickers, which need
    flat leaf fields, not groups."""
    return F.real_fields()


@router.get("/field-tree")
def custom_field_tree():
    """The same real fields as `/fields`, but NOT flattened - real nested
    groups preserved (Group.CM.x/y/z, Group.MassType.gas/dm/tracers/stars/
    bh, params.Omega_m/sigma_8/..., etc.), exactly as FlatHUB's own live
    schema nests them. Powers the Custom tab's browsable Filters tree
    ("+ Add" per leaf field) - a flat list can't represent that a field is
    part of a group without inventing grouping logic client-side that the
    live schema already gives us for free."""
    return F.catalog_schema()["fields"]


@router.get("/count")
def custom_count(filters: Optional[str] = Query(default=None)):
    """Real row count matching `filters` (a JSON object of real field
    name -> value/range, same shape `data`/`histogram` take)."""
    parsed = _parse_json_query(filters, "filters") or {}
    try:
        return F.count(_encode_filters(parsed))
    except F.FlathubError as e:
        logger.exception("FlatHUB /count query failed for filters=%r", parsed)
        raise HTTPException(502, _FLATHUB_ERROR_DETAIL) from e


@router.get("/data")
def custom_data(
    fields: str = Query(..., description="Comma-separated real field names"),
    filters: Optional[str] = Query(default=None),
    limit: int = Query(default=2000, le=10_000),
):
    """Real matching rows (as JSON objects) for the given real field names,
    optionally filtered. Powers Scatterplot/3D Scatterplot - a plot needs
    raw rows, not pre-binned buckets."""
    parsed = _parse_json_query(filters, "filters") or {}
    field_list = [f.strip() for f in fields.split(",") if f.strip()]
    # Real fix (2026-08-06, code-quality audit): `fields` used to pass
    # straight through to FlatHUB unvalidated, unlike `filters` (whose keys
    # `_encode_filters` already checks against the real schema, 400ing on
    # an unknown one). Same check here, for the same reason - a typo'd
    # field name gets a clear 400 from this proxy instead of whatever
    # FlatHUB's own error shape happens to be for it.
    known_names = {f["name"] for f in F.real_fields()}
    unknown = [f for f in field_list if f not in known_names]
    if unknown:
        raise HTTPException(400, f"Unknown field(s): {unknown!r}")
    try:
        return F.data(field_list, _encode_filters(parsed), limit=limit)
    except F.FlathubError as e:
        logger.exception("FlatHUB /data query failed for fields=%r filters=%r", field_list, parsed)
        raise HTTPException(502, _FLATHUB_ERROR_DETAIL) from e


@router.get("/histogram")
def custom_histogram(
    fields: str = Query(..., description='JSON list of {"field","size","log"}'),
    filters: Optional[str] = Query(default=None),
    quartiles: Optional[str] = Query(default=None),
):
    """Real binned data. Powers three of the five chart types:
    - Histogram: one field.
    - Heatmap: two fields (FlatHUB's histogram natively supports N-D
      binning - two fields is a 2D bucket grid).
    - Box Plot: one bucketing field + `quartiles` naming the field to
      compute per-bucket quartiles of - exactly a box-plot-per-bucket."""
    field_list = _parse_json_query(fields, "fields")
    if not isinstance(field_list, list):
        raise HTTPException(400, "fields must be a JSON list")
    parsed_filters = _parse_json_query(filters, "filters") or {}
    try:
        return F.histogram(field_list, _encode_filters(parsed_filters), quartiles=quartiles)
    except F.FlathubError as e:
        logger.exception("FlatHUB /histogram query failed for fields=%r filters=%r", field_list, parsed_filters)
        raise HTTPException(502, _FLATHUB_ERROR_DETAIL) from e
