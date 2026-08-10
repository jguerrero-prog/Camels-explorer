import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Slider } from '../Slider/Slider';
import { Button } from '../Button/Button';
import { RealizationFields } from '../RealizationFields/RealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';
import type { MassRangeStatistic } from './massRangeConfig';
import { MASS_RANGE_CONFIGS } from './massRangeConfig';

export type MassRangeParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: (number | string)[];
  compareAxis?: 'realization' | 'suite';
  compareSuites?: string[];
  snapnum: number;
  min: number;
  max: number;
  bins: number;
};

// Real fallback (backend.py's N_SNAPSHOTS) - used only until GET
// /api/metadata loads.
const FALLBACK_N_SNAPSHOTS = 34;

export type MassRangeSidebarProps = {
  statistic: MassRangeStatistic;
  params: MassRangeParams;
  onChange: (params: MassRangeParams) => void;
  onRemove: () => void;
};

/** The real, wired `ParamsSidebar` composition shared by the three
 * statistics with an identical suite/set/realization/mass-range/bins shape
 * (Stellar Mass Function, Halo Mass Function, Baryon Fraction - see
 * massRangeConfig.ts). Originally built statistic-specific as
 * `StellarMassFunctionSidebar` (Figma node `1019:10`); generalized
 * 2026-08-05 once Halo Mass Function/Baryon Fraction's real backend.py
 * signatures were confirmed to differ only in mass-param names and
 * per-statistic defaults, not shape - see MassRangeSidebar.mdx.
 * Suite/Set/Compare mode/Realization now come from `RealizationFields`
 * (extracted the same day once PowerSpectrumSidebar/BispectrumSidebar/
 * SFRHistorySidebar were about to duplicate this same block again).
 * `allowedSuites` reads per-`statistic` (added 2026-08-07, issue #15) -
 * the 3 mass-range statistics no longer share identical real suite
 * coverage: Halo Mass Function is real for the 4 new `_DM` suites too
 * (a halo mass function is physically meaningful with no baryons),
 * Stellar Mass Function/Baryon Fraction are not (see backend.py's own
 * guards) and stay at the default 4 via their own absent
 * `statistic_suites` entry - keying by `statistic` here is what lets
 * them diverge without duplicating this component 3 ways. */
export function MassRangeSidebar({ statistic, params, onChange, onRemove }: MassRangeSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;
  const config = MASS_RANGE_CONFIGS[statistic];

  return (
    <ParamsSidebar title={statistic} footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <RealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites[statistic]}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <NumberStepper
        label={config.minLabel}
        value={params.min}
        step={config.minStep}
        formatValue={(v) => v.toExponential(1)}
        onChange={(min) => onChange({ ...params, min })}
      />
      <NumberStepper
        label={config.maxLabel}
        value={params.max}
        step={config.maxStep}
        formatValue={(v) => v.toExponential(1)}
        onChange={(max) => onChange({ ...params, max })}
      />
      <Slider
        label="Bins"
        min={config.binsMin}
        max={config.binsMax}
        value={params.bins}
        onChange={(bins) => onChange({ ...params, bins })}
      />
    </ParamsSidebar>
  );
}
