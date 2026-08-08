import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LazyPlot, LazyPlotFallback, resizePlotlyGraph } from '../LazyPlot/LazyPlot';
import type { ChartDisplayMode } from '../ChartModeDropdown/ChartModeDropdown';
import './PlotChart.css';

export type PlotSeries = {
  label: string;
  x: number[];
  y: number[];
};

export type PlotChartProps = {
  series: PlotSeries[];
  xLabel: string;
  yLabel: string;
  logX?: boolean;
  logY?: boolean;
  /** URL of a real, server-rendered matplotlib PNG for this exact chart
   * (see PlotChart.mdx). When present, `displayMode: 'static'` renders it;
   * when absent, `displayMode` should only ever be `'interactive'` - the
   * parent (`PlotTile`) is responsible for not offering a Static option
   * with nothing to show. */
  imageUrl?: string;
  /** Real point-cloud mode for Custom tab's Scatterplot (added 2026-08-05)
   * - every other call site plots regularly-ordered curves, where
   * connecting points with 'lines' is meaningful; a raw cross-realization
   * row scatter has no natural line order, so 'markers' is required, not
   * just cosmetic. Exactly one entry in `series` is used in this mode -
   * Scatterplot has no multi-series/compare concept the way every other
   * statistic here does. Uses Plotly's plain 'scatter' trace type (SVG),
   * not 'scattergl' - see feedback_camels_webgl_headless.md: WebGL
   * renders aren't reliably verifiable via headless screenshot. */
  mode?: 'lines' | 'markers';
  /** Real third-field coloring (Scatterplot's optional Color field) - one
   * value per point, same length/order as `series[0].x`/`y`. Renders via
   * Plotly's native marker.colorscale/showscale (Viridis) with a real
   * colorbar, not a second charting library. */
  markerColor?: { values: number[]; title: string };
  /** Real (Ratio/diff overlay tool) - a derived series only ever renders
   * via the live Plotly trace, never the server-rendered Static PNG (the
   * PNG has no way to know about a client-computed extra series). Any
   * defined, changing value here switches this chart to Interactive so
   * the user actually sees the result they just asked for, rather than
   * comparing against a Static view that silently didn't change. Still
   * consumed here (not just by the parent) since detecting the *change*
   * needs the same `useEffect` dependency-comparison PlotChart already
   * did - see `onForceInteractive` below for how it now reaches the mode
   * state, which moved up to `PlotTile` (real fix, 2026-08-06 - see
   * PlotChart.mdx).) */
  forceInteractiveSignal?: unknown;
  /** Real fix (2026-08-06, direct user feedback: "the static/interactive
   * toggle is becoming illegible... sits inside the plot"): this used to
   * be internal state with its own on-chart toggle UI. Both moved up to
   * `PlotTile` (which also needed the same mode to decide between showing
   * a chart at all vs. a full `UnderlyingHalos` table - see
   * `ChartModeDropdown`) - this component is now a fully controlled,
   * dumb renderer for whichever mode it's told. */
  displayMode: Exclude<ChartDisplayMode, 'table'>;
  /** Fires once when `forceInteractiveSignal` changes to a defined value -
   * `PlotChart` still owns detecting that specific change (a plain prop
   * comparison the parent would otherwise have to duplicate), but no
   * longer owns what happens as a result. */
  onForceInteractive?: () => void;
};

const LINE_COLORS = ['#7B2D8E', '#E8A030', '#3D8BE8', '#E63946'];

export function PlotChart({
  series, xLabel, yLabel, logX = true, logY = true, imageUrl, mode = 'lines', markerColor,
  forceInteractiveSignal, displayMode, onForceInteractive,
}: PlotChartProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (forceInteractiveSignal !== undefined) onForceInteractive?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceInteractiveSignal]);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphDivRef = useRef<HTMLElement | null>(null);

  const data = useMemo(() => {
    if (mode === 'markers') {
      const s = series[0] ?? { x: [], y: [], label: '' };
      return [
        {
          x: s.x,
          y: s.y,
          type: 'scatter' as const,
          mode: 'markers' as const,
          name: s.label,
          marker: markerColor
            ? {
                color: markerColor.values,
                colorscale: 'Viridis' as const,
                showscale: true,
                colorbar: { title: { text: markerColor.title } },
                size: 5,
                opacity: 0.75,
              }
            : { color: LINE_COLORS[0], size: 5, opacity: 0.75 },
        },
      ];
    }
    return series.map((s, i) => ({
      x: s.x,
      y: s.y,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: s.label,
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }));
  }, [series, mode, markerColor]);

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { l: 56, r: markerColor ? 90 : 16, t: 16, b: 48 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'var(--font-ui)', size: 12, color: '#1A1A1A' },
      xaxis: { title: { text: xLabel }, type: logX ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
      yaxis: { title: { text: yLabel }, type: logY ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
      showlegend: mode === 'lines' && series.length > 1,
      legend: { orientation: 'h' as const, y: 1.1 },
    }),
    [xLabel, yLabel, logX, logY, series.length, mode, markerColor],
  );

  const showStatic = imageUrl && displayMode === 'static';

  // react-plotly.js's own `useResizeHandler` only listens for *window*
  // resize events - it never fires when this container shrinks/grows
  // because a flex sibling changed (e.g. UnderlyingHalos expanding below
  // it), a real bug caught directly: toggling to Interactive then
  // expanding "View underlying halos" left Plotly rendered at its old,
  // larger size, visually overlapping the table below. A ResizeObserver on
  // the actual container catches every resize cause, not just the window's.
  useEffect(() => {
    if (displayMode !== 'interactive' || !containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (graphDivRef.current) resizePlotlyGraph(graphDivRef.current);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [displayMode]);

  return (
    <div className="plot-chart" ref={containerRef}>
      {showStatic ? (
        imageError ? (
          <p className="plot-chart__error">
            Couldn't load the chart image — is the API server running?
            <br />
            <code>uvicorn api.main:app --port 8010</code>
          </p>
        ) : (
          <img
            className="plot-chart__image"
            src={imageUrl}
            alt={`${yLabel} vs ${xLabel}`}
            onLoad={() => setImageError(false)}
            onError={() => setImageError(true)}
          />
        )
      ) : (
        <Suspense fallback={<LazyPlotFallback />}>
          <LazyPlot
            data={data}
            layout={layout}
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
        </Suspense>
      )}
    </div>
  );
}
