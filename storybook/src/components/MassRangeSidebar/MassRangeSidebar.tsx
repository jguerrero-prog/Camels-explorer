import { useEffect, useState } from 'react';
import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Slider } from '../Slider/Slider';
import { Checkbox } from '../Checkbox/Checkbox';
import { MultiSelect } from '../MultiSelect/MultiSelect';
import { Button } from '../Button/Button';
import type { MassRangeStatistic } from './massRangeConfig';
import { MASS_RANGE_CONFIGS } from './massRangeConfig';

// Dev-only, matches AddPlotModal/CuratedTab.tsx's own API_BASE.
const API_BASE = 'http://localhost:8010/api';

export type MassRangeParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: number[];
  min: number;
  max: number;
  bins: number;
};

type CatalogSet = { name: string; label: string; realizations: number; description: string };
type Catalog = { suites: string[]; sets: CatalogSet[]; statistics: string[] };

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
 * per-statistic defaults, not shape - see MassRangeSidebar.mdx. */
export function MassRangeSidebar({ statistic, params, onChange, onRemove }: MassRangeSidebarProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const config = MASS_RANGE_CONFIGS[statistic];

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/metadata`)
      .then((res) => res.json())
      .then((data: Catalog) => !cancelled && setCatalog(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSet = catalog?.sets.find((s) => s.name === params.setName);

  return (
    <ParamsSidebar title={statistic}>
      <SelectField
        label="Suite"
        value={params.suite}
        options={catalog?.suites ?? [params.suite]}
        onChange={(suite) => onChange({ ...params, suite })}
      />
      <SelectField
        label="Set"
        value={activeSet?.label ?? params.setName}
        options={catalog?.sets.map((s) => s.label) ?? [params.setName]}
        onChange={(label) => {
          const next = catalog?.sets.find((s) => s.label === label);
          if (next) onChange({ ...params, setName: next.name, realizations: [0] });
        }}
      />
      <Checkbox
        label="Compare mode"
        checked={params.compareMode}
        onChange={(compareMode) => onChange({ ...params, compareMode })}
      />
      {params.compareMode ? (
        <MultiSelect
          label="Realizations to compare"
          values={params.realizations.map(String)}
          onAdd={(value) => {
            const n = Number(value);
            if (Number.isFinite(n) && !params.realizations.includes(n)) {
              onChange({ ...params, realizations: [...params.realizations, n] });
            }
          }}
          onRemove={(value) => {
            const remaining = params.realizations.filter((r) => String(r) !== value);
            if (remaining.length > 0) onChange({ ...params, realizations: remaining });
          }}
          placeholder="Add realization…"
          caption={activeSet ? `${activeSet.realizations.toLocaleString()} realizations available` : undefined}
          options={activeSet ? Array.from({ length: activeSet.realizations }, (_, i) => String(i)) : undefined}
        />
      ) : (
        <NumberStepper
          label="Realization"
          value={params.realizations[0]}
          onChange={(realization) => onChange({ ...params, realizations: [realization] })}
          caption={activeSet ? `0–${activeSet.realizations - 1}` : undefined}
        />
      )}
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
      <Button variant="secondary" onClick={onRemove}>Remove plot</Button>
    </ParamsSidebar>
  );
}
