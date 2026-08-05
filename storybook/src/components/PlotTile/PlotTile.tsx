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
  };
  readoutGroups: ParamsReadoutGroup[];
  haloRows: HaloRow[];
  focused?: boolean;
  onFocus?: () => void;
};

export function PlotTile({ title, chart, readoutGroups, haloRows, focused = false, onFocus }: PlotTileProps) {
  return (
    <div className={`tile plot-tile ${focused ? 'plot-tile--focused' : ''}`} onClick={onFocus}>
      <h3 className="tile__title">{title}</h3>
      <div className="plot-tile__body">
        <PlotChart series={chart.series} xLabel={chart.xLabel} yLabel={chart.yLabel} logX={chart.logX} logY={chart.logY} />
        <ParamsReadout groups={readoutGroups} />
      </div>
      <UnderlyingHalos rows={haloRows} />
    </div>
  );
}
