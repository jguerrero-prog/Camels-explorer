"""Volumetric/spatial views - 3D density grids, particle clouds, 2D maps,
and the void catalog overlaid on the 3D view.
"""

from typing import Optional

from fastapi import APIRouter

import backend as B
from api.serialization import to_jsonable

router = APIRouter(tags=["fields"])


@router.get("/density-field-3d")
def density_field_3d(
    suite: str, set_name: str, realization: int, snapnum: int, grid: int,
    field: str = "Mtot",
    snapshot_path: Optional[str] = None,
    fetch_public: bool = False,
):
    result = B.get_density_field_3d(
        suite, set_name, realization, snapnum, grid,
        field=field, snapshot_path=snapshot_path, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/particle-cloud")
def particle_cloud(
    suite: str, set_name: str, realization: int,
    max_particles: int = 50_000,
    snapnum: int = 33,
    fetch_public: bool = False,
):
    result = B.get_particle_cloud(
        suite, set_name, realization,
        max_particles=max_particles, snapnum=snapnum, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/field-map-2d")
def field_map_2d(
    suite: str, set_name: str, realization: int,
    field: str = "Mtot",
    fetch_public: bool = False,
):
    result = B.get_field_map_2d(suite, set_name, realization, field=field, fetch_public=fetch_public)
    return to_jsonable(result)


@router.get("/void-catalog")
def void_catalog(suite: str, set_name: str, realization: int, fetch_public: bool = False):
    result = B.get_void_catalog(suite, set_name, realization, fetch_public=fetch_public)
    return to_jsonable(result)
