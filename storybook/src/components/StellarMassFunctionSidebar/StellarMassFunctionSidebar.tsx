import { useEffect, useState } from 'react';
import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Slider } from '../Slider/Slider';
import { Checkbox } from '../Checkbox/Checkbox';
import { MultiSelect } from '../MultiSelect/MultiSelect';
import { Button } from '../Button/Button';

// Dev-only, matches AddPlotModal/CuratedTab.tsx's own API_BASE.
const API_BASE = 'http://localhost:8010/api';

export type StellarMassFunctionParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: number[];
  SMmin: number;
  SMmax: number;
  bins: number;
};

type CatalogSet = { name: string; label: string; realizations: number; description: string };
type Catalog = { suites: string[]; sets: CatalogSet[]; statistics: string[] };

export type StellarMassFunctionSidebarProps = {
  params: StellarMassFunctionParams;
  onChange: (params: StellarMassFunctionParams) => void;
  onRemove: () => void;
};

/** The real per-tile params panel for Stellar Mass Function, from Figma
 * node 1019:10 - see StellarMassFunctionSidebar.mdx. Composes ParamsSidebar
 * (the shell) with the exact real fields this statistic's backend call
 * consumes: Suite, Set, Compare mode, Realizations (or a single Realization
 * when Compare mode is off), Min/Max stellar mass, Bins, Remove plot. */
export function StellarMassFunctionSidebar({ params, onChange, onRemove }: StellarMassFunctionSidebarProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

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
    <ParamsSidebar title="Stellar Mass Function">
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
        max={60}
        value={params.bins}
        onChange={(bins) => onChange({ ...params, bins })}
      />
      <Button variant="secondary" onClick={onRemove}>Remove plot</Button>
    </ParamsSidebar>
  );
}
