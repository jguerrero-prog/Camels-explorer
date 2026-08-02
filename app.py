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
import pandas as pd
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
            "4 across the full Snapshot slider range (all 34 real redshifts, not just z=0); "
            "3D Density Field's fast path (CMD grids) covers IllustrisTNG/SIMBA/Astrid, with a "
            "slower real-particle-gridding fallback (needs Pylians) for the same 3. SFR History "
            "still falls back to synthetic (only the symbolic-regression overlay is real)."
        )

    local_path = None
    if data_mode.startswith("Local"):
        local_path = st.text_input("Path to snapshot / subfind file", value="")
        if not B.HAVE_CAMELS_LIBRARY:
            st.warning("`camels_library` (Pylians) isn't installed here, so this "
                       "will still fall back to synthetic data until it is.")

    suite = st.selectbox("Suite", B.SUITES)
    set_name = st.selectbox(
        "Set", list(B.SET_REALIZATIONS.keys()) + ["SB"],
        help="SB (Sobol sequence) is real for IllustrisTNG (SB28) and Astrid (SB7) only - "
             "docs describe it as meant to eventually replace LH for parameter-space sampling.",
    )

    if set_name == "SB":
        sb_folder = B.SB_FOLDER_FOR_SUITE.get(suite)
        if sb_folder is None:
            st.caption(f"⚠️ SB isn't published for {suite} - only IllustrisTNG (SB28) and "
                       "Astrid (SB7) have an SB set.")
        else:
            st.caption(f"Real folder: **{sb_folder}** ({B.SB_REALIZATIONS_FOR_SUITE[suite]} "
                       "realizations)")
        set_name = sb_folder or "SB"  # fetches fail gracefully (honest "no data") if unsupported

    onep_supported = fetch_public and set_name == "1P" and suite == "IllustrisTNG"
    if fetch_public and set_name == "1P" and not onep_supported:
        st.caption(
            "⚠️ 1P's real public folders are named by parameter+variation (e.g. "
            "`1P_p11_2`), not `1P_{realization}` like LH/CV/EX. Real support for this "
            "is only built for **IllustrisTNG** so far (every other suite either uses "
            "a different, unmapped parameter scheme, or doesn't expose enough real "
            "metadata to identify its parameters at all - see backend.py for the full "
            "finding). For this suite, statistics with a synthetic fallback (Pk, HMF, "
            "SMF, Baryon Fraction, SFR History) will silently show 🟡 synthetic data "
            "here even in Public data release mode; real-data-only features show "
            "honest \"no data\" instead."
        )

    n_real = B.SET_REALIZATIONS.get(set_name) or B.SB_REALIZATIONS_FOR_SUITE.get(suite) or 1
    if onep_supported:
        param_options = {p["index"]: p for p in B.ONEP_TNG_PARAMS}
        onep_param_idx = st.selectbox(
            "1P Parameter", list(param_options.keys()),
            format_func=lambda i: f"p{i}: {param_options[i]['name']} ({param_options[i]['category']})",
            help="All 28 real parameters IllustrisTNG's 1P set varies, identified by "
                 "diffing the real FOF_Subfind file's header/config between two "
                 "variations of each index (2026-08-02) - not guessed from docs. "
                 "sigma_8 and n_s (p2, p9) are cosmological parameters set only at "
                 "initial-condition time - they never appear in any output file, so "
                 "they're identified here by elimination against the documented "
                 "5-cosmological/23-astrophysical count, not read directly.",
        )
        onep_variation = st.select_slider(
            "Variation", options=[-2, -1, 0, 1, 2], value=0,
            help="0 is the fiducial (shared baseline) simulation. Real per-parameter "
                 "ranges vary in scale (some linear, some log-spaced) - the real value "
                 "for whatever you pick is shown below once data is fetched, not "
                 "precomputed or interpolated.",
        )
        missing = B.ONEP_TNG_MISSING_VARIATIONS.get(onep_param_idx, set())
        if onep_variation in missing:
            st.warning(f"p{onep_param_idx} has no published variation={onep_variation:+d} "
                       "simulation (a real gap in the public release, not a bug) - pick "
                       "another variation.")
        realization = B.onep_realization_id(onep_param_idx, onep_variation)
        real_value = B.get_onep_param_value(suite, onep_param_idx, onep_variation)
        if real_value is not None:
            st.caption(f"🟢 real value: **{param_options[onep_param_idx]['name']} = {real_value:.4g}**")
        elif onep_variation not in missing:
            st.caption("Real value not directly readable from any output file for this "
                       "parameter (see help above) - only the variation step is shown.")
        compare_mode = False
        compare_realizations = [realization]
    else:
        realization = st.slider("Realization", 0, n_real - 1, min(42, n_real - 1))
        compare_mode = st.checkbox(
            "Compare mode", value=False,
            help="Overlay several realizations of the same set/statistic on one plot.",
        )
        compare_realizations = (
            st.multiselect("Realizations to compare", options=list(range(n_real)),
                            default=sorted({realization, min(realization + 1, n_real - 1)}))
            if compare_mode else [realization]
        )

    snapnum = st.slider("Snapshot", 0, B.N_SNAPSHOTS - 1, B.N_SNAPSHOTS - 1)
    st.caption(f"z ≈ {B._snapshot_to_redshift(snapnum):.2f}")

    st.divider()
    st.header("Statistic")
    statistic = st.radio("Choose a statistic", B.STATISTICS, index=0, label_visibility="collapsed")

    st.divider()
    st.header("Parameters")

    if statistic == "Power Spectrum":
        grid = st.select_slider("Grid size", options=[128, 256, 512, 1024], value=512)
        MAS = st.selectbox("Mass Assignment Scheme", ["NGP", "CIC", "TSC", "PCS"], index=1)
        threads = st.slider("Threads", 1, 16, 1)
        ptype_label = st.selectbox(
            "Particle type", ["Gas [0]", "DM [1]", "Stars [4]", "Black holes [5]", "Total [0,1,4]"],
            index=1,
            help="Black holes [5] is real (Pk_bh) for the same suites as the others, just a "
                 "much noisier curve - CAMELS boxes only have a few hundred BH particles, vs. "
                 "millions of gas/DM/star particles.",
        )
        ptype = {"Gas [0]": [0], "DM [1]": [1], "Stars [4]": [4], "Black holes [5]": [5],
                 "Total [0,1,4]": [0, 1, 4]}[ptype_label]

        show_linear_pk = st.checkbox(
            "Overlay linear-theory Pk (z=0, from ICs)", value=False,
            help="Real CAMB-generated linear matter power spectrum used to seed this exact "
                 "realization's initial conditions - IllustrisTNG/SIMBA/Astrid only. Shown at "
                 "z=0 as-is, not rescaled to the Snapshot slider's redshift (that would need a "
                 "growth-factor calculation this app doesn't otherwise compute).",
        )

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
            help="k1=k2 bispectrum, real-space, z=0.00. Real for IllustrisTNG/SIMBA, LH set "
                 "only - no synthetic fallback.",
        )
        bk_mu_index = st.select_slider(
            "Triangle shape (mu = cos angle between k1, k2)",
            options=list(range(len(B.BK_MU_VALUES))), value=B.BK_EQUILATERAL_MU_INDEX,
            format_func=lambda i: f"{B.BK_MU_VALUES[i]:+.1f}"
            + (" (equilateral)" if i == B.BK_EQUILATERAL_MU_INDEX else ""),
            help="mu=0.5 is the one value that makes k1=k2=k3 truly equilateral. Other values "
                 "keep k1=k2 but change the third side, tracing squeezed (mu→0.9) to "
                 "stretched (mu→-0.9) triangle configurations - a real second axis of this "
                 "statistic beyond just k.",
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
        photometry_sps_model = st.selectbox(
            "SPS model", B.PHOTOMETRY_SPS_MODELS,
            help="Two independent stellar population synthesis models for the same galaxies - "
                 "BC03 (Bruzual & Charlot 2003) and BPASS (includes binary-star evolution). "
                 "Comparing them shows how much a galaxy's inferred color depends on the "
                 "population-synthesis assumption, not just its physical properties.",
        )
        photometry_spectra_type = st.radio(
            "Spectra", B.PHOTOMETRY_SPECTRA_TYPES, horizontal=True,
            help="Dust-attenuated (what a telescope would actually see) vs. intrinsic "
                 "(dust-free) - the difference isolates dust's reddening effect on color.",
        )
        photometry_family = st.selectbox(
            "Filter family", list(B.PHOTOMETRY_FILTER_GROUPS.keys()), index=0,
        )
        family_bands = B.PHOTOMETRY_FILTER_GROUPS[photometry_family]["bands"]
        c1, c2 = st.columns(2)
        photometry_band1 = c1.selectbox("Band 1", family_bands, index=0)
        photometry_band2 = c2.selectbox("Band 2", family_bands, index=min(2, len(family_bands) - 1))
        st.caption(
            f"Plotting {photometry_band1} − {photometry_band2}. Cross-matched with real Subfind "
            "stellar masses via SubhaloIndex at the same snapshot. Real for IllustrisTNG/SIMBA/"
            "Astrid/Swift-EAGLE, using the Snapshot slider above (same 34-snapshot schedule as "
            "Pk/SFRH)."
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
        return B.get_bispectrum(suite, set_name, realization, bk_field, mu_index=bk_mu_index,
                                 fetch_public=fetch_public)
    return B.get_sfr_history(suite, set_name, realization, z_min, z_max, bins,
                              sfrh_path=local_path or None, fetch_public=fetch_public)


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
                                          snapnum=snapnum, fetch_public=fetch_public)
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

        if result.metallicity is not None:
            fig2, ax2 = plt.subplots(figsize=(9, 3.5))
            ax2.plot(result.stellar_mass[populated], result.metallicity[populated], "o-",
                     lw=1.5, ms=4, color="tab:green")
            ax2.set_xscale("log")
            ax2.set_xlabel("Stellar mass [Msun/h]")
            ax2.set_ylabel("Mean stellar metallicity (mass fraction)")
            ax2.grid(alpha=0.3, which="both")
            fig2.tight_layout()
            st.pyplot(fig2)
            st.caption("Mass-metallicity relation - real data only (no synthetic model was "
                       "built for this one, unlike the four panels above).")
        else:
            st.caption("Mass-metallicity panel needs real data - switch to Public data release mode.")

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
            if voids.extra is not None:
                hover_text = [
                    f"r={r:.1f} Mpc/h, δ={d:.2f}<br>void_id={row.void_id}, "
                    f"num_part={row.num_part}<br>vol={row['vol [Mpc/h^3]']:.1f} Mpc/h^3, "
                    f"tree_level={row.tree_level}, n_children={row.n_children}"
                    for (r, d), (_, row) in zip(zip(voids.radius, voids.density_contrast),
                                                 voids.extra.iterrows())
                ]
            else:
                hover_text = [f"r={r:.1f} Mpc/h, δ={d:.2f}" for r, d in
                              zip(voids.radius, voids.density_contrast)]
            traces.append(go.Scatter3d(
                x=voids.positions[:, 0], y=voids.positions[:, 1], z=voids.positions[:, 2],
                mode="markers",
                marker=dict(
                    size=np.clip(voids.radius * 3, 6, 40), color="cyan", opacity=0.35,
                    line=dict(width=1, color="lightcyan"),
                ),
                text=hover_text,
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

        if show_voids and voids.extra is not None:
            with st.expander("Void catalog fields (VIDE)"):
                void_table = pd.DataFrame({
                    "radius [Mpc/h]": voids.radius, "density_contrast": voids.density_contrast,
                }).join(voids.extra)
                st.dataframe(void_table, width="stretch")
                st.download_button(
                    "Download as CSV", void_table.to_csv(index=False),
                    file_name=f"{suite}_{set_name}_{realization}_vide_voids.csv", mime="text/csv",
                )

    elif statistic == "3D Particle Cloud":
        result = B.get_particle_cloud(suite, set_name, realization, max_particles,
                                       snapnum=snapnum, fetch_public=fetch_public)
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

            order = np.argsort(hprof.log_mass)[::-1]  # most massive first
            highlight_rank = st.slider(
                "Highlight halo (by mass rank, 1 = most massive)", 1, len(order), 1,
                key="hprof_highlight_rank",
                help="Shows this halo's profile with error bars derived from the real "
                     "particle-count-per-bin array (`n` in the file) - relative Poisson "
                     "error ~ 1/sqrt(n). illstack_CAMELS doesn't publish an uncertainty "
                     "directly, so this is a real, physically-motivated proxy for it, not a "
                     "fabricated one.",
            )
            hi = int(order[highlight_rank - 1])

            fig, ax = plt.subplots(figsize=(8, 5))
            norm = plt.Normalize(hprof.log_mass.min(), hprof.log_mass.max())
            cmap = plt.get_cmap("viridis")
            for i, (row, mass) in enumerate(zip(hprof.values, hprof.log_mass)):
                if i == hi:
                    continue
                positive = row > 0
                ax.plot(hprof.r[positive], row[positive], color=cmap(norm(mass)), alpha=0.4, lw=1.0)

            hi_row, hi_n = hprof.values[hi], hprof.n_part[hi]
            hi_mask = (hi_row > 0) & (hi_n > 0)
            hi_yerr = hi_row[hi_mask] / np.sqrt(hi_n[hi_mask])
            ax.errorbar(hprof.r[hi_mask], hi_row[hi_mask], yerr=hi_yerr, fmt="o-", ms=4,
                        color="crimson", lw=2, capsize=3, zorder=5,
                        label=f"highlighted (log M200c={hprof.log_mass[hi]:.2f})")
            ax.set_xscale("log")
            ax.set_yscale("log")
            ax.set_xlabel("r [kpc]")
            ax.set_ylabel(f"{hprof.field} [{hprof.units}]")
            ax.grid(alpha=0.3, which="both")
            ax.legend(fontsize=8, loc="upper right")
            sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
            sm.set_array([])
            fig.colorbar(sm, ax=ax, label="log10 M200c [Msun]")
            fig.tight_layout()
            st.pyplot(fig)
            st.caption(f"{len(hprof.log_mass)} halos in this realization, one line each, "
                       "colored by mass. Gaps in a line are radial bins with no resolved "
                       "particles for that halo (e.g. beyond the box, or too far outside a "
                       "smaller halo's profile) - real, not a plotting artifact.")

            with st.expander("Halo metadata (real Group* fields beyond M200c/R200c)"):
                st.caption(
                    f"{hprof.metadata.shape[1]} additional real per-halo fields from this same "
                    "file - SFR, BH mass, alternate mass/radius definitions, gas/star element "
                    "abundances, substructure count, position/velocity, etc."
                )
                st.dataframe(hprof.metadata, width="stretch", height=350)
                st.download_button(
                    "Download as CSV", hprof.metadata.to_csv(index=False),
                    file_name=f"{suite}_{set_name}_{realization}_snap{snapnum:03d}_halo_metadata.csv",
                    mime="text/csv",
                )

    elif statistic == "Color-Mass Diagram":
        cmd_result = B.get_color_mass_diagram(
            suite, set_name, realization, band1=photometry_band1, band2=photometry_band2,
            snapnum=snapnum, sps_model=photometry_sps_model, spectra_type=photometry_spectra_type,
            fetch_public=fetch_public,
        )
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

            fig, (ax, ax2) = plt.subplots(2, 1, figsize=(9, 6), sharex=True)
            ax.plot(lya.pixel, lya.flux, lw=1.2, color="#2b5f8a")
            ax.set_ylim(0, 1.05)
            ax.set_ylabel("transmitted flux (e^-tau)")
            ax.grid(alpha=0.3)
            ax2.plot(lya.pixel, lya.colden, lw=1.2, color="#8a4a2b")
            ax2.set_yscale("log")
            ax2.set_xlabel("spectral pixel (uncalibrated)")
            ax2.set_ylabel("HI column density")
            ax2.grid(alpha=0.3, which="both")
            fig.tight_layout()
            st.pyplot(fig)
            st.caption("A mock Lyman-alpha forest sightline - dips in flux (top) are real "
                       "absorption features from intervening gas. At z=0 the forest is weak "
                       "(mean flux close to 1); try a lower Snapshot for a higher-redshift, more "
                       "absorbed spectrum. The column density panel (bottom) shows the underlying "
                       "HI gas distribution directly - useful in the fully-saturated (flux≈0) "
                       "regime near reionization, where the flux/tau panel alone can't "
                       "distinguish a little HI from a lot.")

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
            if statistic == "Power Spectrum" and show_linear_pk:
                lin = B.get_linear_pk_ics(suite, set_name, realization)
                if lin is not None:
                    k_lin, Pk_lin = lin
                    ax.plot(k_lin, Pk_lin, "k--", lw=1.5, label="linear theory, z=0 (from ICs)")
                    show_legend = True
                else:
                    st.caption("Linear-theory Pk isn't available for this suite/set/realization.")

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
        "Halo finder", ["Subfind", "AHF", "Rockstar", "CAESAR", "CAESAR Galaxies"],
        help="Subfind is this app's primary finder (same one every other tab uses). AHF/"
             "Rockstar/CAESAR are alternate finders run on the same simulations - useful "
             "for comparing halo definitions/masses across methods. CAESAR Galaxies is a "
             "different granularity - CAESAR's 6D-FOF galaxy catalog (sub-halo scale), not "
             "another halo finder - each row links back to a CAESAR halo via Parent Halo Index.",
    )
    FINDER_SUITE_HINT = {
        "Subfind": "IllustrisTNG, SIMBA, Astrid, or Swift-EAGLE",
        "AHF": "IllustrisTNG or SIMBA",
        "Rockstar": "IllustrisTNG, SIMBA, or Astrid",
        "CAESAR": "IllustrisTNG or SIMBA",
        "CAESAR Galaxies": "IllustrisTNG or SIMBA",
    }
    if finder == "Subfind":
        catalog = B.get_halo_catalog(suite, set_name, realization, snapnum=snapnum,
                                      fetch_public=fetch_public)
    else:
        catalog = B.get_alt_halo_catalog(finder, suite, set_name, realization, snapnum=snapnum,
                                          fetch_public=fetch_public)

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

        show_all_fields = st.checkbox(
            "Show all available fields (raw)", value=False, key="catalog_show_all_fields",
            help="The curated columns above are a hand-picked subset. This file has real "
                 "columns beyond them - toggle to see everything this catalog actually has, "
                 "not just what we chose to name/convert units for.",
            disabled=catalog.raw_frame is None,
        )
        display_frame = catalog.raw_frame if (show_all_fields and catalog.raw_frame is not None) else catalog.frame

        mass_col = next(c for c in catalog.frame.columns if c.startswith("Stellar Mass"))
        min_mass_exp = st.slider(
            f"Minimum stellar mass [log10 {mass_col.split('[')[1].rstrip(']')}]", 6.0, 12.0, 8.0, 0.1,
            help="Filters the table below - doesn't refetch data.", key="catalog_min_mass",
        )
        filtered = display_frame[display_frame[mass_col] >= 10 ** min_mass_exp]
        sorted_frame = filtered.sort_values(mass_col, ascending=False).reset_index(drop=True)

        if show_all_fields and catalog.raw_frame is not None:
            st.caption(f"Showing all {len(display_frame.columns)} available fields "
                       f"(vs. {len(catalog.frame.columns)} curated ones above).")
        st.caption(f"Showing {len(sorted_frame)} of {len(catalog.frame)} halos/subhalos.")
        st.dataframe(sorted_frame, width="stretch", height=420)
        st.download_button(
            "Download as CSV", sorted_frame.to_csv(index=False),
            file_name=f"{suite}_{set_name}_{realization}_{finder.lower()}_catalog.csv", mime="text/csv",
        )

        st.divider()
        with st.expander("📊 Quick plot (any field, any finder)"):
            st.caption(
                "Pick any two real fields from this catalog and plot them against each "
                "other - works with whatever's currently shown above (toggle 'show all "
                "fields' for the full raw set first). No new data is fetched; this plots "
                "what's already loaded."
            )
            numeric_cols = [c for c in display_frame.columns
                            if pd.api.types.is_numeric_dtype(display_frame[c])]
            if len(numeric_cols) < 1:
                st.info("No numeric fields available to plot.")
            else:
                qp_type = st.radio(
                    "Chart type", ["Scatter", "Histogram", "Box Plot", "Heatmap", "3D Scatter"],
                    horizontal=True, key="qp_chart_type",
                )
                if qp_type == "Scatter":
                    c1, c2, c3 = st.columns(3)
                    qp_x = c1.selectbox("X field", numeric_cols, index=0, key="qp_x")
                    qp_y = c2.selectbox("Y field", numeric_cols,
                                         index=min(1, len(numeric_cols) - 1), key="qp_y")
                    qp_color = c3.selectbox("Color by (optional)", ["None"] + numeric_cols,
                                             key="qp_color")
                    c4, c5 = st.columns(2)
                    qp_logx = c4.checkbox("Log X", value=True, key="qp_logx")
                    qp_logy = c5.checkbox("Log Y", value=True, key="qp_logy")

                    # Extract each series independently (not via a multi-column
                    # DataFrame selection) - qp_x/qp_y/qp_color can legitimately
                    # be the same column name, and selecting a DataFrame with
                    # duplicate column labels returns an ambiguous multi-column
                    # result instead of a clean Series, breaking everything
                    # downstream (a real bug caught via testing, not theoretical).
                    x_vals = display_frame[qp_x]
                    y_vals = display_frame[qp_y]
                    color_vals = display_frame[qp_color] if qp_color != "None" else None

                    mask = x_vals.notna() & y_vals.notna()
                    if color_vals is not None:
                        mask &= color_vals.notna()
                    if qp_logx:
                        mask &= x_vals > 0
                    if qp_logy:
                        mask &= y_vals > 0

                    x_vals, y_vals = x_vals[mask], y_vals[mask]
                    color_vals = color_vals[mask] if color_vals is not None else None

                    marker = dict(size=6, opacity=0.7)
                    if color_vals is not None:
                        marker.update(color=color_vals, colorscale="Viridis",
                                       showscale=True, colorbar=dict(title=qp_color))
                    fig = go.Figure(go.Scatter(
                        x=x_vals, y=y_vals, mode="markers", marker=marker,
                        text=[f"{qp_x}={xv:.4g}<br>{qp_y}={yv:.4g}"
                              for xv, yv in zip(x_vals, y_vals)],
                        hoverinfo="text",
                    ))
                    fig.update_xaxes(type="log" if qp_logx else "linear", title=qp_x)
                    fig.update_yaxes(type="log" if qp_logy else "linear", title=qp_y)
                    fig.update_layout(height=450, margin=dict(l=10, r=10, t=10, b=10))
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption(f"{len(x_vals)} of {len(display_frame)} rows shown"
                               + (" (log-scale axes hide non-positive values)."
                                  if qp_logx or qp_logy else "."))
                elif qp_type == "Histogram":
                    c1, c2 = st.columns(2)
                    qp_field = c1.selectbox("Field", numeric_cols, index=0, key="qp_hist_field")
                    qp_hist_logx = c2.checkbox("Log X", value=True, key="qp_hist_logx")
                    vals = display_frame[qp_field].dropna()
                    vals_plot = vals[vals > 0] if qp_hist_logx else vals
                    fig = go.Figure(go.Histogram(x=vals_plot, nbinsx=40))
                    fig.update_xaxes(type="log" if qp_hist_logx else "linear", title=qp_field)
                    fig.update_yaxes(title="Count")
                    fig.update_layout(height=400, margin=dict(l=10, r=10, t=10, b=10))
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption(f"{len(vals_plot)} of {len(display_frame)} rows shown"
                               + (" (log-scale hides non-positive values)." if qp_hist_logx else "."))

                elif qp_type == "Box Plot":
                    st.caption("Groups rows into bins along the X field, then shows the "
                               "real spread (median/quartiles/outliers) of the Y field within "
                               "each bin - the distribution behind a trend, not just its mean.")
                    c1, c2, c3 = st.columns(3)
                    qp_bx = c1.selectbox("X field (binned)", numeric_cols, index=0, key="qp_box_x")
                    qp_by = c2.selectbox("Y field", numeric_cols,
                                          index=min(1, len(numeric_cols) - 1), key="qp_box_y")
                    qp_box_bins = c3.slider("Bins", 3, 15, 6, key="qp_box_bins")
                    qp_box_logx = st.checkbox("Log-spaced X bins", value=True, key="qp_box_logx")

                    x_vals = display_frame[qp_bx]
                    y_vals = display_frame[qp_by]
                    mask = x_vals.notna() & y_vals.notna()
                    if qp_box_logx:
                        mask &= x_vals > 0
                    x_vals, y_vals = x_vals[mask], y_vals[mask]

                    if len(x_vals) < qp_box_bins:
                        st.info("Not enough rows to form the requested number of bins.")
                    else:
                        edges = (np.logspace(np.log10(x_vals.min()), np.log10(x_vals.max()),
                                              qp_box_bins + 1) if qp_box_logx else
                                 np.linspace(x_vals.min(), x_vals.max(), qp_box_bins + 1))
                        bin_idx = np.clip(np.digitize(x_vals, edges) - 1, 0, qp_box_bins - 1)
                        bin_labels = [f"{edges[i]:.3g}-{edges[i+1]:.3g}" for i in range(qp_box_bins)]
                        x_bin_labels = np.array(bin_labels)[bin_idx]
                        fig = go.Figure(go.Box(x=x_bin_labels, y=y_vals, boxpoints="outliers"))
                        fig.update_xaxes(title=f"{qp_bx} (bin range)", categoryorder="array",
                                          categoryarray=bin_labels)
                        fig.update_yaxes(title=qp_by)
                        fig.update_layout(height=450, margin=dict(l=10, r=10, t=10, b=10))
                        st.plotly_chart(fig, use_container_width=True)
                        st.caption(f"{len(x_vals)} of {len(display_frame)} rows shown across "
                                   f"{qp_box_bins} bins.")

                elif qp_type == "Heatmap":
                    st.caption("2D histogram (point density) - more readable than a scatter "
                               "plot when there are enough rows for overplotting to be an "
                               "issue.")
                    c1, c2, c3 = st.columns(3)
                    qp_hx = c1.selectbox("X field", numeric_cols, index=0, key="qp_heat_x")
                    qp_hy = c2.selectbox("Y field", numeric_cols,
                                          index=min(1, len(numeric_cols) - 1), key="qp_heat_y")
                    qp_heat_bins = c3.slider("Bins per axis", 10, 80, 30, key="qp_heat_bins")
                    c4, c5 = st.columns(2)
                    qp_heat_logx = c4.checkbox("Log X", value=True, key="qp_heat_logx")
                    qp_heat_logy = c5.checkbox("Log Y", value=True, key="qp_heat_logy")

                    x_vals = display_frame[qp_hx]
                    y_vals = display_frame[qp_hy]
                    mask = x_vals.notna() & y_vals.notna()
                    if qp_heat_logx:
                        mask &= x_vals > 0
                    if qp_heat_logy:
                        mask &= y_vals > 0
                    x_vals, y_vals = x_vals[mask], y_vals[mask]
                    x_plot = np.log10(x_vals) if qp_heat_logx else x_vals
                    y_plot = np.log10(y_vals) if qp_heat_logy else y_vals

                    fig = go.Figure(go.Histogram2d(
                        x=x_plot, y=y_plot, nbinsx=qp_heat_bins, nbinsy=qp_heat_bins,
                        colorscale="Viridis", colorbar=dict(title="count"),
                    ))
                    fig.update_xaxes(title=f"log10({qp_hx})" if qp_heat_logx else qp_hx)
                    fig.update_yaxes(title=f"log10({qp_hy})" if qp_heat_logy else qp_hy)
                    fig.update_layout(height=450, margin=dict(l=10, r=10, t=10, b=10))
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption(f"{len(x_vals)} of {len(display_frame)} rows shown"
                               + (" (log-scale bins hide non-positive values)."
                                  if qp_heat_logx or qp_heat_logy else "."))

                else:  # 3D Scatter
                    c1, c2, c3 = st.columns(3)
                    qp_3x = c1.selectbox("X field", numeric_cols, index=0, key="qp_3d_x")
                    qp_3y = c2.selectbox("Y field", numeric_cols,
                                          index=min(1, len(numeric_cols) - 1), key="qp_3d_y")
                    qp_3z = c3.selectbox("Z field", numeric_cols,
                                          index=min(2, len(numeric_cols) - 1), key="qp_3d_z")
                    qp_3color = st.selectbox("Color by (optional)", ["None"] + numeric_cols,
                                              key="qp_3d_color")
                    c4, c5, c6 = st.columns(3)
                    qp_3logx = c4.checkbox("Log X", value=False, key="qp_3d_logx")
                    qp_3logy = c5.checkbox("Log Y", value=False, key="qp_3d_logy")
                    qp_3logz = c6.checkbox("Log Z", value=False, key="qp_3d_logz")

                    x_vals = display_frame[qp_3x]
                    y_vals = display_frame[qp_3y]
                    z_vals = display_frame[qp_3z]
                    color_vals = display_frame[qp_3color] if qp_3color != "None" else None
                    mask = x_vals.notna() & y_vals.notna() & z_vals.notna()
                    if color_vals is not None:
                        mask &= color_vals.notna()
                    if qp_3logx:
                        mask &= x_vals > 0
                    if qp_3logy:
                        mask &= y_vals > 0
                    if qp_3logz:
                        mask &= z_vals > 0
                    x_vals, y_vals, z_vals = x_vals[mask], y_vals[mask], z_vals[mask]
                    color_vals = color_vals[mask] if color_vals is not None else None

                    marker = dict(size=3, opacity=0.7)
                    if color_vals is not None:
                        marker.update(color=color_vals, colorscale="Viridis",
                                       showscale=True, colorbar=dict(title=qp_3color))
                    fig = go.Figure(go.Scatter3d(
                        x=x_vals, y=y_vals, z=z_vals, mode="markers", marker=marker,
                        text=[f"{qp_3x}={xv:.4g}<br>{qp_3y}={yv:.4g}<br>{qp_3z}={zv:.4g}"
                              for xv, yv, zv in zip(x_vals, y_vals, z_vals)],
                        hoverinfo="text",
                    ))
                    fig.update_layout(
                        scene=dict(
                            xaxis=dict(title=qp_3x, type="log" if qp_3logx else "linear"),
                            yaxis=dict(title=qp_3y, type="log" if qp_3logy else "linear"),
                            zaxis=dict(title=qp_3z, type="log" if qp_3logz else "linear"),
                        ),
                        height=550, margin=dict(l=0, r=0, t=10, b=0),
                    )
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption(f"{len(x_vals)} of {len(display_frame)} rows shown. Drag to "
                               "rotate, scroll to zoom, hover a point for its exact values.")

        if finder == "CAESAR Galaxies":
            st.divider()
            with st.expander("📈 Galaxy scaling relations (CAESAR)"):
                st.caption(
                    "Same idea as the Subfind-based Scaling Relations statistic, from "
                    "CAESAR's own galaxy catalog instead - individual galaxies shown "
                    "directly (not binned/averaged), since this catalog is much smaller "
                    "(hundreds, not thousands, of galaxies)."
                )
                gal = sorted_frame[sorted_frame["Stellar Mass [Msun]"] > 0]
                fig, axes = plt.subplots(1, 3, figsize=(13, 4))
                panels = [
                    ("Stellar Half-Mass Radius [kpc/h]", "Stellar half-mass radius [kpc/h]"),
                    ("BH Mass [Msun]", "BH mass [Msun]"),
                    ("SFR [Msun/yr]", "SFR [Msun/yr]"),
                ]
                for ax, (col, ylabel) in zip(axes, panels):
                    y = gal[col].to_numpy()
                    mask = y > 0
                    ax.scatter(gal["Stellar Mass [Msun]"][mask], y[mask], s=10, alpha=0.5)
                    ax.set_xscale("log")
                    ax.set_yscale("log")
                    ax.set_xlabel("Stellar mass [Msun]")
                    ax.set_ylabel(ylabel)
                    ax.grid(alpha=0.3, which="both")
                fig.tight_layout()
                st.pyplot(fig)
                st.caption(f"{len(gal)} galaxies with real stellar mass shown. In the SFR/BH "
                           "mass panels, galaxies with a value of exactly 0 are omitted from "
                           "that panel only (real - not every galaxy has star formation or a "
                           "resolved BH), not dropped from the catalog.")

        st.divider()
        with st.expander("🔬 Compare Halo Mass Function across finders"):
            st.caption(
                "Overlays halo-mass-function shape from every finder that has real data "
                "for this suite/set/realization/snapshot - comparing halo-finding methods "
                "on the same simulation is a genuine, recognized cosmology research "
                "pattern. AHF/Rockstar are filtered to distinct host halos only (their "
                "real tables mix in subhalos/substructure, which would otherwise inflate "
                "the low-mass end against Subfind's FOF groups and CAESAR's halo_data, "
                "both host-only already) - what's left is a genuine, known difference in "
                "how each method defines halo mass (e.g. FOF vs. spherical-overdensity "
                "virial mass conventions), not a counting artifact. Not Ωm-normalized like "
                "the standalone Halo Mass Function statistic - see the info icon there for "
                "why."
            )
            c1, c2, c3 = st.columns(3)
            cf_min = c1.number_input("Min mass [Msun/h]", value=1e10, format="%e", key="cf_hmf_min")
            cf_max = c2.number_input("Max mass [Msun/h]", value=1e14, format="%e", key="cf_hmf_max")
            cf_bins = c3.slider("Bins", 5, 40, 20, key="cf_hmf_bins")
            hmf_results = B.get_cross_finder_hmf(suite, set_name, realization, snapnum,
                                                  cf_min, cf_max, cf_bins, fetch_public=fetch_public)
            if not hmf_results:
                st.info("No finder has real halo data for this suite/set/realization/snapshot - "
                        "switch to Public data release mode and pick IllustrisTNG or SIMBA.")
            else:
                fig, ax = plt.subplots(figsize=(8, 4.5))
                for name, r in hmf_results.items():
                    ax.plot(r.x, r.y, "o-", lw=1.5, ms=4, label=name)
                ax.set_xscale("log")
                ax.set_yscale("log")
                ax.set_xlabel("Halo Mass [Msun/h]")
                ax.set_ylabel("dn/dlogM [(Mpc/h)^-3]")
                ax.grid(alpha=0.3, which="both")
                ax.legend(fontsize=8)
                fig.tight_layout()
                st.pyplot(fig)
                for name, r in hmf_results.items():
                    st.caption(f"**{name}**: {r.note}")
                missing = set(["Subfind", "AHF", "Rockstar", "CAESAR"]) - set(hmf_results.keys())
                if missing:
                    st.caption(f"No real data for: {', '.join(missing)}")

        if finder == "Subfind":
            st.divider()
            with st.expander("📈 Trace a subhalo's merger history (SubLink)"):
                st.caption(
                    "Follows the main branch backward via SubLink's FirstProgenitorID - real "
                    "for IllustrisTNG/SIMBA/Astrid. Pick a SubfindID from the table above - "
                    "it's looked up at the current Snapshot slider value, since SubfindID only "
                    "means something within its own snapshot's catalog (defaults to the most "
                    "massive one currently shown)."
                )
                default_id = int(sorted_frame["SubfindID"].iloc[0]) if len(sorted_frame) else 0
                subfind_id = st.number_input(
                    "SubfindID", min_value=0, value=default_id, step=1, key="sublink_subfind_id",
                )
                sublink_variant = st.radio(
                    "Merger tree", ["SubLink", "SubLink_gal"], horizontal=True, key="sublink_variant",
                    help="SubLink links subhalos via their dark-matter particles (the standard "
                         "tree). SubLink_gal links via baryonic (gas/star) particles instead - a "
                         "distinct, galaxy-centric merger history, not just a naming variant. "
                         "Same real schema, so both are wired through the same code.",
                )
                history = B.get_merger_history(suite, set_name, realization, int(subfind_id),
                                                root_snapnum=snapnum, variant=sublink_variant,
                                                fetch_public=fetch_public)
                if history is None:
                    st.warning(
                        "No merger history for this SubfindID - either this suite isn't "
                        "supported (IllustrisTNG/SIMBA/Astrid only) or the ID doesn't exist "
                        "in this realization's tree at the current snapshot."
                    )
                else:
                    st.caption(f"🟢 real data   ·   {history.note}")
                    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(11, 4))
                    ax.plot(history.redshift, history.mass, "o-", lw=1.5, ms=4)
                    ax.set_yscale("log")
                    ax.invert_xaxis()
                    ax.set_xlabel("Redshift")
                    ax.set_ylabel("Subhalo Mass [Msun/h]")
                    ax.grid(alpha=0.3, which="both")
                    ax2.plot(history.redshift, history.num_particles, "o-", lw=1.5, ms=4, color="tab:orange")
                    ax2.set_yscale("log")
                    ax2.invert_xaxis()
                    ax2.set_xlabel("Redshift")
                    ax2.set_ylabel("NumParticles")
                    ax2.grid(alpha=0.3, which="both")
                    fig.tight_layout()
                    st.pyplot(fig)
                    st.caption("Redshift decreases left to right (time flows forward); z=0 (or "
                               "the root snapshot) is on the right. NumParticles alongside Mass "
                               "helps distinguish a genuine major merger (both jump together) "
                               "from a low-resolution subhalo being absorbed (particle count was "
                               "already small).")

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
            sam_show_all_fields = st.checkbox(
                "Show all available fields (raw)", value=False, key="sam_show_all_fields",
                help="The curated columns above are a hand-picked subset of the real GALPROP "
                     "file (41 columns total) - toggle to see the rest (e.g. mass_outflow_rate, "
                     "sfrave1gyr, r_disk, tmerge).",
                disabled=sam_catalog.raw_frame is None,
            )
            sam_filtered = sam_catalog.frame[
                sam_catalog.frame["Stellar Mass [Msun]"] >= 10 ** sam_min_mass_exp]
            sam_sorted = sam_filtered.sort_values("Stellar Mass [Msun]", ascending=False).reset_index(drop=True)

            if sam_show_all_fields and sam_catalog.raw_frame is not None:
                sam_table_frame = sam_catalog.raw_frame[
                    sam_catalog.raw_frame["Stellar Mass [Msun]"] >= 10 ** sam_min_mass_exp
                ].sort_values("Stellar Mass [Msun]", ascending=False).reset_index(drop=True)
            else:
                sam_table_frame = sam_sorted

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

            if sam_show_all_fields and sam_catalog.raw_frame is not None:
                st.caption(f"Showing all {len(sam_table_frame.columns)} available fields "
                           f"(vs. {len(sam_catalog.frame.columns)} curated ones above).")
            st.caption(f"Showing {len(sam_table_frame)} of {len(sam_catalog.frame)} galaxies.")
            st.dataframe(sam_table_frame, width="stretch", height=420)
            st.download_button(
                "Download as CSV", sam_table_frame.to_csv(index=False),
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
    "(IllustrisTNG/SIMBA/Astrid/Swift-EAGLE; gas/DM/stars/total, plus black holes - `Pk_bh` was "
    "real but unexposed, now a 5th Particle type option, noisier since CAMELS boxes only have a "
    "few hundred BH particles)\n"
    "- ~~**Real HMF/SMF/Baryon Fraction/Catalog Browser/Scaling Relations**: live fetch of a "
    "public Subfind catalog~~ ✅ done - full 34-snapshot range via the Snapshot slider (all real "
    "redshifts, not just the z~0 catalog), same 4 suites. SubfindID cross-references (SubLink "
    "merger history) now use the same snapshot the catalog is browsing at, not a hardcoded z=0\n"
    "- ~~**Halo/subhalo catalog browser**: filterable table + CSV export~~ ✅ done\n"
    "- ~~**Galaxy scaling relations**: radius/BH-mass/SFR/Vmax vs stellar mass~~ ✅ done "
    "(real via the fetched catalog, synthetic fallback otherwise, full snapshot range; a 5th "
    "mass-metallicity panel is real-only, no synthetic model built for it)\n"
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
    "synthetic illustrative spheres otherwise; full field set - vol, vol_norm, void_id, "
    "num_part, parent_id, tree_level, n_children, central_density - in an expander table below "
    "the 3D view, not just position/radius/density_contrast)\n"
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
    "walking FirstProgenitorID~~ ✅ done (IllustrisTNG/SIMBA/Astrid; alongside Mass, a real "
    "NumParticles panel helps tell a genuine major merger from a low-resolution subhalo "
    "being absorbed; traces from the Catalog Browser's current snapshot, not always z=0). "
    "~~**SubLink_gal**: baryon-particle-linked merger tree, alongside standard SubLink~~ "
    "✅ done (same real schema, reuses the same code, just a different real folder)\n"
    "- ~~**CAESAR Galaxies**: CAESAR's 6D-FOF galaxy catalog (sub-halo scale), a distinct "
    "granularity from the existing halo finders~~ ✅ done (IllustrisTNG/SIMBA; real, "
    "precomputed `galaxy_data` from the same file already used for CAESAR halos - masses, "
    "SFR, radii, position, ~100-filter real photometry, rotation/kinematics, and "
    "`Parent Halo Index` linking each galaxy back to its CAESAR halo row. The raw "
    "`fof6d_tags` file - what \"CAESAR fof6d\" originally meant - turned out to be a genuine "
    "dead end: confirmed via CAESAR's own GitHub source that its particle indices only cover "
    "a density/temperature-filtered, internally-resorted subset with no public documentation "
    "of the exact ordering - not safely decodable without re-implementing CAESAR's internal "
    "pipeline. `galaxy_data` achieves the same underlying goal safely instead.)\n"
    "- ~~**Halo gas profiles (SO_properties)**: real density/pressure/temperature/metallicity "
    "radial profiles per halo, colored by mass~~ ✅ done (IllustrisTNG/SIMBA, LH/CV sets - the "
    "precomputed `Profiles/` product, not a live compute of the heaviest function in the library; "
    "a highlighted halo gets real error bars derived from the file's own per-bin particle-count "
    "array (`n`, relative Poisson error ~ 1/sqrt(n)); an expander below exposes the other 44 "
    "real per-halo Group* fields this file has beyond M200c/R200c - SFR, BH mass, alternate mass/"
    "radius definitions, gas/star element abundances, etc.)\n"
    "- ~~**Color-Mass Diagram**: real galaxy colors vs. real stellar mass, cross-matched with the "
    "Subfind catalog~~ ✅ done (IllustrisTNG/SIMBA/Astrid/Swift-EAGLE; full 34-snapshot range, "
    "not just z=0; both BC03 and BPASS SPS models; attenuated/intrinsic toggle; any 2-band color "
    "across all 6 real filter families - SLOAN, Generic/Johnson, HST, JWST, UKIRT, UV/GALEX - "
    "not just 5 fixed SDSS colors)\n"
    "- ~~**Bispectrum**: real k1=k2 B(k) for matter/gas/dark matter~~ ✅ done (IllustrisTNG/SIMBA, "
    "LH set only, z=0, real-space low-k estimator; compare mode works here too; a mu-bin slider "
    "exposes all 10 real triangle-shape configurations, not just the equilateral mu=0.5 one)\n"
    "- ~~**Field PDF**: real ensemble mean +/- std histogram shape across all 1000 LH "
    "realizations, per CMD field~~ ✅ done (IllustrisTNG/SIMBA, grid 128/256, z=0/0.5/1/1.5/2 - "
    "x-axis is an uncalibrated bin index since the public release doesn't document bin edges)\n"
    "- ~~**Lyman-alpha Spectrum**: real mock forest sightline, transmitted flux vs pixel~~ "
    "✅ done (IllustrisTNG/SIMBA, all sets, uses the Snapshot slider - try low snapshots for a "
    "saturated, high-z Gunn-Peterson-like spectrum vs. a near-transparent z=0 one; a second "
    "panel shows the real HI column density alongside flux/tau - useful in the fully-saturated "
    "regime where flux/tau alone can't distinguish a little HI from a lot)\n"
    "- ~~**Show all available fields**: raw-column escape hatch in the Catalog Browser + "
    "CAMELS-SAM tabs~~ ✅ done (AHF/Rockstar/CAESAR/Subfind/CAMELS-SAM each parse far more real "
    "columns than the curated table shows - e.g. CAESAR has 118, Subfind 72 - a checkbox now "
    "surfaces all of them, no new fetching needed, it was already in memory)\n"
    "- ~~**Catalog Browser plots**: every halo finder (AHF/Rockstar/CAESAR/CAESAR Galaxies) "
    "was table-only, no visualization~~ ✅ done, three additions: (1) a generic \"Quick plot\" "
    "expander - pick any real fields (curated or raw) from whichever finder is selected, "
    "**5 chart types** (Scatter, Histogram, Box Plot, Heatmap, 3D Scatter), log-scale toggles, "
    "optional color-by field - works identically for every finder including Subfind, no new "
    "fetching (plots what's already loaded). Box Plot bins the X field and shows the real "
    "spread of Y per bin, not just a mean trend; Heatmap is a 2D histogram for catalogs large "
    "enough that a scatter plot overplots; 3D Scatter reuses this app's existing Scatter3d "
    "pattern (native axes/hover) with independent log toggles per axis. Caught and fixed a "
    "real bug during testing (applies to all 5 chart types): selecting the same field for two "
    "different axes/color and selecting a DataFrame by a list of column names with a repeated "
    "name returns an ambiguous multi-column result, not a clean Series - fixed by extracting "
    "every field as its own independent Series rather than a multi-column selection. "
    "(2) a CAESAR-Galaxies-specific 3-panel scaling-relations view (radius/BH-mass/SFR vs "
    "stellar mass, individual galaxies since the catalog is small); (3) a \"Compare Halo Mass "
    "Function across finders\" expander overlaying real dn/dlogM shape from Subfind/AHF/"
    "Rockstar/CAESAR on one plot - the real cross-finder-comparison pattern already "
    "anticipated by an earlier ticket in this project's own roadmap, not Ωm-normalized like "
    "the standalone HMF statistic since Ωm isn't available for the alternate finders and "
    "varies across LH/1P/SB sets anyway. Caught and fixed a real confound after the user "
    "pushed back on how meaningful the comparison actually was: AHF/Rockstar's real tables "
    "mix subhalos/substructure in with distinct host halos (confirmed via their real "
    "`hostHalo`/`pid` fields - 101/3141 for AHF, 414/5903 for Rockstar in one realization), "
    "while Subfind's FOF groups and CAESAR's halo_data are host-only already - counting "
    "substructure as independent halos inflated AHF/Rockstar's low-mass end for a reason "
    "unrelated to genuine finder disagreement. Now filtered to host-only for both, so what "
    "remains isolates the real, legitimate difference (FOF vs. spherical-overdensity virial "
    "mass conventions genuinely disagree in the literature), not a counting artifact.\n"
    "- ~~**Desktop packaging**: native window via `pywebview`~~ ✅ done — run `python desktop.py`\n"
    "- **ML scripts panel**: drive the GAN / autoencoder / params↔SFRH neural nets from `scripts/`\n"
    "- ~~**1P set real-data fetching (IllustrisTNG)**~~ ✅ done (2026-08-02): 1P's real public "
    "folders are compound-named by parameter+variation (`1P_p11_2`), not `1P_{realization}` "
    "like every other set. All 28 real parameters identified by diffing the real FOF_Subfind "
    "file's header/config between two variations of each index (not guessed from docs) - "
    "sigma_8/n_s (p2, p9) are the only two not directly readable, since they're set only at "
    "initial-condition time and never written to any output file; identified by elimination "
    "instead. A parameter+variation picker replaces the realization slider when IllustrisTNG+1P "
    "is selected, and every real-data fetcher gets the right file for free (they already build "
    "their URL as `{set_name}_{realization}` - passing the compound string as `realization` "
    "just works, no fetcher changes needed). Covers Power Spectrum, HMF/SMF/Baryon Fraction, "
    "Scaling Relations, Catalog Browser (Subfind/Rockstar/CAESAR), SubLink, and Photometry/"
    "Color-Mass Diagram - verified end-to-end with real data. **Not covered**: SIMBA/Astrid/"
    "Swift-EAGLE (SIMBA and Astrid's astrophysical parameters mostly aren't exposed in their "
    "own output files' metadata either, so most of their 28/7 parameters can't be named or "
    "valued this way - a real data limitation, not a missing feature); AHF, Halo Gas Profiles, "
    "and Lyman-alpha (these three use a completely different, older 1P naming scheme - 6 "
    "parameters, 11 variations each, `1P_{idx}_{variation}` with no \"p\" - confirmed via a "
    "real directory listing, not yet wired up)\n"
    "- ⏸️ **HPC panel** (parked, not pursuing for now): `setup/` is simulation-*generation* "
    "infrastructure (SLURM submitters that run GIZMO/AREPO on Rusty for days per realization), "
    "not analysis of the existing public release - a different category of tool than everything "
    "else here. Parked rather than built: needs Rusty access (not currently available) and the "
    "actual compiled simulation codes. Worth revisiting if this tool sees wider adoption across "
    "Flatiron and letting researchers launch new CAMELS-like runs becomes a real ask."
)
