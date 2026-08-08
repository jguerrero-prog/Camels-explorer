"""Catalog browsing and merger-tree endpoints - halo/subhalo tables and the
per-halo mass-accretion histories traced through them.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

import backend as B
from api.deps import require, resolved_set_name
from api.serialization import to_jsonable

router = APIRouter(tags=["catalogs"])


@router.get("/halo-catalog")
def halo_catalog(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: str,
    snapnum: int = 33,
    fetch_public: bool = False,
):
    result = require(B.get_halo_catalog(suite, set_name, realization, snapnum=snapnum, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/halo-catalog/alt")
def alt_halo_catalog(
    finder: str, suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int,
    snapnum: int = 33,
    fetch_public: bool = False,
):
    result = require(B.get_alt_halo_catalog(
        finder, suite, set_name, realization, snapnum=snapnum, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/sam-catalog")
def sam_catalog(set_name: str, realization: int, octant: str = B.SAM_DEFAULT_OCTANT, fetch_public: bool = False):
    # Real bug fixed (see CLAUDE.md-tracked issue): set_name used to be
    # wrapped in Depends(resolved_set_name), which requires a `suite` query
    # param on every request to resolve "SB"'s per-suite folder name -
    # irrelevant here, since CAMELS-SAM's set is always the literal "LH".
    # This route never declared `suite` and the frontend never sent one, so
    # FastAPI rejected every real request with a 422 before it ever reached
    # get_sam_catalog(). Plain string param, no suite-aware resolution.
    result = require(B.get_sam_catalog(set_name, realization, octant=octant, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/cross-finder-hmf")
def cross_finder_hmf(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int, snapnum: int,
    mass_min: float, mass_max: float, bins: int,
    fetch_public: bool = False,
):
    result = B.get_cross_finder_hmf(
        suite, set_name, realization, snapnum, mass_min, mass_max, bins,
        fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/merger-history")
def merger_history(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int, subfind_id: int,
    root_snapnum: int = 33,
    variant: str = "SubLink",
    fetch_public: bool = False,
):
    result = require(B.get_merger_history(
        suite, set_name, realization, subfind_id,
        root_snapnum=root_snapnum, variant=variant, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/consistent-trees-history")
def consistent_trees_history(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int, halo_id: int,
    fetch_public: bool = False,
):
    result = require(B.get_consistent_trees_history(
        suite, set_name, realization, halo_id, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/blackhole-mergers")
def blackhole_mergers(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int,
    fetch_public: bool = False,
):
    result = require(B.get_blackhole_mergers(suite, set_name, realization, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/parameters")
def parameters(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)],
    fetch_public: bool = False,
):
    result = require(B.get_simulation_parameters(suite, set_name, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/onep-param-value")
def onep_param_value(
    suite: str, param_index: int, variation: int,
    snapnum: int = 33,
):
    """Returns {"value": null} rather than 404 when unavailable - unlike the
    other endpoints here, a missing 1P parameter value is a per-parameter
    real gap (see ONEP_TNG_PARAMS), not "wrong selection entirely."""
    value = B.get_onep_param_value(suite, param_index, variation, snapnum=snapnum)
    return {"value": to_jsonable(value)}
