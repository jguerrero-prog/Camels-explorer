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
};

function percentileOf(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

/** 3D Density Field's real chart - a go.Volume trace built from the exact
 * same meshgrid + isomin/isomax-by-percentile recipe app.py itself uses
 * (X,Y,Z = np.meshgrid(coords,coords,coords,indexing="ij"), isomin at the
 * 60th percentile, isomax at the 99.5th), plus a real optional VIDE void
 * overlay (cyan Scatter3d, sized by radius, real hover text) - see
 * DensityFieldChart.mdx. */
export function DensityFieldChart({ density, boxSize, colorbarTitle, isoSurfaces, opacity, voids }: DensityFieldChartProps) {
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
      colorscale: 'Inferno',
      showscale: true,
      colorbar: { title: { text: colorbarTitle } },
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

  return <Plotly3DChart data={data} />;
}
