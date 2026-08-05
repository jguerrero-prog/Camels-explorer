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
  haloRows: HaloRow[];
  /** backend.py's Catalog.raw_frame - see UnderlyingHalos.mdx's "Show all
   * available fields" row. */
  haloRawRows?: Record<string, number>[] | null;
  /** Real disclosure shown above the halos table when this statistic's
   * plotted quantity doesn't correspond to any column in the (always
   * per-subhalo) catalog below it - e.g. Halo Mass Function/Baryon
   * Fraction are binned by FoF group mass, not a subhalo property. Omit
   * for statistics (Stellar Mass Function) where the table's own Stellar
   * Mass column is exactly what's plotted. See UnderlyingHalos.mdx. */
  haloMassContextNote?: string;
  /** Fires on any click on the tile - App.tsx uses this to decide which
   * tile's ParamsSidebar shows (its own focusedTileId state, not a prop
   * here). No visual effect on the tile itself - see PlotTile.mdx's
   * 2026-08-04 correction. */
  onFocus?: () => void;
};

export function PlotTile({ title, chart, readoutGroups, haloRows, haloRawRows, haloMassContextNote, onFocus }: PlotTileProps) {
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
      <UnderlyingHalos rows={haloRows} rawRows={haloRawRows} massContextNote={haloMassContextNote} />
    </div>
  );
}
