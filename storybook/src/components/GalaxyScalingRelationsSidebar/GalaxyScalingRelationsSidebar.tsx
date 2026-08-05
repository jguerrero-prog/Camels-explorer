import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Slider } from '../Slider/Slider';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type GalaxyScalingRelationsParams = {
  suite: string;
  setName: string;
  realization: number;
  snapnum: number;
  SMmin: number;
  SMmax: number;
  bins: number;
};

export type GalaxyScalingRelationsSidebarProps = {
  params: GalaxyScalingRelationsParams;
  onChange: (params: GalaxyScalingRelationsParams) => void;
  onRemove: () => void;
};

const FALLBACK_N_SNAPSHOTS = 34;

/** Galaxy Scaling Relations' real per-tile sidebar, from app.py's own
 * "Galaxy Scaling Relations" block - the same mass-range shape
 * MassRangeSidebar's three statistics share (Min/Max stellar mass + Bins),
 * but single-realization only (one of app.py's own
 * SINGLE_REALIZATION_STATISTICS) so it isn't routed through
 * MassRangeSidebar/massRangeConfig.ts. See GalaxyScalingRelationsSidebar.mdx. */
export function GalaxyScalingRelationsSidebar({ params, onChange, onRemove }: GalaxyScalingRelationsSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;

  return (
    <ParamsSidebar title="Galaxy Scaling Relations">
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <NumberStepper
        label="Min stellar mass [Msun/h]"
        value={params.SMmin}
        step={1e8}
        formatValue={(v) => v.toExponential(1)}
        onChange={(SMmin) => onChange({ ...params, SMmin })}
      />
      <NumberStepper
        label="Max stellar mass [Msun/h]"
        value={params.SMmax}
        step={1e10}
        formatValue={(v) => v.toExponential(1)}
        onChange={(SMmax) => onChange({ ...params, SMmax })}
      />
      <Slider
        label="Bins"
        min={5}
        max={30}
        value={params.bins}
        onChange={(bins) => onChange({ ...params, bins })}
      />
      <Button variant="secondary" onClick={onRemove}>Remove plot</Button>
    </ParamsSidebar>
  );
}
