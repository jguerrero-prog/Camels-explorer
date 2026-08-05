import { useEffect, useRef } from 'react';
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
      <Plot
        data={data}
        layout={{
          scene: {
            xaxis: axisConfig('x [Mpc/h]'),
            yaxis: axisConfig('y [Mpc/h]'),
            zaxis: axisConfig('z [Mpc/h]'),
            aspectmode: 'cube',
            bgcolor: 'transparent',
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
      />
    </div>
  );
}
