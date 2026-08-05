import { SelectField } from '../SelectField/SelectField';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Checkbox } from '../Checkbox/Checkbox';
import { MultiSelect } from '../MultiSelect/MultiSelect';
import type { Catalog } from '../../lib/useCatalogMetadata';

export type RealizationFieldsValue = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: number[];
};

export type RealizationFieldsProps = {
  catalog: Catalog | null;
  value: RealizationFieldsValue;
  onChange: (value: RealizationFieldsValue) => void;
};

/** Suite / Set / Compare mode / Realization(s) - the real fields every
 * per-tile sidebar in this app opens with, regardless of which statistic
 * it's for (see `GET /api/metadata`'s own suites/sets, shared across every
 * statistic). Extracted 2026-08-05 from `MassRangeSidebar` once
 * `PowerSpectrumSidebar`/`BispectrumSidebar`/`SFRHistorySidebar` were about
 * to duplicate the identical block a 3rd/4th/5th time - not a
 * pre-emptive abstraction, real duplication crossing the "three strikes"
 * line this project already applies elsewhere. */
export function RealizationFields({ catalog, value, onChange }: RealizationFieldsProps) {
  const activeSet = catalog?.sets.find((s) => s.name === value.setName);

  return (
    <>
      <SelectField
        label="Suite"
        value={value.suite}
        options={catalog?.suites ?? [value.suite]}
        onChange={(suite) => onChange({ ...value, suite })}
      />
      <SelectField
        label="Set"
        value={activeSet?.label ?? value.setName}
        options={catalog?.sets.map((s) => s.label) ?? [value.setName]}
        onChange={(label) => {
          const next = catalog?.sets.find((s) => s.label === label);
          if (next) onChange({ ...value, setName: next.name, realizations: [0] });
        }}
      />
      <Checkbox
        label="Compare mode"
        checked={value.compareMode}
        onChange={(compareMode) => onChange({ ...value, compareMode })}
      />
      {value.compareMode ? (
        <MultiSelect
          label="Realizations to compare"
          values={value.realizations.map(String)}
          onAdd={(v) => {
            const n = Number(v);
            if (Number.isFinite(n) && !value.realizations.includes(n)) {
              onChange({ ...value, realizations: [...value.realizations, n] });
            }
          }}
          onRemove={(v) => {
            const remaining = value.realizations.filter((r) => String(r) !== v);
            if (remaining.length > 0) onChange({ ...value, realizations: remaining });
          }}
          placeholder="Add realization…"
          caption={activeSet ? `${activeSet.realizations.toLocaleString()} realizations available` : undefined}
          options={activeSet ? Array.from({ length: activeSet.realizations }, (_, i) => String(i)) : undefined}
        />
      ) : (
        <NumberStepper
          label="Realization"
          value={value.realizations[0]}
          onChange={(realization) => onChange({ ...value, realizations: [realization] })}
          caption={activeSet ? `0–${activeSet.realizations - 1}` : undefined}
        />
      )}
    </>
  );
}
