"""
CAMELS Explorer — MVP prototype

An interactive plot explorer for CAMELS simulations: pick a suite / set /
realization / snapshot, pick a statistic, tune its parameters, and plot it.
This wraps the same functions the real `camels_library` exposes (see
backend.py) so real snapshot/subfind data can be swapped in without touching
this file.
"""

import matplotlib.pyplot as plt
import numpy as np
import plotly.graph_objects as go
import streamlit as st
from matplotlib.colors import LogNorm

import backend as B

st.set_page_config(page_title="CAMELS Explorer", layout="wide")

st.title("CAMELS Explorer")
st.caption(
    "Prototype — interactive analysis viewer for CAMELS simulations. "
    "Currently running on synthetic stand-in data (see sidebar)."
)

# ---------------------------------------------------------------------------
# Sidebar — simulation selection
# ---------------------------------------------------------------------------

with st.sidebar:
    st.header("Simulation")

    data_mode = st.radio(
        "Data source",
        ["Demo data (synthetic)", "Public data release (live fetch)",
         "Local snapshot / subfind path (advanced)"],
        index=0,
        help="Demo mode needs no downloaded data. Public mode fetches real files "
             "from the public CAMELS data release over HTTP (Power Spectrum, Halo "
             "Mass Function, Stellar Mass Function). Advanced mode points at a "
             "snapshot/subfind file you already downloaded via Globus/Binder.",
    )
    fetch_public = data_mode.startswith("Public")
    if fetch_public:
        st.caption(
            "Public suite coverage varies by statistic: Pk works for IllustrisTNG/SIMBA/"
            "Astrid/Swift-EAGLE; HMF/SMF/Catalog Browser/Scaling Relations work for the same "
            "4 but only fetch the z~0 catalog (snapshot slider ignored there); 3D Density "
            "Field's fast path (CMD grids) covers IllustrisTNG/SIMBA/Astrid, with a slower "
            "real-particle-gridding fallback (needs Pylians) for the same 3. SFR History "
            "still falls back to synthetic (only the symbolic-regression overlay is real)."
        )

    local_path = None
    if data_mode.startswith("Local"):
        local_path = st.text_input("Path to snapshot / subfind file", value="")
        if not B.HAVE_CAMELS_LIBRARY:
            st.warning("`camels_library` (Pylians) isn't installed here, so this "
                       "will still fall back to synthetic data until it is.")

    suite = st.selectbox("Suite", B.SUITES)
    set_name = st.selectbox("Set", list(B.SET_REALIZATIONS.keys()))
    n_real = B.SET_REALIZATIONS[set_name]
    realization = st.slider("Realization", 0, n_real - 1, min(42, n_real - 1))
    snapnum = st.slider("Snapshot", 0, B.N_SNAPSHOTS - 1, B.N_SNAPSHOTS - 1)
    st.caption(f"z ≈ {B._snapshot_to_redshift(snapnum):.2f}")

    compare_mode = st.checkbox(
        "Compare mode", value=False,
        help="Overlay several realizations of the same set/statistic on one plot.",
    )
    compare_realizations = (
        st.multiselect("Realizations to compare", options=list(range(n_real)),
                        default=sorted({realization, min(realization + 1, n_real - 1)}))
        if compare_mode else [realization]
    )

    st.divider()
    st.header("Statistic")
    statistic = st.radio("Choose a statistic", B.STATISTICS, index=0, label_visibility="collapsed")

    st.divider()
    st.header("Parameters")

    if statistic == "Power Spectrum":
        grid = st.select_slider("Grid size", options=[128, 256, 512, 1024], value=512)
        MAS = st.selectbox("Mass Assignment Scheme", ["NGP", "CIC", "TSC", "PCS"], index=1)
        threads = st.slider("Threads", 1, 16, 1)
        ptype_label = st.selectbox("Particle type", ["Gas [0]", "DM [1]", "Stars [4]", "Total [0,1,4]"], index=1)
        ptype = {"Gas [0]": [0], "DM [1]": [1], "Stars [4]": [4], "Total [0,1,4]": [0, 1, 4]}[ptype_label]

    elif statistic == "Halo Mass Function":
        RMmin = st.number_input("Min reduced mass [Msun/h]", value=1e10, format="%e")
        RMmax = st.number_input("Max reduced mass [Msun/h]", value=1e14, format="%e")
        bins = st.slider("Bins", 5, 60, 30)

    elif statistic == "Baryon Fraction":
        RMmin = st.number_input("Min reduced mass [Msun/h]", value=1e10, format="%e")
        RMmax = st.number_input("Max reduced mass [Msun/h]", value=1e14, format="%e")
        bins = st.slider("Bins", 5, 30, 15)

    elif statistic == "Stellar Mass Function":
        SMmin = st.number_input("Min stellar mass [Msun/h]", value=1e9, format="%e")
        SMmax = st.number_input("Max stellar mass [Msun/h]", value=5e11, format="%e")
        bins = st.slider("Bins", 5, 60, 10)

    elif statistic == "Bispectrum":
        bk_field = st.selectbox(
            "Field", list(B.BK_TYPES.keys()),
            help="Equilateral-configuration bispectrum (k1=k2=k3), real-space, z=0.00. Real "
                 "for IllustrisTNG/SIMBA, LH set only - no synthetic fallback.",
        )

    elif statistic == "Field PDF":
        pdf_field_options = list(B.CMD_FIELDS.keys())
        pdf_field = st.selectbox(
            "Field", pdf_field_options, index=pdf_field_options.index(B.DEFAULT_CMD_FIELD),
            format_func=lambda f: f"{f} - {B.CMD_FIELDS[f]}",
        )
        pdf_grid = st.select_slider("Grid resolution", options=B.PUBLIC_PDF_GRIDS, value=128)
        pdf_redshift = st.select_slider("Redshift", options=B.PUBLIC_PDF_REDSHIFTS, value=0.0)
        st.caption(
            "Uses the Suite selector above but ignores Set/Realization - this is the mean "
            "+/- std shape across all 1000 LH realizations at once, not one at a time. "
            "Real for IllustrisTNG/SIMBA."
        )

    elif statistic == "Lyman-alpha Spectrum":
        lya_sightline = st.slider(
            "Sightline", 0, B.LYA_N_SIGHTLINES - 1, 0,
            help="One of 5000 random sightlines through the box at the selected Snapshot. "
                 "Real for IllustrisTNG/SIMBA (Header/Ly-alpha optical depth, read directly, "
                 "no fake_spectra dependency needed).",
        )
        if compare_mode:
            st.caption("Compare mode doesn't apply to this view - showing a single sightline.")

    elif statistic == "SFR History":
        z_min = st.number_input("z min", value=0.0)
        z_max = st.number_input("z max", value=10.0)
        bins = st.slider("Bins", 100, 2000, 500)

        st.divider()
        show_symbolic_fit = st.checkbox(
            "Overlay symbolic-regression fit (real, IllustrisTNG-trained)", value=True,
            help="A closed-form equation discovered by genetic-programming symbolic "
                 "regression on real CAMELS output - the only non-synthetic curve here.",
        )
        if show_symbolic_fit:
            fid = B.SFRHSymbolicModel.FIDUCIAL
            Om = st.slider("Ωm", *B.SFRHSymbolicModel.OM_RANGE, fid["Om"])
            s8 = st.slider("σ8", *B.SFRHSymbolicModel.S8_RANGE, fid["s8"])
            A1 = st.slider("A_SN1 (galactic wind energy)", *B.SFRHSymbolicModel.A1_RANGE, fid["A1"])
            A3 = st.slider("A_AGN1 (BH feedback energy)", *B.SFRHSymbolicModel.A3_RANGE, fid["A3"])

    elif statistic == "Galaxy Scaling Relations":
        SMmin = st.number_input("Min stellar mass [Msun/h]", value=1e9, format="%e")
        SMmax = st.number_input("Max stellar mass [Msun/h]", value=5e11, format="%e")
        bins = st.slider("Bins", 5, 30, 12)
        if compare_mode:
            st.caption("Compare mode doesn't apply to this 4-panel view - showing a single realization.")

    elif statistic == "3D Density Field":
        field_options = list(B.CMD_FIELDS.keys())
        density_field = st.selectbox(
            "Field", field_options, index=field_options.index(B.DEFAULT_CMD_FIELD),
            format_func=lambda f: f"{f} - {B.CMD_FIELDS[f]}",
            help="All 13 fields are real for the CMD path (IllustrisTNG/SIMBA/Astrid). The "
                 "raw-snapshot fallback only supports the 4 mass-type fields (Mtot/Mgas/Mcdm/Mstar) "
                 "for now - other fields fall back to synthetic if CMD doesn't have this redshift/suite.",
        )
        field_grid = st.select_slider("Grid resolution", options=[16, 32, 64, 128], value=32,
                                       help="Higher = finer structure but slower to rotate. Real data "
                                            "(Public data release mode) is natively 128^3 and gets "
                                            "downsampled to whatever you pick here, except 128 itself.")
        iso_surfaces = st.slider("Iso-surfaces", 4, 25, 12)
        opacity = st.slider("Opacity", 0.02, 0.3, 0.08)

        st.divider()
        show_voids = st.checkbox(
            "Overlay VIDE void catalog", value=False,
            help="Real for IllustrisTNG/LH/z=0 only (VIDE watershed void finder) - other "
                 "suites/sets show an illustrative synthetic overlay instead.",
        )
        if compare_mode:
            st.caption("Compare mode doesn't apply to the 3D view - showing a single realization.")

    elif statistic == "3D Particle Cloud":
        max_particles = st.select_slider(
            "Particles to show", options=[5_000, 20_000, 50_000, 100_000, 200_000], value=50_000,
            help="Real mode subsamples real DM particles via a stride - more particles is more "
                 "faithful but slower to fetch/render.",
        )
        if compare_mode:
            st.caption("Compare mode doesn't apply to this view - showing a single realization.")

    elif statistic == "2D Field Map":
        map_field_options = list(B.CMD_FIELDS.keys())
        map_field = st.selectbox(
            "Field", map_field_options, index=map_field_options.index(B.DEFAULT_CMD_FIELD),
            format_func=lambda f: f"{f} - {B.CMD_FIELDS[f]}",
            help="Real for IllustrisTNG/SIMBA/Astrid/Swift-EAGLE, all 13 fields, always at z=0 "
                 "(the only redshift CMD publishes for 2D maps).",
        )
        if compare_mode:
            st.caption("Compare mode doesn't apply to this view - showing a single realization.")

    elif statistic == "Halo Gas Profiles":
        profile_field = st.selectbox(
            "Field", list(B.PROFILES_FIELD_INDEX.keys()),
            help="Spherically-averaged gas profiles per halo (illstack_CAMELS). Real for "
                 "IllustrisTNG/SIMBA, LH/CV sets only (1P uses incompatible naming). Uses "
                 "the Snapshot slider above (same 34-snapshot schedule as Pk/SFRH).",
        )
        if compare_mode:
            st.caption("Compare mode doesn't apply to this view - showing a single realization.")

    elif statistic == "Color-Mass Diagram":
        photometry_color = st.selectbox(
            "Color", list(B.PHOTOMETRY_COLORS.keys()),
            help="Mock SDSS-band colors (BC03 model, dust-attenuated), cross-matched with real "
                 "Subfind stellar masses via SubhaloIndex. Real for IllustrisTNG/SIMBA/Astrid/"
                 "Swift-EAGLE, always at z=0 (snapshot #90, same as the Subfind catalog).",
        )
        if compare_mode:
            st.caption("Compare mode doesn't apply to this view - showing a single realization.")

    run = st.button("Compute & plot", type="primary", width="stretch")

