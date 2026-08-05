import { useMemo } from 'react';
import { Plotly3DChart } from '../Plotly3DChart/Plotly3DChart';

export type ParticleCloudChartProps = {
  positions: number[][]; // (N, 3), Mpc/h - real or synthetic clustered DM particles
};

/** 3D Particle Cloud's real chart - a single go.Scatter3d trace, exact
 * same marker styling as app.py's own real render (size 1.5, color
 * "#ffa53c", opacity 0.5) so this matches the Streamlit app's actual
 * colors, not a re-picked palette. See ParticleCloudChart.mdx. */
export function ParticleCloudChart({ positions }: ParticleCloudChartProps) {
  const data = useMemo(
    () => [{
      type: 'scatter3d',
      mode: 'markers',
      x: positions.map((p) => p[0]),
      y: positions.map((p) => p[1]),
      z: positions.map((p) => p[2]),
      marker: { size: 1.5, color: '#ffa53c', opacity: 0.5 },
    }],
    [positions],
  );

  return <Plotly3DChart data={data} />;
}
