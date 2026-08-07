import { useMemo } from 'react';
import { Plotly3DChart } from '../Plotly3DChart/Plotly3DChart';

export type VoidOverlay = {
  positions: number[][]; // (N, 3), Mpc/h
  radius: number[]; // Mpc/h
  densityContrast: number[];
  /** backend.py's VoidCatalog.extra - the file's other real columns
   * (vol, void_id, num_part, tree_level, n_children, ...), None for the
   * synthetic fallback. Same real hover text app.py's own f-string builds. */
  extra?: Record<string, number>[] | null;
};

export type DensityFieldChartProps = {
  density: number[][][]; // (grid, grid, grid), real or synthetic overdensity
  boxSize: number; // Mpc/h
  colorbarTitle: string;
  isoSurfaces: number;
  opacity: number;
  voids?: VoidOverlay | null;
  /** Real (Figma node 1059-415) - App.tsx's Ruler toolbar tool, passed
   * straight through to Plotly3DChart (see its own docs for why this is
   * the one 3D view Ruler targets). */
  rulerMode?: boolean;
};

function percentileOf(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

// Tried and reverted 2026-08-05: log10-transforming `value` (matching the
// 2D Field Map's own LogNorm) on the theory that a real field spanning
// several orders of magnitude crushes structure into near-black under a
// linear scale. Direct user report after shipping: the render got *worse*,
// and a side-by-side Figma comparison against app.py's real Streamlit
// output (same suite/set/realization/field/snapshot, confirmed identical
// isomin/isomax once the actual Snapshot slider value was accounted for)
// showed why - with `surface_count` fixed at 12, LINEAR spacing between
// isomin/isomax spends only 1 of those 12 levels on the "boring" high-
// coverage bulk (>13% of the box) and the other 11 resolving the sparse,
// interesting tail (13%->0.5% coverage) where real cosmic-web structure
// lives; LOG spacing spreads levels evenly in log-space instead, which for
// this same data spent 7 of 12 levels on that same boring bulk and only 5
// resolving the tail - starving the interesting structure of resolution.
// app.py's literal linear approach isn't naive here, it's just well-suited
// to a heavy-tailed distribution's percentile-bounded isosurface budget.
// Reverted to the literal linear `value`/isomin/isomax app.py itself uses.

// Real bug fixed 2026-08-05: passing the string 'Inferno' to plotly.js
// silently falls back to its own default colorscale - unlike Python
// plotly.py (which app.py uses), plotly.js-dist-min's bundle has no
// "Inferno" literal anywhere in it (confirmed by grepping the built bundle),
// only a handful of its own named scales (Viridis, Cividis, etc.). The real
// stops below are `plotly.colors.sequential.Inferno` itself, read directly
// from the installed Python package rather than approximated, spread
// evenly across [0, 1] - this is the exact palette app.py's own Streamlit
// 3D Density Field renders.
//
// Real root cause found 2026-08-07 (the actual explanation for the
// "disconnected blobs vs. continuous web" gap the two attempts above were
// chasing): this trace set `surface_count: isoSurfaces` as a flat key -
// `surface_count` is a plotly.py-only "magic underscore" convenience that
// Python expands into `{"surface": {"count": ...}}` at object-construction
// time, before the figure is ever serialized to JSON. plotly.js has no such
// expansion (confirmed against its own installed schema and shipped
// bundle - no `surface_count` key exists anywhere in it, only nested
// `surface.count`, defaulting to 2). So this trace was silently rendering
// exactly 2 isosurface shells - one at isomin (near-black on Inferno,
// invisible at low opacity) and one at isomax (the sparse, mutually
// disconnected top-0.5%-density halo cores) - regardless of the sidebar's
// own Iso-surfaces value (12 by default). app.py's identical
// `surface_count=iso_surfaces` kwarg genuinely produces 12 real nested
// shells server-side, which is what reads as one continuous, alpha-
// composited structure. Both prior fix attempts above were trying to
// compensate for a 2-shell render with color/opacity/scale tricks, not
// knowing the shell count itself was never actually 12.
const INFERNO_COLORSCALE: [number, string][] = [
  [0 / 9, '#000004'], [1 / 9, '#1b0c41'], [2 / 9, '#4a0c6b'], [3 / 9, '#781c6d'],
  [4 / 9, '#a52c60'], [5 / 9, '#cf4446'], [6 / 9, '#ed6925'], [7 / 9, '#fb9b06'],
  [8 / 9, '#f7d13d'], [9 / 9, '#fcffa4'],
];

// Matches Plotly3DChart's own AXIS_TEXT_COLOR literal - colorbar
// tickfont/titlefont are trace-level (not layout/scene-level), so this
// chart owns its own copy rather than importing a private constant.
const COLORBAR_TEXT_COLOR = '#e5e7eb';

/** 3D Density Field's real chart - a go.Volume trace built from the exact
 * same meshgrid + isomin/isomax-by-percentile recipe app.py itself uses
 * (X,Y,Z = np.meshgrid(coords,coords,coords,indexing="ij"), isomin at the
 * 60th percentile, isomax at the 99.5th), plus a real optional VIDE void
 * overlay (cyan Scatter3d, sized by radius, real hover text) - see
 * DensityFieldChart.mdx. */
export function DensityFieldChart({
  density, boxSize, colorbarTitle, isoSurfaces, opacity, voids, rulerMode,
}: DensityFieldChartProps) {
  const data = useMemo(() => {
    const gridN = density.length;
    const step = gridN > 1 ? boxSize / (gridN - 1) : 0;
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    const value: number[] = [];
    for (let i = 0; i < gridN; i++) {
      for (let j = 0; j < gridN; j++) {
        for (let k = 0; k < gridN; k++) {
          x.push(i * step);
          y.push(j * step);
          z.push(k * step);
          value.push(density[i][j][k]);
        }
      }
    }
    const sorted = [...value].sort((a, b) => a - b);

    const traces: Record<string, unknown>[] = [{
      type: 'volume',
      x, y, z, value,
      isomin: percentileOf(sorted, 0.60),
      isomax: percentileOf(sorted, 0.995),
      opacity,
      surface: { count: isoSurfaces },
      colorscale: INFERNO_COLORSCALE,
      showscale: true,
      colorbar: {
        title: { text: colorbarTitle, font: { color: COLORBAR_TEXT_COLOR } },
        tickfont: { color: COLORBAR_TEXT_COLOR },
      },
    }];

    if (voids) {
      const hoverText = voids.positions.map((_, i) => {
        const r = voids.radius[i];
        const d = voids.densityContrast[i];
        if (voids.extra) {
          const row = voids.extra[i];
          const vol = row['vol [Mpc/h^3]'] ?? row.vol;
          return (
            `r=${r.toFixed(1)} Mpc/h, δ=${d.toFixed(2)}<br>` +
            `void_id=${row.void_id}, num_part=${row.num_part}<br>` +
            `vol=${typeof vol === 'number' ? vol.toFixed(1) : vol} Mpc/h^3, ` +
            `tree_level=${row.tree_level}, n_children=${row.n_children}`
          );
        }
        return `r=${r.toFixed(1)} Mpc/h, δ=${d.toFixed(2)}`;
      });
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: voids.positions.map((p) => p[0]),
        y: voids.positions.map((p) => p[1]),
        z: voids.positions.map((p) => p[2]),
        marker: {
          size: voids.radius.map((r) => Math.min(40, Math.max(6, r * 3))),
          color: 'cyan',
          opacity: 0.35,
          line: { width: 1, color: 'lightcyan' },
        },
        text: hoverText,
        hoverinfo: 'text',
        name: 'VIDE voids',
      });
    }

    return traces;
  }, [density, boxSize, colorbarTitle, isoSurfaces, opacity, voids]);

  // Real fix (2026-08-07, direct user feedback): click-to-pin removed from
  // this statistic - see Plotly3DChart's own `pinEnabled` docs for why it
  // was added here in the first place (a click's real scalar `value` was
  // worth reading out) and why that's no longer wanted. Same `pinEnabled=
  // {false}` pattern ParticleCloudChart already uses, not a new mechanism.
  return <Plotly3DChart data={data} rulerMode={rulerMode} pinEnabled={false} />;
}