def _compute_result(statistic: str, realization: int) -> B.Result:
    """Dispatch to the backend call for one realization, using the sidebar's
    current parameter selections (grid/MAS/RMmin/etc. are closed over from
    module scope since Streamlit scripts run top-to-bottom on every rerun)."""
    if statistic == "Power Spectrum":
        return B.get_power_spectrum(suite, set_name, realization, snapnum, grid, MAS, threads, ptype,
                                     snapshot_path=local_path or None, fetch_public=fetch_public)
    if statistic == "Halo Mass Function":
        return B.get_halo_mass_function(suite, set_name, realization, snapnum, RMmin, RMmax, bins,
                                         subfind_path=local_path or None, fetch_public=fetch_public)
    if statistic == "Baryon Fraction":
        return B.get_baryon_fraction(suite, set_name, realization, snapnum, RMmin, RMmax, bins,
                                      subfind_path=local_path or None, fetch_public=fetch_public)
    if statistic == "Stellar Mass Function":
        return B.get_stellar_mass_function(suite, set_name, realization, snapnum, SMmin, SMmax, bins,
                                            subfind_path=local_path or None, fetch_public=fetch_public)
    if statistic == "Bispectrum":
        return B.get_bispectrum(suite, set_name, realization, bk_field, fetch_public=fetch_public)
    return B.get_sfr_history(suite, set_name, realization, z_min, z_max, bins,
                              sfrh_path=local_path or None)


