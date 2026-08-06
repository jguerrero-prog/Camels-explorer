"""Volumetric/spatial views - 3D density grids, particle clouds, 2D maps,
and the void catalog overlaid on the 3D view.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import Response

import backend as B
from api.deps import require, resolved_set_name
from api.serialization import to_jsonable

router = APIRouter(tags=["fields"])


@router.get("/density-field-3d")
def density_field_3d(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int, snapnum: int, grid: int,
    field: str = "Mtot",
    snapshot_path: Optional[str] = None,
    fetch_public: bool = False,
):
    result = require(B.get_density_field_3d(
        suite, set_name, realization, snapnum, grid,
        field=field, snapshot_path=snapshot_path, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/particle-cloud")
def particle_cloud(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int,
    max_particles: int = 50_000,
    snapnum: int = 33,
    fetch_public: bool = False,
):
    result = require(B.get_particle_cloud(
        suite, set_name, realization,
        max_particles=max_particles, snapnum=snapnum, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/field-map-2d")
def field_map_2d(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int,
    field: str = "Mtot",
    fetch_public: bool = False,
):
    result = require(B.get_field_map_2d(suite, set_name, realization, field=field, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/field-map-2d/plot.png")
def field_map_2d_plot(
    suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int,
    field: str = "Mtot",
    fetch_public: bool = False,
):
    """Static matplotlib render (log-normed imshow heatmap + colorbar) -
    real-data only, no synthetic fallback (matches the JSON endpoint)."""
    png = require(B.render_field_map_2d_png(suite, set_name, realization, field=field, fetch_public=fetch_public))
    return Response(content=png, media_type="image/png")


@router.get("/void-catalog")
def void_catalog(suite: str, set_name: Annotated[str, Depends(resolved_set_name)], realization: int, fetch_public: bool = False):
    """Deliberately NOT wrapped in require() - unlike every other endpoint
    here, void catalog is an optional overlay on the (separately real-data-
    only) 3D Density Field, not the tile's main content. `null` here means
    "no voids to overlay," which the frontend should render as an absent
    overlay, not a tile-level error."""
    result = B.get_void_catalog(suite, set_name, realization, fetch_public=fetch_public)
    return to_jsonable(result)
