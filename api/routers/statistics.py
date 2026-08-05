"""1D statistics - each endpoint returns backend.py's Result (or, for
Bispectrum/Field PDF/Lyman-alpha, a Result-shaped-but-differently-named
dataclass). Every param here mirrors the matching backend.py function's
real signature 1:1 - no renaming, no reordering, no invented defaults.
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import Response

import backend as B
from api.deps import require
from api.serialization import to_jsonable

router = APIRouter(tags=["statistics"])


@router.get("/power-spectrum")
def power_spectrum(
    suite: str, set_name: str, realization: int, snapnum: int,
    grid: int, MAS: str, threads: int,
    ptype: list[int] = Query([0, 1, 4]),
    snapshot_path: Optional[str] = None,
    fetch_public: bool = False,
    k_range: str = "standard",
    rsd_axis: Optional[int] = None,
    multipole: str = "P0",
):
    result = B.get_power_spectrum(
        suite, set_name, realization, snapnum, grid, MAS, threads, ptype,
        snapshot_path=snapshot_path, fetch_public=fetch_public,
        k_range=k_range, rsd_axis=rsd_axis, multipole=multipole,
    )
    return to_jsonable(result)


@router.get("/power-spectrum/plot.png")
def power_spectrum_plot(
    suite: str, set_name: str, snapnum: int,
    grid: int, MAS: str, threads: int,
    ptype: list[int] = Query([0, 1, 4]),
    realizations: list[int] = Query(...),
    fetch_public: bool = False,
    k_range: str = "standard",
    rsd_axis: Optional[int] = None,
    multipole: str = "P0",
    show_linear_pk: bool = False,
):
    """Static matplotlib render - see stellar_mass_function_plot's docstring
    (same shared rendering path, backend.py's _render_result_png), plus the
    real linear-theory-Pk dashed overlay app.py's own checkbox draws."""
    png = B.render_power_spectrum_png(
        suite, set_name, realizations, snapnum, grid, MAS, threads, ptype,
        fetch_public=fetch_public, k_range=k_range, rsd_axis=rsd_axis,
        multipole=multipole, show_linear_pk=show_linear_pk,
    )
    return Response(content=png, media_type="image/png")


@router.get("/halo-mass-function")
def halo_mass_function(
    suite: str, set_name: str, realization: int, snapnum: int,
    RMmin: float, RMmax: float, bins: int,
    subfind_path: Optional[str] = None,
    fetch_public: bool = False,
):
    result = B.get_halo_mass_function(
        suite, set_name, realization, snapnum, RMmin, RMmax, bins,
        subfind_path=subfind_path, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/stellar-mass-function")
def stellar_mass_function(
    suite: str, set_name: str, realization: int, snapnum: int,
    SMmin: float, SMmax: float, bins: int,
    subfind_path: Optional[str] = None,
    fetch_public: bool = False,
):
    result = B.get_stellar_mass_function(
        suite, set_name, realization, snapnum, SMmin, SMmax, bins,
        subfind_path=subfind_path, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/stellar-mass-function/plot.png")
def stellar_mass_function_plot(
    suite: str, set_name: str, snapnum: int,
    SMmin: float, SMmax: float, bins: int,
    realizations: list[int] = Query(...),
    fetch_public: bool = False,
):
    """Static matplotlib render - the *default* way this statistic is shown
    (matches app.py's own plotting block; see render_stellar_mass_function_png's
    docstring). The frontend's interactive Plotly chart is the opt-in
    alternative built from the same /stellar-mass-function JSON data."""
    png = B.render_stellar_mass_function_png(
        suite, set_name, realizations, snapnum, SMmin, SMmax, bins,
        fetch_public=fetch_public,
    )
    return Response(content=png, media_type="image/png")


@router.get("/halo-mass-function/plot.png")
def halo_mass_function_plot(
    suite: str, set_name: str, snapnum: int,
    RMmin: float, RMmax: float, bins: int,
    realizations: list[int] = Query(...),
    fetch_public: bool = False,
):
    """Static matplotlib render - see stellar_mass_function_plot's docstring
    (same shared rendering path, backend.py's _render_mass_range_png)."""
    png = B.render_halo_mass_function_png(
        suite, set_name, realizations, snapnum, RMmin, RMmax, bins,
        fetch_public=fetch_public,
    )
    return Response(content=png, media_type="image/png")


@router.get("/baryon-fraction")
def baryon_fraction(
    suite: str, set_name: str, realization: int, snapnum: int,
    RMmin: float, RMmax: float, bins: int,
    subfind_path: Optional[str] = None,
    fetch_public: bool = False,
):
    result = B.get_baryon_fraction(
        suite, set_name, realization, snapnum, RMmin, RMmax, bins,
        subfind_path=subfind_path, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/baryon-fraction/plot.png")
def baryon_fraction_plot(
    suite: str, set_name: str, snapnum: int,
    RMmin: float, RMmax: float, bins: int,
    realizations: list[int] = Query(...),
    fetch_public: bool = False,
):
    """Static matplotlib render - see stellar_mass_function_plot's docstring
    (same shared rendering path, backend.py's _render_mass_range_png)."""
    png = B.render_baryon_fraction_png(
        suite, set_name, realizations, snapnum, RMmin, RMmax, bins,
        fetch_public=fetch_public,
    )
    return Response(content=png, media_type="image/png")


@router.get("/sfr-history")
def sfr_history(
    suite: str, set_name: str, realization: int,
    z_min: float, z_max: float, bins: int,
    sfrh_path: Optional[str] = None,
    fetch_public: bool = False,
):
    result = B.get_sfr_history(
        suite, set_name, realization, z_min, z_max, bins,
        sfrh_path=sfrh_path, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/sfr-history/plot.png")
def sfr_history_plot(
    suite: str, set_name: str,
    z_min: float, z_max: float, bins: int,
    realizations: list[int] = Query(...),
    fetch_public: bool = False,
    show_symbolic_fit: bool = False,
    Om: Optional[float] = None,
    s8: Optional[float] = None,
    A1: Optional[float] = None,
    A3: Optional[float] = None,
):
    """Static matplotlib render - see stellar_mass_function_plot's docstring
    (same shared rendering path, backend.py's _render_result_png), plus the
    real symbolic-regression-fit dashed overlay app.py's own checkbox draws."""
    png = B.render_sfr_history_png(
        suite, set_name, realizations, z_min, z_max, bins,
        fetch_public=fetch_public, show_symbolic_fit=show_symbolic_fit,
        Om=Om, s8=s8, A1=A1, A3=A3,
    )
    return Response(content=png, media_type="image/png")


@router.get("/scaling-relations")
def scaling_relations(
    suite: str, set_name: str, realization: int,
    SMmin: float, SMmax: float, bins: int,
    snapnum: int = 33,
    fetch_public: bool = False,
):
    result = B.get_scaling_relations(
        suite, set_name, realization, SMmin, SMmax, bins,
        snapnum=snapnum, fetch_public=fetch_public,
    )
    return to_jsonable(result)


@router.get("/bispectrum")
def bispectrum(
    suite: str, set_name: str, realization: int, field: str,
    mu_index: int = 7,
    fetch_public: bool = False,
):
    result = require(B.get_bispectrum(
        suite, set_name, realization, field,
        mu_index=mu_index, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/bispectrum/plot.png")
def bispectrum_plot(
    suite: str, set_name: str, field: str,
    mu_index: int = 7,
    realizations: list[int] = Query(...),
    fetch_public: bool = False,
):
    """Static matplotlib render - see stellar_mass_function_plot's
    docstring (same shared rendering path, backend.py's
    _render_result_png). No synthetic fallback (matches the JSON endpoint)
    - a 500 here means none of the selected realizations have real data."""
    png = B.render_bispectrum_png(
        suite, set_name, realizations, field, mu_index=mu_index, fetch_public=fetch_public,
    )
    return Response(content=png, media_type="image/png")


@router.get("/field-pdf")
def field_pdf(
    suite: str, field: str,
    grid: int = 128,
    redshift: float = 0.0,
    fetch_public: bool = False,
):
    result = require(B.get_field_pdf(suite, field, grid=grid, redshift=redshift, fetch_public=fetch_public))
    return to_jsonable(result)


@router.get("/field-pdf/plot.png")
def field_pdf_plot(
    suite: str, field: str,
    grid: int = 128,
    redshift: float = 0.0,
    fetch_public: bool = False,
):
    """Static matplotlib render (mean +/- std band across the ensemble) -
    real-data only, no Plotly equivalent."""
    png = require(B.render_field_pdf_png(suite, field, grid=grid, redshift=redshift, fetch_public=fetch_public))
    return Response(content=png, media_type="image/png")


@router.get("/lyman-alpha-spectrum")
def lyman_alpha_spectrum(
    suite: str, set_name: str, realization: int, snapnum: int, sightline: int,
    fetch_public: bool = False,
):
    result = require(B.get_lya_spectrum(
        suite, set_name, realization, snapnum, sightline, fetch_public=fetch_public,
    ))
    return to_jsonable(result)


@router.get("/lyman-alpha-spectrum/plot.png")
def lyman_alpha_spectrum_plot(
    suite: str, set_name: str, realization: int, snapnum: int, sightline: int,
    fetch_public: bool = False,
):
    """Static matplotlib render (2-row shared-x: flux + column density) -
    real-data only, no Plotly equivalent."""
    png = require(B.render_lya_spectrum_png(
        suite, set_name, realization, snapnum, sightline, fetch_public=fetch_public,
    ))
    return Response(content=png, media_type="image/png")


@router.get("/linear-pk-ics")
def linear_pk_ics(suite: str, set_name: str, realization: int):
    result = require(B.get_linear_pk_ics(suite, set_name, realization))
    k, pk = result
    return {"k": to_jsonable(k), "pk": to_jsonable(pk)}