tab_explore, tab_catalog, tab_sam, tab_video = st.tabs(
    ["Explore", "Catalog Browser", "CAMELS-SAM", "Representative Visualization"])

# ---------------------------------------------------------------------------
# Explore tab — statistic plots
# ---------------------------------------------------------------------------

SINGLE_REALIZATION_STATISTICS = ("3D Density Field", "Galaxy Scaling Relations", "3D Particle Cloud",
                                  "2D Field Map", "X-ray Halo Profiles", "Halo Gas Profiles",
                                  "Color-Mass Diagram", "Field PDF", "Lyman-alpha Spectrum")

with tab_explore:
    realizations = compare_realizations if statistic not in SINGLE_REALIZATION_STATISTICS else [realization]
    label = ", ".join(f"{set_name}_{r}" for r in realizations)
    st.subheader(f"{suite} · {label} · snapshot {snapnum:03d}  →  {statistic}")

    if statistic == "Galaxy Scaling Relations":
        result = B.get_scaling_relations(suite, set_name, realization, SMmin, SMmax, bins,
                                          fetch_public=fetch_public)
        badge = "🟢 real data" if result.source == "real" else "🟡 synthetic demo data"
        st.caption(f"{badge}   ·   {result.note}")

        populated = result.counts > 0
        panels = [
            (result.radius, "Stellar half-mass radius [kpc/h]"),
            (result.bh_mass, "BH mass [Msun/h]"),
            (result.sfr, "SFR [Msun/yr]"),
            (result.vmax, "Vmax [km/s]"),
        ]
        fig, axes = plt.subplots(2, 2, figsize=(9, 7))
        for ax, (y, ylabel) in zip(axes.flat, panels):
            y_plot = np.clip(y[populated], 1e-6, None)  # some bins can average to SFR=0
            ax.plot(result.stellar_mass[populated], y_plot, "o-", lw=1.5, ms=4)
            ax.set_xscale("log")
            ax.set_yscale("log")
            ax.set_xlabel("Stellar mass [Msun/h]")
            ax.set_ylabel(ylabel)
            ax.grid(alpha=0.3, which="both")
        fig.tight_layout()
        st.pyplot(fig)
        st.caption("Only stellar-mass bins with at least one galaxy are plotted.")

    elif statistic == "3D Density Field":
        result = B.get_density_field_3d(suite, set_name, realization, snapnum, field_grid,
                                         field=density_field, snapshot_path=local_path or None,
                                         fetch_public=fetch_public)
        badge = "🟢 real data" if result.source == "real" else "🟡 synthetic demo data"
        st.caption(f"{badge}   ·   {result.note}")

        grid_n = result.density.shape[0]
        coords = np.linspace(0, result.box_size, grid_n)
        X, Y, Z = np.meshgrid(coords, coords, coords, indexing="ij")
        vals = result.density

        colorbar_title = "ρ/ρ̄" if density_field in B.CMD_MASS_TYPE_FIELDS else density_field
        traces = [go.Volume(
            x=X.flatten(), y=Y.flatten(), z=Z.flatten(), value=vals.flatten(),
            isomin=np.percentile(vals, 60), isomax=np.percentile(vals, 99.5),
            opacity=opacity, surface_count=iso_surfaces,
            colorscale="Inferno", showscale=True,
            colorbar=dict(title=colorbar_title),
        )]

        if show_voids:
            voids = B.get_void_catalog(suite, set_name, realization, fetch_public=fetch_public)
            void_badge = "🟢 real" if voids.source == "real" else "🟡 synthetic"
            st.caption(f"Voids: {void_badge}   ·   {voids.note}")
            traces.append(go.Scatter3d(
                x=voids.positions[:, 0], y=voids.positions[:, 1], z=voids.positions[:, 2],
                mode="markers",
                marker=dict(
                    size=np.clip(voids.radius * 3, 6, 40), color="cyan", opacity=0.35,
                    line=dict(width=1, color="lightcyan"),
                ),
                text=[f"r={r:.1f} Mpc/h, δ={d:.2f}" for r, d in
                      zip(voids.radius, voids.density_contrast)],
                hoverinfo="text", name="VIDE voids",
            ))

        fig = go.Figure(data=traces)
        fig.update_layout(
            scene=dict(
                xaxis_title="x [Mpc/h]", yaxis_title="y [Mpc/h]", zaxis_title="z [Mpc/h]",
                aspectmode="cube",
            ),
            margin=dict(l=0, r=0, t=0, b=0),
            height=650,
        )
        st.plotly_chart(fig, use_container_width=True)
        st.caption("Drag to rotate, scroll to zoom. Higher-density knots/filaments show as brighter iso-surfaces."
                    + (" Cyan spheres are void centers, sized by radius." if show_voids else ""))

    elif statistic == "3D Particle Cloud":
        result = B.get_particle_cloud(suite, set_name, realization, max_particles,
                                       fetch_public=fetch_public)
        badge = "🟢 real data" if result.source == "real" else "🟡 synthetic demo data"
        st.caption(f"{badge}   ·   {result.note}")

        # Plotly Scatter3d - same library/style as the 3D Density Field and
        # CAMELS-SAM 3D views, for real axes/gridlines/ticks and native hover
        # (x, y, z) for free. Earlier version used pydeck's PointCloudLayer for
        # GPU instancing, then bolted on a hand-rolled wireframe box + text
        # labels to fake axes - inconsistent-looking next to the rest of the
        # app and worth just matching instead of patching further.
        pos = result.positions
        fig = go.Figure(data=[go.Scatter3d(
            x=pos[:, 0], y=pos[:, 1], z=pos[:, 2],
            mode="markers",
            marker=dict(size=1.5, color="#ffa53c", opacity=0.5),
        )])
        fig.update_layout(
            scene=dict(
                xaxis_title="x [Mpc/h]", yaxis_title="y [Mpc/h]", zaxis_title="z [Mpc/h]",
                aspectmode="cube",
            ),
            margin=dict(l=0, r=0, t=0, b=0),
            height=650,
        )
        st.plotly_chart(fig, use_container_width=True)
        st.caption("Drag to rotate, scroll to zoom, hover a point for its coordinates. "
                    "Each point is one real (or synthetic) DM particle.")

    elif statistic == "2D Field Map":
        result = B.get_field_map_2d(suite, set_name, realization, field=map_field,
                                     fetch_public=fetch_public)
        badge = "🟢 real data" if result.source == "real" else "🟡 synthetic demo data"
        st.caption(f"{badge}   ·   {result.note}")

        fig, ax = plt.subplots(figsize=(7, 6))
        im = ax.imshow(
            result.values.T, origin="lower", cmap="inferno",
            norm=LogNorm(vmin=max(result.values.min(), 1e-6), vmax=result.values.max()),
            extent=[0, result.box_size, 0, result.box_size],
        )
        ax.set_xlabel("x [Mpc/h]")
        ax.set_ylabel("y [Mpc/h]")
        cbar_label = "overdensity ρ/ρ̄" if map_field in B.CMD_MASS_TYPE_FIELDS else map_field
        fig.colorbar(im, ax=ax, label=cbar_label)
        fig.tight_layout()
        st.pyplot(fig)
        st.caption("Column-density-style projection - a real CMD 2D map when available.")

    elif statistic == "X-ray Halo Profiles":
        profiles = B.get_xray_profiles(suite, set_name, realization, fetch_public=fetch_public)
        if profiles is None:
            st.info(
                "This tab is real-data only - there's no synthetic version. Switch **Data "
                "source** to \"Public data release\" and pick **IllustrisTNG** or **SIMBA** "
                "(the only two suites with this product) and a set/realization that has it."
            )
        else:
            st.caption(f"🟢 real data   ·   {profiles.note}")

            fig, ax = plt.subplots(figsize=(8, 5))
            norm = plt.Normalize(profiles.log_mass.min(), profiles.log_mass.max())
            cmap = plt.get_cmap("viridis")
            for lum, mass in zip(profiles.luminosities, profiles.log_mass):
                ax.plot(profiles.r_centers, lum, color=cmap(norm(mass)), alpha=0.6, lw=1.2)
            ax.set_xscale("log")
            ax.set_yscale("log")
            ax.set_xlabel("r [kpc/h]")
            ax.set_ylabel("L (0.5-2.0 keV) [erg/s]")
            ax.grid(alpha=0.3, which="both")
            sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
            sm.set_array([])
            fig.colorbar(sm, ax=ax, label="log10 M200c [Msun/h]")
            fig.tight_layout()
            st.pyplot(fig)
            st.caption(f"{len(profiles.log_mass)} halos in this realization, one line each, "
                       "colored by mass. More massive (brighter) halos are systematically "
                       "more X-ray luminous, and every halo's profile declines outward.")

    elif statistic == "Halo Gas Profiles":
        hprof = B.get_halo_profiles(suite, set_name, realization, snapnum, profile_field,
                                     fetch_public=fetch_public)
        if hprof is None:
            st.info(
                "This tab is real-data only - there's no synthetic version. Switch **Data "
                "source** to \"Public data release\" and pick **IllustrisTNG** or **SIMBA**, "
                "**LH** or **CV** set (the only combination this product supports)."
            )
        else:
            st.caption(f"🟢 real data   ·   {hprof.note}")

            fig, ax = plt.subplots(figsize=(8, 5))
            norm = plt.Normalize(hprof.log_mass.min(), hprof.log_mass.max())
            cmap = plt.get_cmap("viridis")
            for row, mass in zip(hprof.values, hprof.log_mass):
                positive = row > 0
                ax.plot(hprof.r[positive], row[positive], color=cmap(norm(mass)), alpha=0.5, lw=1.0)
            ax.set_xscale("log")
            ax.set_yscale("log")
            ax.set_xlabel("r [kpc]")
            ax.set_ylabel(f"{hprof.field} [{hprof.units}]")
            ax.grid(alpha=0.3, which="both")
            sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
            sm.set_array([])
            fig.colorbar(sm, ax=ax, label="log10 M200c [Msun]")
            fig.tight_layout()
            st.pyplot(fig)
            st.caption(f"{len(hprof.log_mass)} halos in this realization, one line each, "
                       "colored by mass. Gaps in a line are radial bins with no resolved "
                       "particles for that halo (e.g. beyond the box, or too far outside a "
                       "smaller halo's profile) - real, not a plotting artifact.")

    elif statistic == "Color-Mass Diagram":
        cmd_result = B.get_color_mass_diagram(suite, set_name, realization, photometry_color,
                                               fetch_public=fetch_public)
        if cmd_result is None:
            st.info(
                "This tab is real-data only - there's no synthetic version. Switch **Data "
                "source** to \"Public data release\" and pick IllustrisTNG/SIMBA/Astrid/"
                "Swift-EAGLE."
            )
        else:
            st.caption(f"🟢 real data   ·   {cmd_result.note}")

            fig, ax = plt.subplots(figsize=(7, 5.5))
            ax.scatter(cmd_result.log_mass, cmd_result.color, s=14, alpha=0.5, c="#2b5f8a")
            ax.set_xlabel("log10 Stellar Mass [Msun/h]")
            ax.set_ylabel(f"{cmd_result.color_label} [mag]")
            ax.grid(alpha=0.3, which="both")
            fig.tight_layout()
            st.pyplot(fig)
            st.caption(f"{len(cmd_result.color)} galaxies. Colors are computed from band-ratio "
                       "magnitudes only (zero-point-independent) - absolute magnitudes aren't "
                       "shown since the upstream files don't document a distance/zero-point "
                       "convention. Look for the classic bimodality: a redder, more massive "
                       "population (quenched) vs. a bluer, less massive one (star-forming).")

    elif statistic == "Field PDF":
        pdf = B.get_field_pdf(suite, pdf_field, pdf_grid, pdf_redshift, fetch_public=fetch_public)
        if pdf is None:
            st.info(
                "This tab is real-data only - there's no synthetic version. Switch **Data "
                "source** to \"Public data release\" and pick **IllustrisTNG** or **SIMBA**."
            )
        else:
            st.caption(f"🟢 real data   ·   {pdf.note}")

            fig, ax = plt.subplots(figsize=(8, 4.5))
            ax.plot(pdf.bin_index, pdf.mean_counts, lw=2, color="#2b5f8a", label="mean")
            lower = np.clip(pdf.mean_counts - pdf.std_counts, 1e-3, None)
            ax.fill_between(pdf.bin_index, lower, pdf.mean_counts + pdf.std_counts,
                             alpha=0.3, color="#2b5f8a", label="±1 std across realizations")
            ax.set_yscale("log")
            ax.set_xlabel("bin index (0-499, uncalibrated)")
            ax.set_ylabel(f"count [{pdf.field}]")
            ax.grid(alpha=0.3, which="both")
            ax.legend(fontsize=8)
            fig.tight_layout()
            st.pyplot(fig)
            st.caption("The exact physical value each bin index represents isn't documented in "
                       "the public release (no bin edges or value-range/transform are given), "
                       "so this shows real distribution shape (skew, tails, multi-modality) "
                       "across the ensemble, not a calibrated x-axis.")

    elif statistic == "Lyman-alpha Spectrum":
        lya = B.get_lya_spectrum(suite, set_name, realization, snapnum, lya_sightline,
                                  fetch_public=fetch_public)
        if lya is None:
            st.info(
                "This tab is real-data only - there's no synthetic version. Switch **Data "
                "source** to \"Public data release\" and pick **IllustrisTNG** or **SIMBA**."
            )
        else:
            st.caption(f"🟢 real data   ·   {lya.note}")

            fig, ax = plt.subplots(figsize=(9, 4))
            ax.plot(lya.pixel, lya.flux, lw=1.2, color="#2b5f8a")
            ax.set_ylim(0, 1.05)
            ax.set_xlabel("spectral pixel (uncalibrated)")
            ax.set_ylabel("transmitted flux (e^-tau)")
            ax.grid(alpha=0.3)
            fig.tight_layout()
            st.pyplot(fig)
            st.caption("A mock Lyman-alpha forest sightline - dips are real absorption features "
                       "from intervening gas. At z=0 the forest is weak (mean flux close to 1); "
                       "try a lower Snapshot for a higher-redshift, more absorbed spectrum.")

    else:
        results = {r: _compute_result(statistic, r) for r in realizations}
        results = {r: res for r, res in results.items() if res is not None}

        if not results:
            st.info(
                "This statistic is real-data only - there's no synthetic version. Switch "
                "**Data source** to \"Public data release\" and pick **IllustrisTNG** or "
                "**SIMBA**, **LH** set (the only combination Bispectrum supports)."
            )
        else:
            any_real = any(result.source == "real" for result in results.values())
            badge = "🟢 real data" if any_real else "🟡 synthetic demo data"
            first_result = next(iter(results.values()))
            st.caption(f"{badge}   ·   {first_result.note}")

            fig, ax = plt.subplots(figsize=(8, 4.5))
            for r, result in results.items():
                ax.plot(result.x, result.y, lw=2, label=f"{set_name}_{r}")

            show_legend = len(results) > 1
            if statistic == "SFR History" and show_symbolic_fit:
                z_curve = np.linspace(z_min, max(z_min + 1e-3, z_max), 200)
                log_sfr = B.SFRHSymbolicModel.predict_log_sfr(z_curve, Om, s8, A1, A3)
                ax.plot(z_curve, 10 ** log_sfr, "k--", lw=2, label="symbolic-regression fit (real)")
                show_legend = True

            if first_result.log_x:
                ax.set_xscale("log")
            if first_result.log_y:
                ax.set_yscale("log")
            ax.set_xlabel(first_result.x_label)
            ax.set_ylabel(first_result.y_label)
            ax.grid(alpha=0.3, which="both")
            if show_legend:
                ax.legend(fontsize=8)
            fig.tight_layout()
            st.pyplot(fig)

