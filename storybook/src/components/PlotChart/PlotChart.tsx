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
  /** URL of a server-rendered matplotlib PNG of this exact chart. When
   * present, `displayMode: 'static'` renders it. When absent, `displayMode`
   * must be `'interactive'`: `PlotTile` is responsible for not offering a
   * Static option with nothing to show. */
  imageUrl?: string;
  /** `lines` for a curve, `markers` for a point cloud. Every curated
   * statistic plots ordered curves, where connecting the points means
   * something. A cross-realization scatter has no natural order, so markers
   * are required there rather than cosmetic. In marker mode exactly one
   * entry in `series` is used: a scatter has no compare concept. Drawn with
   * Plotly's SVG `scatter` trace rather than `scattergl`. */
  mode?: 'lines' | 'markers';
  /** Colours each point by a third field: one value per point, in the same
   * order and length as `series[0]`. Drawn with Plotly's own Viridis
   * colorscale and colorbar. */
  markerColor?: { values: number[]; title: string };
  /** Any changing defined value switches the tile to Interactive. A series
   * derived in the browser, such as a ratio or difference, cannot appear in
   * the server-rendered PNG, so a Static view would silently not change.
   * This component detects the change and reports it through
   * `onForceInteractive`; the mode itself lives in `PlotTile`. */
  forceInteractiveSignal?: unknown;
  /** Which way to draw: a static PNG, an interactive Plotly chart, or a 3D
   * scatter. Fully controlled. `PlotTile` owns the mode, since it also needs
   * it to decide between a chart and a halo table. */
  displayMode: Exclude<ChartDisplayMode, 'table'>;
  /** Fires when `forceInteractiveSignal` changes to a defined value. This
   * component detects the change; the parent decides what to do about it. */
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
