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
      surface_count: isoSurfaces,
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

  return <Plotly3DChart data={data} rulerMode={rulerMode} />;
}
