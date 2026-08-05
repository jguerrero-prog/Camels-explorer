import { SelectField } from '../SelectField/SelectField';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import type { Catalog } from '../../lib/useCatalogMetadata';

export type SingleRealizationFieldsValue = {
  suite: string;
  setName: string;
  realization: number;
};

export type SingleRealizationFieldsProps = {
  catalog: Catalog | null;
  value: SingleRealizationFieldsValue;
  onChange: (value: SingleRealizationFieldsValue) => void;
};

/** Suite / Set / Realization, with no Compare mode - the real fields every
 * per-tile sidebar opens with for the statistics app.py's own
 * SINGLE_REALIZATION_STATISTICS tuple lists (Galaxy Scaling Relations, 3D
 * Density Field, 3D Particle Cloud, 2D Field Map, X-ray Halo Profiles,
 * Halo Gas Profiles, Color-Mass Diagram, Lyman-alpha Spectrum - real
 * app.py captions confirm each: "Compare mode doesn't apply to this
 * view"). Sibling of `RealizationFields` (which adds Compare mode +
 * MultiSelect for statistics that do support overlaying realizations) -
 * kept as a separate component rather than one with a conditional
 * Compare-mode prop, since seven real statistics need this exact shape
 * with none of the multi-realization machinery at all. */
export function SingleRealizationFields({ catalog, value, onChange }: SingleRealizationFieldsProps) {
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
          if (next) onChange({ ...value, setName: next.name, realization: 0 });
        }}
      />
      <NumberStepper
        label="Realization"
        value={value.realization}
        onChange={(realization) => onChange({ ...value, realization })}
        caption={activeSet ? `0–${activeSet.realizations - 1}` : undefined}
      />
    </>
  );
}
