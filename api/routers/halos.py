"""Per-halo derived views with no synthetic fallback (real-data only, same
as backend.py's own doc comments on each of these) - X-ray/gas profiles and
the photometric color-mass diagram.
"""

from typing import Optional

from fastapi import APIRouter
from fastapi.responses import Response

import backend as B
from api.deps import require
from api.serialization import to_jsonable

router = APIRouter(tags=["halos"])


@router.get("/xray-profiles")
def xray_profiles(suite: str, set_name: str, realization: int, fetch_public: bool = False):
    result = require(B.get_xray_profiles(suite, set_name, realization, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/xray-profiles/plot.png")
def xray_profiles_plot(suite: str, set_name: str, realization: int, fetch_public: bool = False):
    """Static matplotlib render (viridis-by-mass multi-line + colorbar) -
    real-data only, no Plotly equivalent (matches app.py's own st.pyplot-
    only rendering for this statistic)."""
    png = require(B.render_xray_profiles_png(suite, set_name, realization, fetch_public=fetch_public))
    return Response(content=png, media_type="image/png")


@router.get("/halo-profiles")
def halo_profiles(
    suite: str, set_name: str, realization: int, snapnum: int, field: str,
    fetch_public: bool = False,
):
    result = require(B.get_halo_profiles(
        suite, set_name, realization, snapnum, field, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/halo-profiles/plot.png")
def halo_profiles_plot(
    suite: str, set_name: str, realization: int, snapnum: int, field: str,
    highlight_rank: int = 1,
    fetch_public: bool = False,
):
    """Static matplotlib render (viridis-by-mass multi-line + highlighted
    halo with real Poisson error bars + colorbar) - real-data only, no
    Plotly equivalent."""
    png = require(B.render_halo_profiles_png(
        suite, set_name, realization, snapnum, field,
        highlight_rank=highlight_rank, fetch_public=fetch_public,
    ))
    return Response(content=png, media_type="image/png")


@router.get("/color-mass-diagram")
def color_mass_diagram(
    suite: str, set_name: str, realization: int,
    color: Optional[str] = None,
    band1: Optional[str] = None,
    band2: Optional[str] = None,
    snapnum: int = 33,
    sps_model: str = "BC03",
    spectra_type: str = "attenuated",
    fetch_public: bool = False,
):
    result = require(B.get_color_mass_diagram(
        suite, set_name, realization,
        color=color, band1=band1, band2=band2, snapnum=snapnum,
        sps_model=sps_model, spectra_type=spectra_type, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/color-mass-diagram/plot.png")
def color_mass_diagram_plot(
    suite: str, set_name: str, realization: int,
    band1: Optional[str] = None,
    band2: Optional[str] = None,
    snapnum: int = 33,
    sps_model: str = "BC03",
    spectra_type: str = "attenuated",
    fetch_public: bool = False,
):
    """Static matplotlib render (scatter, color vs. log stellar mass) -
    real-data only, no Plotly equivalent."""
    png = require(B.render_color_mass_diagram_png(
        suite, set_name, realization, band1=band1, band2=band2, snapnum=snapnum,
        sps_model=sps_model, spectra_type=spectra_type, fetch_public=fetch_public,
    ))
    return Response(content=png, media_type="image/png")
