import { useMemo } from 'react';
import { Plotly3DChart } from '../Plotly3DChart/Plotly3DChart';

export type ParticleCloudChartProps = {
  positions: number[][]; // (N, 3), Mpc/h - real or synthetic clustered DM particles
  /** Real (Figma node 1059-415) - App.tsx's Ruler toolbar tool, passed
   * straight through to Plotly3DChart. A Scatter3d trace's click payload
   * carries real x/y/z per point same as go.Volume's - confirmed via the
   * click-to-pin feature both chart types used to share. */
  rulerMode?: boolean;
};

/** 3D Particle Cloud's real chart - a single go.Scatter3d trace, exact
 * same marker styling as app.py's own real render (size 1.5, color
 * "#ffa53c", opacity 0.5) so this matches the Streamlit app's actual
 * colors, not a re-picked palette. See ParticleCloudChart.mdx.
 *
 * Real fix (2026-08-06, direct user feedback): passes `pinEnabled={false}`
 * to Plotly3DChart - a particle has no scalar value the way a Density
 * Field voxel does, so the click-to-pin feature only ever showed x/y/z
 * here, with nothing real to add. Removed for this statistic only; Density
 * Field keeps it (see Plotly3DChart's own `pinEnabled` docs). */
export function ParticleCloudChart({ positions, rulerMode }: ParticleCloudChartProps) {
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

  return <Plotly3DChart data={data} rulerMode={rulerMode} pinEnabled={false} />;
}