# ---------------------------------------------------------------------------
# Catalog Browser tab — real Subfind subhalos as a filterable table
# ---------------------------------------------------------------------------

with tab_catalog:
    finder = st.selectbox(
        "Halo finder", ["Subfind", "AHF", "Rockstar", "CAESAR"],
        help="Subfind is this app's primary finder (same one every other tab uses). AHF/"
             "Rockstar/CAESAR are alternate finders run on the same simulations - useful "
             "for comparing halo definitions/masses across methods.",
    )
    FINDER_SUITE_HINT = {
        "Subfind": "IllustrisTNG, SIMBA, Astrid, or Swift-EAGLE",
        "AHF": "IllustrisTNG or SIMBA",
        "Rockstar": "IllustrisTNG, SIMBA, or Astrid",
        "CAESAR": "IllustrisTNG or SIMBA",
    }
    if finder == "Subfind":
        catalog = B.get_halo_catalog(suite, set_name, realization, fetch_public=fetch_public)
    else:
        catalog = B.get_alt_halo_catalog(finder, suite, set_name, realization, fetch_public=fetch_public)

    if catalog is None:
        st.info(
            "This tab is real-data only - there's no synthetic catalog. Switch **Data "
            f"source** to \"Public data release\" and pick a suite this finder supports "
            f"({FINDER_SUITE_HINT[finder]})."
        )
    else:
        st.caption(f"🟢 real data   ·   {catalog.note}")
        if finder == "Rockstar":
            st.caption("Note: BH Mass is 0 for every halo in this catalog - confirmed real "
                       "(not a parsing bug here) by checking the raw file directly across "
                       "several realizations. CAMELS's public Rockstar run doesn't populate it.")

        mass_col = next(c for c in catalog.frame.columns if c.startswith("Stellar Mass"))
        min_mass_exp = st.slider(
            f"Minimum stellar mass [log10 {mass_col.split('[')[1].rstrip(']')}]", 6.0, 12.0, 8.0, 0.1,
            help="Filters the table below - doesn't refetch data.", key="catalog_min_mass",
        )
        filtered = catalog.frame[catalog.frame[mass_col] >= 10 ** min_mass_exp]
        sorted_frame = filtered.sort_values(mass_col, ascending=False).reset_index(drop=True)

        st.caption(f"Showing {len(sorted_frame)} of {len(catalog.frame)} halos/subhalos.")
        st.dataframe(sorted_frame, width="stretch", height=420)
        st.download_button(
            "Download as CSV", sorted_frame.to_csv(index=False),
            file_name=f"{suite}_{set_name}_{realization}_{finder.lower()}_catalog.csv", mime="text/csv",
        )

        if finder == "Subfind":
            st.divider()
            with st.expander("📈 Trace a subhalo's merger history (SubLink)"):
                st.caption(
                    "Follows the main branch backward via SubLink's FirstProgenitorID - real "
                    "for IllustrisTNG/SIMBA/Astrid. Pick a SubfindID from the table above "
                    "(defaults to the most massive one currently shown)."
                )
                default_id = int(sorted_frame["SubfindID"].iloc[0]) if len(sorted_frame) else 0
                subfind_id = st.number_input(
                    "SubfindID", min_value=0, value=default_id, step=1, key="sublink_subfind_id",
                )
                history = B.get_merger_history(suite, set_name, realization, int(subfind_id),
                                                fetch_public=fetch_public)
                if history is None:
                    st.warning(
                        "No merger history for this SubfindID - either this suite isn't "
                        "supported (IllustrisTNG/SIMBA/Astrid only) or the ID doesn't exist "
                        "in this realization's tree."
                    )
                else:
                    st.caption(f"🟢 real data   ·   {history.note}")
                    fig, ax = plt.subplots(figsize=(7, 4))
                    ax.plot(history.redshift, history.mass, "o-", lw=1.5, ms=4)
                    ax.set_yscale("log")
                    ax.invert_xaxis()
                    ax.set_xlabel("Redshift")
                    ax.set_ylabel("Subhalo Mass [Msun/h]")
                    ax.grid(alpha=0.3, which="both")
                    fig.tight_layout()
                    st.pyplot(fig)
                    st.caption("Redshift decreases left to right (time flows forward); "
                               "z=0 (today) is on the right.")

