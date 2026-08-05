import { PlotChart } from '../PlotChart/PlotChart';
import type { PlotSeries } from '../PlotChart/PlotChart';
import { ParamsReadout } from '../ParamsReadout/ParamsReadout';
import type { ParamsReadoutGroup } from '../ParamsReadout/ParamsReadout';
import { UnderlyingHalos } from '../UnderlyingHalos/UnderlyingHalos';
import type { HaloRow } from '../UnderlyingHalos/UnderlyingHalos';
import '../Tile/Tile.css';
import './PlotTile.css';

export type PlotTileProps = {
  title: string;
  chart: {
    series: PlotSeries[];
    xLabel: string;
    yLabel: string;
    logX?: boolean;
    logY?: boolean;
    /** Real, server-rendered matplotlib PNG URL - see PlotChart.mdx. Omit
     * for a chart with no static render built yet (Interactive-only). */
    imageUrl?: string;
  };
  readoutGroups: ParamsReadoutGroup[];
  /** `null` when this statistic has no per-halo catalog concept at all -
   * Power Spectrum, Bispectrum, and SFR History are field/box-level
   * statistics (real 2026-08-05 addition), not tied to any per-halo
   * catalog the way Stellar Mass Function/Halo Mass Function/Baryon
   * Fraction are. Omits "View underlying halos" entirely rather than
   * showing a confusing empty (0 of 0) table. */
  halos: {
    rows: HaloRow[];
    /** backend.py's Catalog.raw_frame - see UnderlyingHalos.mdx's "Show
     * all available fields" row. */
    rawRows?: Record<string, number>[] | null;
    /** Real disclosure shown above the halos table when this statistic's
     * plotted quantity doesn't correspond to any column in the (always
     * per-subhalo) catalog below it - see UnderlyingHalos.mdx. */
    massContextNote?: string;
  } | null;
  /** Fires on any click on the tile - App.tsx uses this to decide which
   * tile's ParamsSidebar shows (its own focusedTileId state, not a prop
   * here). No visual effect on the tile itself - see PlotTile.mdx's
   * 2026-08-04 correction. */
  onFocus?: () => void;
};

export function PlotTile({ title, chart, readoutGroups, halos, onFocus }: PlotTileProps) {
  return (
    <div className="tile plot-tile" onClick={onFocus}>
      <h3 className="tile__title">{title}</h3>
      <div className="plot-tile__body">
        <PlotChart
          series={chart.series}
          xLabel={chart.xLabel}
          yLabel={chart.yLabel}
          logX={chart.logX}
          logY={chart.logY}
          imageUrl={chart.imageUrl}
        />
        <ParamsReadout groups={readoutGroups} />
      </div>
      {halos && <UnderlyingHalos rows={halos.rows} rawRows={halos.rawRows} massContextNote={halos.massContextNote} />}
    </div>
  );
}
