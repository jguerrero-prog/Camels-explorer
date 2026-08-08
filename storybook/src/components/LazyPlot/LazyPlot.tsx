import { lazy } from 'react';
import './LazyPlot.css';

/** Real code-split (2026-08-08, issue #22) - `plotly.js-dist-min` +
 * `react-plotly.js` together were the single largest contributor to this
 * app's production bundle (confirmed directly: a real `npm run build`
 * produced one 5.1MB `dist/assets/index-*.js`, Vite's own output warning
 * flagging it). Every chart that needs Plotly (2D `PlotChart`, 3D
 * `Plotly3DChart`, the Custom tab's `CustomAggregateChart`) now imports
 * THIS shared lazy wrapper instead of importing `plotly.js-dist-min`/
 * `react-plotly.js/factory` directly - Rollup puts both into their own
 * chunk that's fetched only the first time a chart that actually needs it
 * renders, not unconditionally on every page load regardless of which
 * statistics get opened. Untyped (matches the pre-existing `declare module
 * 'plotly.js-dist-min'` ambient declaration - Plotly itself ships no types
 * this app pulls in), same effective typing every existing `<Plot .../>`
 * call site already had before this split. */
// Cached once the dynamic import resolves - lets resizePlotlyGraph (below)
// call into the real Plotly instance without its own static import, which
// would defeat the whole point of this split. Every consumer's own
// ResizeObserver only ever calls this once `graphDivRef.current` is set,
// which itself only happens from `LazyPlot`'s own onInitialized/onUpdate -
// by then Plotly has always already loaded, so this is never actually
// racing the lazy load in practice.
let loadedPlotly: typeof import('plotly.js-dist-min') | null = null;

export const LazyPlot = lazy(async () => {
  const [plotlyModule, { default: createPlotlyComponent }] = await Promise.all([
    import('plotly.js-dist-min'),
    import('react-plotly.js/factory'),
  ]);
  loadedPlotly = plotlyModule;
  return { default: createPlotlyComponent(plotlyModule.default) };
});

/** Every `LazyPlot` consumer's own ResizeObserver calls this instead of a
 * static `Plotly.Plots.resize(...)` (see module comment above for why
 * that's always safe). No-op if Plotly somehow hasn't loaded yet. */
export function resizePlotlyGraph(graphDiv: HTMLElement) {
  loadedPlotly?.default.Plots.resize(graphDiv);
}

/** Shared `<Suspense fallback>` for every `LazyPlot` call site - shown only
 * on the very first chart render per page load (Rollup/the browser cache
 * every subsequent one), while the Plotly chunk is still downloading. */
export function LazyPlotFallback() {
  return (
    <div className="lazy-plot-fallback" role="status" aria-label="Loading chart">
      Loading chart…
    </div>
  );
}