# ---------------------------------------------------------------------------
# CAMELS-SAM tab — a separate dataset, not tied to any hydro suite, so it
# gets its own controls rather than reusing the sidebar's suite/set/realization
# ---------------------------------------------------------------------------

with tab_sam:
    st.caption(
        "CAMELS-SAM (Santa Cruz Semi-Analytic Model on N-body sims) is a separate dataset - "
        "not tied to the suite selected in the sidebar. Real-data only, same reasoning as the "
        "Catalog Browser tab. Only the LH set is wired up (1000 realizations); CV has an "
        "irregular per-realization structure not yet supported."
    )
    if not fetch_public:
        st.info("Switch **Data source** to \"Public data release\" (in the sidebar) to browse this.")
    else:
        sam_realization = st.slider("SAM realization (LH)", 0, 999, 0, key="sam_realization")
        sam_catalog = B.get_sam_catalog("LH", sam_realization, fetch_public=True)
        if sam_catalog is None:
            st.warning("Couldn't fetch this realization - try another one.")
        else:
            st.caption(f"🟢 real data   ·   {sam_catalog.note}")
            sam_min_mass_exp = st.slider(
                "Minimum stellar mass [log10 Msun]", 5.0, 11.0, 7.0, 0.1,
                help="Filters the table below - doesn't refetch data.", key="sam_min_mass",
            )
            sam_filtered = sam_catalog.frame[
                sam_catalog.frame["Stellar Mass [Msun]"] >= 10 ** sam_min_mass_exp]
            sam_sorted = sam_filtered.sort_values("Stellar Mass [Msun]", ascending=False).reset_index(drop=True)

            if len(sam_filtered) == 0:
                st.warning("No galaxies pass this mass cut - lower the slider.")
            else:
                sam_col1, sam_col2 = st.columns(2)
                with sam_col1:
                    fig, ax = plt.subplots(figsize=(5, 4.5))
                    ax.scatter(sam_filtered["Halo Mass [Msun]"], sam_filtered["Stellar Mass [Msun]"],
                               s=12, alpha=0.5, c="#d62728")
                    ax.set_xscale("log")
                    ax.set_yscale("log")
                    ax.set_xlabel("Halo mass [Msun]")
                    ax.set_ylabel("Stellar mass [Msun]")
                    ax.grid(alpha=0.3, which="both")
                    fig.tight_layout()
                    st.pyplot(fig)
                    st.caption("Stellar mass - halo mass relation for the filtered galaxies.")

                with sam_col2:
                    # Only ~hundreds of points at this dataset's scale, so a plotly
                    # Scatter3d (real axes + native hover) fits better here than the
                    # pydeck point-cloud layer used for the million-particle DM cloud.
                    hover_text = [
                        f"M* = {sm:.2e} Msun<br>Mhalo = {hm:.2e} Msun<br>SFR = {sfr:.3f} Msun/yr"
                        for sm, hm, sfr in zip(
                            sam_filtered["Stellar Mass [Msun]"],
                            sam_filtered["Halo Mass [Msun]"],
                            sam_filtered["SFR [Msun/yr]"],
                        )
                    ]
                    fig = go.Figure(data=[go.Scatter3d(
                        x=sam_filtered["x [Mpc]"], y=sam_filtered["y [Mpc]"], z=sam_filtered["z [Mpc]"],
                        mode="markers",
                        marker=dict(
                            size=4,
                            color=np.log10(sam_filtered["Stellar Mass [Msun]"]),
                            colorscale="Inferno", showscale=True,
                            colorbar=dict(title="log10 M*"),
                        ),
                        text=hover_text, hoverinfo="text",
                    )])
                    fig.update_layout(
                        scene=dict(xaxis_title="x [Mpc]", yaxis_title="y [Mpc]", zaxis_title="z [Mpc]",
                                   aspectmode="data"),
                        margin=dict(l=0, r=0, t=0, b=0),
                        height=450,
                    )
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption("Drag to rotate, scroll to zoom, hover a point for its properties. "
                               "Real galaxy positions (one octant), colored by stellar mass.")

            st.caption(f"Showing {len(sam_sorted)} of {len(sam_catalog.frame)} galaxies.")
            st.dataframe(sam_sorted, width="stretch", height=420)
            st.download_button(
                "Download as CSV", sam_sorted.to_csv(index=False),
                file_name=f"SAM_LH_{sam_realization}_catalog.csv", mime="text/csv",
            )

