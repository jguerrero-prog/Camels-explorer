import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { PlotChart } from '../PlotChart/PlotChart';
import type { PlotSeries } from '../PlotChart/PlotChart';
import { StaticImageChart } from '../StaticImageChart/StaticImageChart';
import { ParamsReadout } from '../ParamsReadout/ParamsReadout';
import type { ParamsReadoutGroup } from '../ParamsReadout/ParamsReadout';
import { UnderlyingHalos } from '../UnderlyingHalos/UnderlyingHalos';
import type { UnderlyingHalosProps } from '../UnderlyingHalos/UnderlyingHalos';
import { ChartModeDropdown } from '../ChartModeDropdown/ChartModeDropdown';
import type { ChartDisplayMode } from '../ChartModeDropdown/ChartModeDropdown';
import '../Tile/Tile.css';
import './PlotTile.css';

export type PlotTileChart =
  | {
      kind?: 'plotly';
      series: PlotSeries[];
      xLabel: string;
      yLabel: string;
      logX?: boolean;
      logY?: boolean;
      /** Real, server-rendered matplotlib PNG URL - see PlotChart.mdx. Omit
       * for a chart with no static render built yet (Interactive-only). */
      imageUrl?: string;
      /** Custom tile's Scatterplot (added 2026-08-05) - passed straight
       * through to PlotChart's own `mode`/`markerColor` props (see
       * PlotChart.mdx). Every other real call site omits both and gets
       * the original 'lines' behavior unchanged. */
      mode?: 'lines' | 'markers';
      markerColor?: { values: number[]; title: string };
      /** Real (Ratio/diff overlay tool) - forces this chart into
       * Interactive mode when a derived series was just added, since a
       * Static PNG can't show it. See PlotChart's own docs. */
      forceInteractiveSignal?: unknown;
    }
  | {
      /** Statistics app.py renders exclusively via st.pyplot(), with no
       * Plotly equivalent at all (see StaticImageChart.mdx) - the real PNG
       * is the only render, not a default with an opt-in alternative. */
      kind: 'static-image';
      imageUrl: string;
      alt: string;
    }
  | {
      /** The inverse of 'static-image': statistics app.py renders
       * exclusively via live interactive Plotly 3D (go.Volume/go.Scatter3d),
       * with no static-image equivalent at all - a screenshot would lose
       * the actual point of a rotate/zoom 3D view. See Plotly3DChart.mdx.
       * A rendered node, not raw trace data - DensityFieldChart/
       * ParticleCloudChart each own real, different trace-building logic
       * (percentile isomin/isomax, void-overlay merging) on top of the
       * shared Plotly3DChart shell; PlotTile stays agnostic to which one
       * a given statistic uses. */
      kind: 'plotly-3d';
      content: ReactNode;
    };

/** Real (widened 2026-08-07, direct user request: wire in the alternate-
 * halo-finder picker `UnderlyingHalos`'s own "+ Add a halo finder" button
 * was a disabled placeholder for). Was `{ rows: HaloRow[]; rawRows?; ...
 * massContextNote? }` - now every `UnderlyingHalos` prop, since a real
 * finder switch (AHF/Rockstar/CAESAR) means `rows`/`columns` change shape
 * entirely, not just which values populate a fixed `HaloRow`. `HaloRow[]`
 * still satisfies this structurally, so every existing caller (passing
 * just `rows`/`rawRows`/`massContextNote`) needed zero changes. */
export type PlotTileHalos = Omit<UnderlyingHalosProps, 'parentTitle' | 'defaultExpanded'>;

/** Real (added 2026-08-07, direct user request: reuse `UnderlyingHalos`
 * for the VIDE void catalog "to keep components consistent") - a second,
 * generic "Table" mode channel alongside `halos` above. Kept as its own
 * prop rather than repurposing `halos` itself: a prop literally named
 * `halos` carrying void-catalog rows would read as a bug to a future
 * reader of 3D Density Field's own tile. Every real caller has one or the
 * other, never both, so the render below just picks whichever is set. */
export type PlotTileCatalogTable = Omit<UnderlyingHalosProps, 'parentTitle' | 'defaultExpanded'>;

