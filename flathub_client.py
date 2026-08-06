"""
Thin client for Flatiron's own FlatHUB API (flathub.flatironinstitute.org),
scoped to the "camels" catalog. Query logic (Filters shape, enum-index
encoding) adapted from flatironinstitute/flathub's own py/flathub/client.py
(Apache License 2.0, github.com/flatironinstitute/flathub) - not a
line-for-line copy, but the same request shapes, verified directly against
the live API and its published OpenAPI spec.

FlatHUB is Flatiron's own live, indexed, cross-realization query engine for
this exact public CAMELS catalog - the same Subfind Group/Subhalo data
backend.py already reads for every other statistic, ingested once at
~2.9 billion rows. Confirmed 2026-08-05:
- Public, unauthenticated REST API (no auth header, no session needed).
- Formally documented via a real OpenAPI 3.0 spec at
  https://flathub.flatironinstitute.org/openapi.json (not reverse-engineered
  guesswork - the Filters/data/histogram schemas below match it exactly).
- Open source under Apache 2.0; its own ingest script reads the identical
  public CosmoAstroSeed_{suite}.txt per-realization parameter tables
  backend.py's params table reader would use.

This exists so CAMELS Studio's "Custom" tab can offer genuine
cross-realization queries (arbitrary Group/Subhalo field vs. field, filtered
by any field including cosmological/astrophysical params) without building
or maintaining a query index of our own. If Flatiron ever retires this
specific hosted instance, the worst case is re-hosting flathub's own (also
open source) ingest+Elasticsearch stack against the public HTTP mirror -
not losing the capability outright. See STUDIO_PLAN.md's FlatHUB section
for the full investigation this module is based on.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from functools import lru_cache

FLATHUB_ENDPOINT = "https://flathub.flatironinstitute.org/api/camels"


class FlathubError(Exception):
    """Raised on any FlatHUB request failure (network, timeout, 4xx/5xx,
    unparseable response) - callers turn this into a real 502/504, not a
    silent empty result, since a query genuinely failing is different from
    a query that legitimately matched zero rows."""


def _post(path: str, body: dict) -> object:
    url = f"{FLATHUB_ENDPOINT}/{path}"
    req = urllib.request.Request(
        url, method="POST",
        headers={"Content-Type": "application/json"},
        data=json.dumps(body).encode(),
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise FlathubError(str(e)) from e


def _get(path: str = "") -> object:
    url = f"{FLATHUB_ENDPOINT}/{path}" if path else FLATHUB_ENDPOINT
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return json.loads(resp.read())
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise FlathubError(str(e)) from e


@lru_cache(maxsize=1)
def catalog_schema() -> dict:
    """Real, live field schema for the CAMELS catalog (name/type/descr/
    units/enum per field, plus real per-enum row counts), fetched once from
    FlatHUB's own metadata endpoint rather than hardcoded - so this can
    never silently drift from what the live query API actually accepts.
    Cached for the process lifetime; the schema is effectively static
    (changes only if CAMELS re-ingests new data)."""
    return _get()


def _flatten_fields(fields: list[dict]) -> list[dict]:
    """Fields can nest (`sub`) for vector/per-type components (e.g. a
    top-level Group.CM field with x/y/z sub-fields) - the live schema
    already gives each sub-field its real, fully-qualified leaf name
    (Group_CM_x, params_Omega_m, etc., confirmed directly), so this just
    recurses without re-prefixing - an earlier version re-prefixed and
    produced bogus double-qualified names like params_params_Omega_m."""
    out = []
    for f in fields:
        if "sub" in f:
            out.extend(_flatten_fields(f["sub"]))
        else:
            out.append(f)
    return out


def real_fields() -> list[dict]:
    """Every real, leaf-level, queryable field for the CAMELS catalog -
    Group_*, Subhalo_*, params_*, plus simulation_suite/simulation_set/
    snapshot/redshift/type/id/_id. Includes enum fields (simulation_suite,
    simulation_set, type) alongside numeric ones - callers filter by
    `dtype`/`enum` presence to decide which are plottable axes vs. which
    are filter-only."""
    return _flatten_fields(catalog_schema()["fields"])


def enum_index(field_name: str, value: str) -> int | bool:
    """FlatHUB encodes most enum fields (simulation_suite, simulation_set)
    as their integer index into the field's own `enum` list, not the
    string - confirmed directly (filtering simulation_suite=0 returns only
    IllustrisTNG rows). `type` is the one exception: its underlying dtype
    is boolean (`"type": "boolean"`, `dtype: "?"`), so its two-value enum
    (["FoF halo", "Subhalo"]) must be encoded as an actual JSON bool, not
    an integer - sending `1` there gets a real 422 ("expected Bool, but
    encountered Number"), caught directly while building this client.
    Raises ValueError for an unknown field/value rather than silently
    filtering on the wrong index."""
    field = next((f for f in real_fields() if f["name"] == field_name), None)
    if field is None or "enum" not in field:
        raise ValueError(f"{field_name!r} is not a known enum field")
    index = field["enum"].index(value)
    return bool(index) if field.get("type") == "boolean" else index


def count(filters: dict | None = None) -> int:
    """Real row count matching `filters` (see `range_filter`/`enum_index`
    for building one). filters=None means the full catalog (confirmed
    live: 2,927,443,277 rows)."""
    return _post("count", filters or {})


def data(fields: list[str], filters: dict | None = None, limit: int = 2000,
         sort: list[str] | None = None) -> list[dict]:
    """Real matching rows as JSON objects, for the given real field names.
    `limit` is capped server-side at 10,000 (confirmed via the live
    OpenAPI spec's `count` parameter maximum) - not paginated further
    here, since a Custom-tab plot doesn't need more points than that to be
    useful."""
    body = dict(filters or {})
    body["object"] = True
    body["fields"] = fields
    body["count"] = min(limit, 10_000)
    if sort:
        body["sort"] = sort
    return _post("data", body)


def histogram(fields: list[dict], filters: dict | None = None,
              quartiles: str | None = None) -> dict:
    """Real histogram buckets. Each entry in `fields` is
    {"field": name, "size": n_buckets, "log": bool} - matches the live
    HistogramField schema exactly."""
    body = dict(filters or {})
    body["fields"] = fields
    if quartiles:
        body["quartiles"] = quartiles
    return _post("histogram", body)


def range_filter(gte: float | None = None, lte: float | None = None) -> dict:
    """One field's real range-filter shape (>=gte and <=lte, either
    optional) - matches the live Filters schema's "filter range" variant
    exactly."""
    out: dict = {}
    if gte is not None:
        out["gte"] = gte
    if lte is not None:
        out["lte"] = lte
    return out
