import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import '../PlotChart/PlotChart.css';
import './Plotly3DChart.css';

const Plot = createPlotlyComponent(Plotly);

// Matches this app's own dark tokens (--color-text-primary/#e5e7eb) - Plotly
// can't consume CSS custom properties directly in its layout object, so
// these are literal values, same precedent as PlotChart's own hardcoded
// '#1A1A1A' text / '#E5E5E5' gridlines for its white surface.
const AXIS_TEXT_COLOR = '#e5e7eb';
const AXIS_GRID_COLOR = 'rgba(229, 231, 235, 0.15)';
const PIN_COLOR = '#e63946'; // matches Radio/Button's own accent-adjacent red, distinct from any trace color

function axisConfig(title: string) {
  return {
    title: { text: title, font: { color: AXIS_TEXT_COLOR } },
    color: AXIS_TEXT_COLOR,
    backgroundcolor: 'transparent',
    showbackground: false,
    gridcolor: AXIS_GRID_COLOR,
    zerolinecolor: AXIS_GRID_COLOR,
  };
}

type PinnedPoint = { x: number; y: number; z: number; text: string };

export type Plotly3DChartProps = {
  /** Pre-built go.Volume/go.Scatter3d-shaped trace objects - callers
   * (DensityFieldChart, ParticleCloudChart) build these, this component
   * only owns the shared scene/layout/resize shell both real statistics
   * use identically in app.py. Deliberately loosely typed - `plotly.js-
   * dist-min` doesn't export trace types the way the full `plotly.js`
   * package does, and PlotChart's own 2D `data` avoids the same problem
   * only because its one trace shape (`type: 'scatter' as const`) happens
   * to satisfy structural inference; Volume and Scatter3d are different
   * enough shapes that forcing one type here isn't worth the friction. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
};

/** The shared real Plotly 3D shell for 3D Density Field (go.Volume) and 3D
 * Particle Cloud (go.Scatter3d) - both statistics use the identical real
 * scene/layout config in app.py (xaxis/yaxis/zaxis titles, aspectmode
 * "cube", zero margin, height 650, no displayModeBar chrome - matching
 * every other Interactive chart in this app, which hides Plotly's default
 * toolbar since Toolbar owns that role instead). See Plotly3DChart.mdx. */
export function Plotly3DChart({ data }: Plotly3DChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphDivRef = useRef<HTMLElement | null>(null);
  const [pinned, setPinned] = useState<PinnedPoint | null>(null);

  // Same real bug class PlotChart's own Interactive mode already fixed:
  // react-plotly.js's useResizeHandler only catches *window* resizes, not
  // a flex/grid-driven container resize (e.g. switching Viewer's grid/
  // stacked mode, or the tile's own flex sizing responding to a sibling).
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (graphDivRef.current) Plotly.Plots.resize(graphDivRef.current);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="plot-chart plotly-3d-chart" ref={containerRef}>
      {pinned && (
        <button type="button" className="plotly-3d-chart__clear-pin" onClick={() => setPinned(null)}>
          Clear pin
        </button>
      )}
      <Plot
        data={data}
        layout={{
          scene: {
            xaxis: axisConfig('x [Mpc/h]'),
            yaxis: axisConfig('y [Mpc/h]'),
            zaxis: axisConfig('z [Mpc/h]'),
            aspectmode: 'cube',
            bgcolor: 'transparent',
            // A pinned point renders as a real Plotly 3D scene annotation
            // (anchored to its own x/y/z, not screen space) - it moves
            // naturally with the camera as the user rotates/pans/zooms,
            // and stays put while they explore elsewhere in the scene,
            // unlike the default hover label which disappears the moment
            // the pointer leaves that point.
            annotations: pinned
              ? [{
                  x: pinned.x, y: pinned.y, z: pinned.z,
                  text: pinned.text,
                  showarrow: true,
                  arrowhead: 2,
                  arrowcolor: PIN_COLOR,
                  font: { color: AXIS_TEXT_COLOR, size: 12 },
                  bgcolor: 'rgba(20, 20, 26, 0.9)',
                  bordercolor: PIN_COLOR,
                  borderpad: 4,
                }]
              : [],
          },
          margin: { l: 0, r: 0, t: 0, b: 0 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        onInitialized={(_figure, graphDiv) => {
          graphDivRef.current = graphDiv;
        }}
        onUpdate={(_figure, graphDiv) => {
          graphDivRef.current = graphDiv;
        }}
        onClick={(event) => {
          const point = event.points?.[0] as unknown as
            { x?: number; y?: number; z?: number; value?: number; text?: string } | undefined;
          if (!point || point.x === undefined || point.y === undefined || point.z === undefined) return;
          const lines = [
            `x: ${point.x.toFixed(2)}`,
            `y: ${point.y.toFixed(2)}`,
            `z: ${point.z.toFixed(2)}`,
          ];
          if (typeof point.value === 'number') lines.push(`value: ${point.value.toPrecision(4)}`);
          else if (point.text) lines.push(String(point.text));
          setPinned({ x: point.x, y: point.y, z: point.z, text: lines.join('<br>') });
        }}
      />
    </div>
  );
}