export type PlotTileProps = {
  title: string;
  chart: PlotTileChart;
  readoutGroups: ParamsReadoutGroup[];
  /** `null` when this statistic has no per-halo catalog concept at all -
   * Power Spectrum, Bispectrum, and SFR History are field/box-level
   * statistics (real 2026-08-05 addition), not tied to any per-halo
   * catalog the way Stellar Mass Function/Halo Mass Function/Baryon
   * Fraction are. Omits the "Table" mode entirely rather than showing a
   * confusing empty (0 of 0) table. */
  halos: PlotTileHalos | null;
  /** `undefined`/`null` for every statistic without a real generic-catalog
   * concept (i.e. everything except 3D Density Field's VIDE void overlay
   * today) - see `PlotTileCatalogTable`'s own docs for why this is a
   * separate prop from `halos` rather than reusing it. */
  catalogTable?: PlotTileCatalogTable | null;
  /** Fires on any click on the tile - App.tsx uses this to decide which
   * tile's ParamsSidebar shows (its own focusedTileId state, not a prop
   * here). No visual effect on the tile itself - see PlotTile.mdx's
   * 2026-08-04 correction. */
  onFocus?: () => void;
  /** Whether this is the currently-focused tile (App.tsx's own
   * `focusedTileId`, the same tile whose ParamsSidebar shows in the left
   * slot) - added 2026-08-06 so the toolbar tools that operate on "the
   * currently focused tile" (Copy provenance/as code, Annotate, Ruler,
   * Ratio/diff) have something for a user to see and click before using
   * them, matching the bordered-panel treatment shown in every one of
   * those Figma frames (nodes 1066-10/1076-10/1063-10). Previously
   * `onFocus` had "No visual effect on the tile itself" (see this file's
   * 2026-08-04 note above) - now it does. */
  focused?: boolean;
  /** Real (Figma node 1055-10's annotation-pin/annotation-callout) - fires
   * with the click position as a FRACTION of the chart area's own box
   * (0-1 on each axis, not pixels), so App.tsx can store one fractional
   * position per annotation and it stays correctly placed regardless of
   * how large this tile happens to render. Only wired when annotate mode
   * is on (App.tsx's own toggle) - omitted otherwise, so an ordinary
   * click still only calls `onFocus`. */
  onChartClick?: (xFrac: number, yFrac: number) => void;
  /** Real (same Figma node) - the pins/callouts themselves, rendered by
   * App.tsx (which owns the annotation data) as an absolutely-positioned
   * overlay on top of the chart area this component owns. */
  annotationOverlay?: ReactNode;
  /** Set when the tile's own fetch failed - App.tsx's refetchXxxTile
   * catch blocks (see PlotTile.mdx). Real gap fixed 2026-08-05: this prop
   * already existed on every tile's own state type and was already being
   * set on failure, but nothing here ever rendered it - a failed fetch
   * (no real data for this selection) showed either a stale/empty chart
   * or a generic image-load message, with no indication of what actually
   * went wrong. Replaces the chart area entirely rather than overlaying
   * it, since a failed fetch means there's no chart data to show under it.
   * Only applies to the chart views (Static/Interactive) - Table mode
   * shows whatever halos data exists regardless, since a chart-fetch
   * failure doesn't necessarily mean the halos catalog fetch failed too. */
  error?: string;
  /** Real (Toolbar's Hide feature, added 2026-08-06) - unlike
   * annotations/arrows/notes (see AnnotationOverlay's own `hidden` field
   * docs), a param readout has no per-item array to stamp and no
   * "creation moment" distinct from the tile itself - so this is a
   * genuinely live gate, computed fresh by App.tsx on every render from
   * `hidePerPanel[tile.id]?.readouts ?? hideAllPanels.readouts`, not a
   * one-time stamp. A brand-new tile added while readouts are globally
   * hidden inherits that immediately, with no fresh-item exemption. */
  readoutsHidden?: boolean;
};

function availableChartModes(chart: PlotTileChart, hasTable: boolean): ChartDisplayMode[] {
  const modes: ChartDisplayMode[] = [];
  const hasStatic = chart.kind === 'static-image' || (chart.kind !== 'plotly-3d' && !!chart.imageUrl);
  if (hasStatic) modes.push('static');
  if (chart.kind !== 'static-image') modes.push('interactive');
  if (hasTable) modes.push('table');
  return modes;
}

/** Real fix (2026-08-06, direct user feedback - see ChartModeDropdown's
 * own docs for the "why move it" half of this). The other half: "the
 * panel has some issues with competing between the plot and the table...
 * plot and table should be 2 separate views, not a view that sits under
 * it." `chart` and `halos` used to both always render - chart/readout on
 * top, `UnderlyingHalos` as a collapsible section underneath, competing
 * for the same tile height (especially cramped in a 2x2 grid cell). Now
 * mutually exclusive views of the same tile, selected via
 * `ChartModeDropdown`'s 3rd "Table" option: Static/Interactive replace
 * chart+readout as before; Table replaces BOTH with `UnderlyingHalos` at
 * the tile's full body height - no competing for space, because only one
 * ever renders. */
export function PlotTile({
  title, chart, readoutGroups, halos, catalogTable, onFocus, focused, onChartClick, annotationOverlay, error, readoutsHidden,
}: PlotTileProps) {
  const modes = availableChartModes(chart, !!halos || !!catalogTable);
  const [chartMode, setChartMode] = useState<ChartDisplayMode>(modes[0]);

  const handleChartAreaClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onChartClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onChartClick((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  return (
    <div className={`tile plot-tile ${focused ? 'plot-tile--focused' : ''}`} onClick={onFocus}>
      <div className="plot-tile__header">
        <h3 className="tile__title">{title}</h3>
        {modes.length > 1 && <ChartModeDropdown mode={chartMode} options={modes} onChange={setChartMode} />}
      </div>
      {chartMode === 'table' && halos ? (
        <UnderlyingHalos {...halos} parentTitle={title} defaultExpanded />
      ) : chartMode === 'table' && catalogTable ? (
        <UnderlyingHalos {...catalogTable} parentTitle={title} defaultExpanded />
      ) : (
        <div className="plot-tile__body">
          <div
            className={`plot-tile__chart-area ${onChartClick ? 'plot-tile__chart-area--annotatable' : ''}`}
            onClick={handleChartAreaClick}
          >
            {error ? (
              <div className="plot-chart">
                <p className="plot-chart__error">{error}</p>
              </div>
            ) : chart.kind === 'static-image' ? (
              <StaticImageChart imageUrl={chart.imageUrl} alt={chart.alt} />
            ) : chart.kind === 'plotly-3d' ? (
              chart.content
            ) : (
              <PlotChart
                series={chart.series}
                xLabel={chart.xLabel}
                yLabel={chart.yLabel}
                logX={chart.logX}
                logY={chart.logY}
                imageUrl={chart.imageUrl}
                mode={chart.mode}
                markerColor={chart.markerColor}
                forceInteractiveSignal={chart.forceInteractiveSignal}
                displayMode={chartMode === 'static' ? 'static' : 'interactive'}
                onForceInteractive={() => setChartMode('interactive')}
              />
            )}
            {annotationOverlay}
          </div>
          {!readoutsHidden && <ParamsReadout groups={readoutGroups} />}
        </div>
      )}
    </div>
  );
}