# ---------------------------------------------------------------------------
# Representative Visualization tab — per-suite promotional render
# ---------------------------------------------------------------------------

with tab_video:
    st.caption(
        "A representative render for the selected **suite** only - it does not "
        "reflect the specific set, realization, snapshot, or parameters chosen "
        "in the sidebar. Source: docs/source/codes.rst in the upstream CAMELS repo."
    )
    video_id = B.SUITE_VIDEOS.get(suite)
    if video_id:
        st.video(f"https://www.youtube.com/watch?v={video_id}")
    else:
        st.info(f"No representative visualization is published for {suite} yet.")

st.divider()
st.subheader("Roadmap — additional slices to layer in")
st.markdown(
    "- ~~**3D density field**: rotatable volume view~~ ✅ done (synthetic data)\n"
    "- ~~**Symbolic-regression SFRH fit**: real, non-synthetic overlay~~ ✅ done\n"
    "- ~~**Representative visualization tab**: per-suite video~~ ✅ done\n"
    "- ~~**Compare mode**: overlay multiple realizations~~ ✅ done (Pk/HMF/SMF/SFRH)\n"
    "- ~~**Real Pk**: live fetch from the public data release~~ ✅ done "
    "(IllustrisTNG/SIMBA/Astrid/Swift-EAGLE only)\n"
    "- ~~**Real HMF/SMF**: live fetch of a public Subfind catalog~~ ✅ done "
    "(z~0 catalog only for now, same 4 suites)\n"
    "- ~~**Halo/subhalo catalog browser**: filterable table + CSV export~~ ✅ done\n"
    "- ~~**Galaxy scaling relations**: radius/BH-mass/SFR/Vmax vs stellar mass~~ ✅ done "
    "(real via the fetched catalog, synthetic fallback otherwise)\n"
    "- ~~**Real 3D density field**: CMD grids (fast) + real-snapshot Pylians gridding (fallback)~~ "
    "✅ done (IllustrisTNG/SIMBA/Astrid; Swift-EAGLE excluded - SWIFT's native HDF5 format "
    "differs from the Gadget-style layout the rest of this app assumes)\n"
    "- ~~**3D particle cloud**: real DM particles, plotly 3D scatter with real axes/hover~~ ✅ done\n"
    "- ~~**General per-field maps**: all 13 CMD fields (T, Z, P, ne, HI, velocities, B, MgFe, "
    "not just Mtot) selectable in the 3D Density Field view~~ ✅ done. Raw-snapshot fallback "
    "covers the 4 mass-type fields (Mtot/Mgas/Mcdm/Mstar); derived-physics fields there "
    "(T/Z/P/ne/HI/velocities/B) remain CMD-only for now - same 3 suites either way\n"
    "- ~~**2D field map viewer**: real CMD 2D maps, all 13 fields~~ ✅ done "
    "(IllustrisTNG/SIMBA/Astrid/Swift-EAGLE - broader suite coverage than the 3D views since "
    "these are precomputed and don't need raw-snapshot gridding; Magneticum excluded on purpose "
    "as a tier-2/access-gated suite; N-body maps use a different filename scheme, not wired up)\n"
    "- **Cinematic renders**: ArepoVTK dead-ended (depends on a pre-2013 AREPO API no longer "
    "in the public release) - py-sphviewer remains open, shell out offline and cache/display "
    "the resulting image/video instead of live-rendering\n"
    "- ~~**Baryon fraction**: real, same Subfind catalog we already fetch~~ ✅ done\n"
    "- ~~**VIDE void catalogs**: real void positions overlaid on the 3D Density Field view~~ "
    "✅ done (IllustrisTNG/LH/z=0 only - the only populated combination in the public release; "
    "synthetic illustrative spheres otherwise)\n"
    "- ~~**CAMELS-SAM catalog browser**: real Santa Cruz semi-analytic-model galaxy catalogs, "
    "SM-halo mass scatter + 3D position view (axes, hover tooltips, colored by stellar mass)~~ "
    "✅ done (LH set only, 1000 realizations; CV excluded - irregular per-realization structure; "
    "real-data only, no synthetic fallback, same reasoning as the Subfind catalog browser)\n"
    "- ~~**X-ray halo profiles**: real per-halo luminosity vs radius, colored by mass~~ ✅ done "
    "(IllustrisTNG/SIMBA only, z=0.05 fixed - the reduced `CAMELS.Xray.hdf5` product; the full "
    "SIMPUT photon-list pipeline is 25-92GB per suite and deliberately out of scope)\n"
    "- ~~**Alternate halo finders**: AHF/Rockstar/CAESAR catalogs alongside Subfind, same "
    "Catalog Browser tab~~ ✅ done (AHF/CAESAR: IllustrisTNG+SIMBA; Rockstar: also Astrid). "
    "~~**SubLink merger history**: real mass accretion history for any Subfind subhalo, "
    "walking FirstProgenitorID~~ ✅ done (IllustrisTNG/SIMBA/Astrid)\n"
    "- ~~**Halo gas profiles (SO_properties)**: real density/pressure/temperature/metallicity "
    "radial profiles per halo, colored by mass~~ ✅ done (IllustrisTNG/SIMBA, LH/CV sets - the "
    "precomputed `Profiles/` product, not a live compute of the heaviest function in the library)\n"
    "- ~~**Color-Mass Diagram**: real SDSS-band galaxy colors vs. real stellar mass, cross-matched "
    "with the Subfind catalog~~ ✅ done (IllustrisTNG/SIMBA/Astrid/Swift-EAGLE, z=0 only)\n"
    "- ~~**Bispectrum**: real equilateral-configuration B(k,k,k) for matter/gas/dark matter~~ "
    "✅ done (IllustrisTNG/SIMBA, LH set only, z=0, real-space low-k estimator; compare mode "
    "works here too)\n"
    "- ~~**Field PDF**: real ensemble mean +/- std histogram shape across all 1000 LH "
    "realizations, per CMD field~~ ✅ done (IllustrisTNG/SIMBA, grid 128/256, z=0/0.5/1/1.5/2 - "
    "x-axis is an uncalibrated bin index since the public release doesn't document bin edges)\n"
    "- ~~**Lyman-alpha Spectrum**: real mock forest sightline, transmitted flux vs pixel~~ "
    "✅ done (IllustrisTNG/SIMBA, all sets, uses the Snapshot slider - try low snapshots for a "
    "saturated, high-z Gunn-Peterson-like spectrum vs. a near-transparent z=0 one)\n"
    "- ~~**Desktop packaging**: native window via `pywebview`~~ ✅ done — run `python desktop.py`\n"
    "- **ML scripts panel**: drive the GAN / autoencoder / params↔SFRH neural nets from `scripts/`\n"
    "- ⏸️ **HPC panel** (parked, not pursuing for now): `setup/` is simulation-*generation* "
    "infrastructure (SLURM submitters that run GIZMO/AREPO on Rusty for days per realization), "
    "not analysis of the existing public release - a different category of tool than everything "
    "else here. Parked rather than built: needs Rusty access (not currently available) and the "
    "actual compiled simulation codes. Worth revisiting if this tool sees wider adoption across "
    "Flatiron and letting researchers launch new CAMELS-like runs becomes a real ask."
)
