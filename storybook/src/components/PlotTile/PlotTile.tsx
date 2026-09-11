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
  /** `null` for a statistic with nothing chartable: a flat parameter table
   * has no x/y plot. Static and Interactive then drop out of the mode list
   * and the tile opens straight into Table with no dropdown, so `halos` or
   * `catalogTable` must be set or there is nothing to render. */
  chart: PlotTileChart | null;
  readoutGroups: ParamsReadoutGroup[];
  /** `null` for a statistic with no per-halo catalog. Power Spectrum,
   * Bispectrum and SFR History measure a whole box rather than individual
   * halos. Table mode is then omitted entirely, rather than offering an
   * empty table. */
  halos: PlotTileHalos | null;
  /** A generic catalog table, as distinct from a per-halo one. Only the
   * void overlay on 3D Density Field uses it today; every other statistic
   * omits it. Kept separate from `halos` because the rows are not halos and
   * take different columns, wording and filtering. */
  catalogTable?: PlotTileCatalogTable | null;
  /** A 3D scatter view, offered alongside the 2D chart. A peer of `chart`
   * rather than a kind of it: a tile with this set still has an ordinary 2D
   * chart, unlike Density Field and Particle Cloud, which are 3D only and
   * express that through `chart.kind`. Omit it to hide the mode. */
  chart3d?: ReactNode | null;
  /** Fires on any click on the tile. The caller uses it to decide which
   * tile's sidebar shows. It has no visual effect here; pass `focused` for
   * that. */
  onFocus?: () => void;
  /** Whether this is the focused tile, the one whose sidebar is showing and
   * the one every tile-scoped toolbar tool acts on: Copy provenance, Copy as
   * code, Annotate, Ruler, Ratio/diff. Draws the focus ring, so a user can
   * see what those tools will apply to before using them. */
  focused?: boolean;
  /** Fires with the click position as a fraction of the chart area, 0 to 1
   * on each axis rather than pixels, so an annotation stays on the same
   * point however large the tile renders. Wire it only while an annotation
   * mode is on; omitted, an ordinary click just calls `onFocus`. */
  onChartClick?: (xFrac: number, yFrac: number) => void;
  /** Slot for the annotation overlays, positioned over the chart area. The
   * caller owns the annotation data; this component owns the box it is
   * placed in. */
  annotationOverlay?: ReactNode;
  /** Set when the tile's own fetch failed. It replaces the chart area
   * rather than overlaying it, since a failed fetch leaves nothing to show
   * underneath. Applies to the chart views only: Table mode still shows
   * whatever catalog rows exist, because a chart fetch failing does not mean
   * the catalog fetch did. */
  error?: string;
  /** Hides this tile's parameter readout. Unlike annotations, arrows and
   * notes, which carry their own `hidden` flag per item, a readout has no
   * creation moment of its own, so this is a live gate recomputed on every
   * render. A tile added while readouts are hidden for all panels is hidden
   * immediately. */
  readoutsHidden?: boolean;
};

function availableChartModes(chart: PlotTileChart | null, hasTable: boolean, has3d: boolean): ChartDisplayMode[] {
  const modes: ChartDisplayMode[] = [];
  if (chart) {
    const hasStatic = chart.kind === 'static-image' || (chart.kind !== 'plotly-3d' && !!chart.imageUrl);
    if (hasStatic) modes.push('static');
    if (chart.kind !== 'static-image') modes.push('interactive');
  }
  if (has3d) modes.push('scatter3d');
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
  title, chart, readoutGroups, halos, catalogTable, chart3d, onFocus, focused, onChartClick, annotationOverlay, error, readoutsHidden,
}: PlotTileProps) {
  const modes = availableChartModes(chart, !!halos || !!catalogTable, !!chart3d);
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
            ) : chartMode === 'scatter3d' && chart3d ? (
              chart3d
            ) : !chart ? null : chart.kind === 'static-image' ? (
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
