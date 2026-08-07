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
type Point3 = { x: number; y: number; z: number };

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
  /** Real (Figma node 1059-415's ruler-line/ruler-handle/ruler-readout) -
   * App.tsx's Ruler toolbar tool. Reuses the exact same `event.points[0].
   * x/y/z` click payload the existing "pin" feature above already proves
   * out on a real go.Volume trace - two clicks give two real 3D points, so
   * the distance readout is a genuine Euclidean distance in this scene's
   * own Mpc/h units, not a screen-space measurement. Mutually exclusive
   * with the click-to-pin feature (both are click-driven; only one can
   * own a given click) - ruler mode takes over clicks entirely while on. */
  rulerMode?: boolean;
  /** Real (added 2026-08-06, direct user feedback: click-to-pin was
   * genuinely useful on 3D Density Field, where a click has a real scalar
   * `value` worth reading out - but 3D Particle Cloud's points carry no
   * such value, so the pin only ever showed x/y/z there, and the user
   * asked to remove it entirely for that caller. Removed again, 2026-08-07,
   * direct user feedback: 3D Density Field no longer wants it either -
   * `DensityFieldChart` now passes `pinEnabled={false}` explicitly, same
   * as `ParticleCloudChart`). Defaults to `true` only because `App.tsx`'s
   * Custom-tab 3D Scatterplot call site (the one remaining real caller
   * that doesn't pass this prop at all) still relies on that default -
   * not because any statistic is meant to inherit it silently going
   * forward. */
  pinEnabled?: boolean;
  /** Real bug fixed 2026-08-07, direct user report ("the render just shows
   * x/y/z [Mpc/h] - hardcoded axis labels that do not change even when I
   * apply a different axis field"): DensityFieldChart/ParticleCloudChart's
   * axes are always real spatial Mpc/h coordinates, but App.tsx's Custom-tab
   * 3D Scatterplot lets a user pick *any* field (mass, redshift, whatever)
   * per axis - this component was labeling every scene axis "x/y/z [Mpc/h]"
   * regardless, since the strings were hardcoded literals rather than a
   * prop. Default to the real spatial labels so the two statistic callers
   * above don't need to pass anything; the Custom-tab caller now passes its
   * own real field names/units instead. */
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
};

/** The shared real Plotly 3D shell for 3D Density Field (go.Volume) and 3D
 * Particle Cloud (go.Scatter3d) - both statistics use the identical real
 * scene/layout config in app.py (xaxis/yaxis/zaxis titles, aspectmode
 * "cube", zero margin, height 650, no displayModeBar chrome - matching
 * every other Interactive chart in this app, which hides Plotly's default
 * toolbar since Toolbar owns that role instead). See Plotly3DChart.mdx. */
export function Plotly3DChart({
  data, rulerMode, pinEnabled = true,
  xLabel = 'x [Mpc/h]', yLabel = 'y [Mpc/h]', zLabel = 'z [Mpc/h]',
}: Plotly3DChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphDivRef = useRef<HTMLElement | null>(null);
  const [pinned, setPinned] = useState<PinnedPoint | null>(null);
  const [rulerA, setRulerA] = useState<Point3 | null>(null);
  const [rulerB, setRulerB] = useState<Point3 | null>(null);

  // Ruler mode owns clicks exclusively - reset any half-drawn measurement
  // the moment it's turned off, rather than leaving a stale line/readout
  // from a previous session once the user switches back to pin mode.
  useEffect(() => {
    if (!rulerMode) {
      setRulerA(null);
      setRulerB(null);
    }
  }, [rulerMode]);

  const rulerDistance = rulerA && rulerB
    ? Math.sqrt((rulerB.x - rulerA.x) ** 2 + (rulerB.y - rulerA.y) ** 2 + (rulerB.z - rulerA.z) ** 2)
    : null;
  const rulerLineTrace = rulerA && rulerB
    ? [{
        type: 'scatter3d',
        mode: 'lines+markers',
        x: [rulerA.x, rulerB.x], y: [rulerA.y, rulerB.y], z: [rulerA.z, rulerB.z],
        line: { color: PIN_COLOR, width: 4, dash: 'dash' },
        marker: { color: PIN_COLOR, size: 4 },
        hoverinfo: 'skip' as const,
        showlegend: false,
      }]
    : [];
  const plotData = rulerLineTrace.length ? [...data, ...rulerLineTrace] : data;

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
      {pinEnabled && pinned && (
        <button type="button" className="plotly-3d-chart__clear-pin" onClick={() => setPinned(null)}>
          Clear pin
        </button>
      )}
      {rulerMode && (rulerA || rulerB) && (
        <button
          type="button"
          className="plotly-3d-chart__clear-pin"
          onClick={() => {
            setRulerA(null);
            setRulerB(null);
          }}
        >
          Clear ruler
        </button>
      )}
      <Plot
        data={plotData}
        layout={{
          scene: {
            xaxis: axisConfig(xLabel),
            yaxis: axisConfig(yLabel),
            zaxis: axisConfig(zLabel),
            aspectmode: 'cube',
            bgcolor: 'transparent',
            // A pinned point renders as a real Plotly 3D scene annotation
            // (anchored to its own x/y/z, not screen space) - it moves
            // naturally with the camera as the user rotates/pans/zooms,
            // and stays put while they explore elsewhere in the scene,
            // unlike the default hover label which disappears the moment
            // the pointer leaves that point. The ruler's distance readout
            // (Figma node 1059-415's ruler-readout) is the same real
            // scene-anchored annotation shape, at the real midpoint.
            annotations: pinEnabled && pinned
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
              : rulerA && rulerB && rulerDistance !== null
                ? [{
                    x: (rulerA.x + rulerB.x) / 2, y: (rulerA.y + rulerB.y) / 2, z: (rulerA.z + rulerB.z) / 2,
                    text: `${rulerDistance.toFixed(2)} Mpc/h`,
                    showarrow: false,
                    font: { color: AXIS_TEXT_COLOR, size: 13 },
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
          const clicked = { x: point.x, y: point.y, z: point.z };

          if (rulerMode) {
            // Two clicks make one measurement; a third starts a fresh one
            // rather than silently extending the old line.
            if (!rulerA || (rulerA && rulerB)) {
              setRulerA(clicked);
              setRulerB(null);
            } else {
              setRulerB(clicked);
            }
            return;
          }

          if (!pinEnabled) return;

          // Real bug fixed 2026-08-05: rotating/panning/zooming a gl3d scene
          // can itself register as a `plotly_click` (a stray hit near a data
          // point mid-drag) - once a pin already exists, that was silently
          // moving it and forcing an annotation re-render on every such hit,
          // which is what read as "lots of delays" while exploring. Once
          // pinned, ignore further clicks entirely until "Clear pin" is
          // pressed - matches the user's own stated intent ("keep their
          // finger in that part of the viz" while they explore elsewhere).
          if (pinned) return;
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
