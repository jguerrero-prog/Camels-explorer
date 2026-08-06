import { useEffect } from 'react';
import { SelectField } from '../SelectField/SelectField';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import type { Catalog } from '../../lib/useCatalogMetadata';
import {
  realizationCountFor, onepRealizationId, parseOnepRealizationId, useOnepParamValue,
} from '../../lib/useCatalogMetadata';
import '../NumberStepper/NumberStepper.css';

export type SingleRealizationFieldsValue = {
  suite: string;
  setName: string;
  // A plain realization index for every set except 1P, whose real folders
  // are compound-named by parameter+variation (e.g. "p11_2") - see the 1P
  // block below.
  realization: number | string;
};

export type SingleRealizationFieldsProps = {
  catalog: Catalog | null;
  value: SingleRealizationFieldsValue;
  onChange: (value: SingleRealizationFieldsValue) => void;
  /** Restricts the Suite dropdown to only these suites - e.g. X-ray Halo
   * Profiles only has real coverage for 2 of 4 (backend.py's
   * PUBLIC_XRAY_SUITES, exposed as GET /api/metadata's statistic_suites).
   * Omit when every suite is real for this statistic. Added 2026-08-05 so
   * an unsupported combination can't be configured in the first place,
   * rather than only being disclosed as "No data available" after the
   * fact. */
  allowedSuites?: string[];
  /** Restricts the Set dropdown similarly - only Halo Gas Profiles is
   * narrower than "every set" among this component's real statistics. */
  allowedSets?: string[];
  /** Hides both real value-adjustment controls this component can render -
   * the 1P "Variation" OptionSlider and the plain "Realization"
   * NumberStepper (non-1P sets) - defaulting to shown, i.e. every real
   * per-tile sidebar keeps today's behavior unchanged. CuratedTab (Add
   * Plot modal) passes true - same "no value editing inside a modal you
   * have to submit to see the effect of" fix already applied to the
   * Custom tab: adjusting either control blind, before any tile exists,
   * gives no immediate feedback. Suite/Set/1P-Parameter (*selections*, not
   * continuous/steppable values) stay in the modal either way; the
   * realization itself defaults to 0 (1P: paramIndex 1, variation 0) and
   * is only ever adjusted in the real per-tile sidebar, where doing so
   * refetches the already-rendered tile live. No replacement caption is
   * shown in the modal for either hidden control - the value simply
   * starts at 0 and is adjustable once a tile exists. */
  hideRealizationValueControls?: boolean;
};

// Real 1P variation steps (app.py's own select_slider options) - 0 is the
// fiducial (shared baseline) simulation every parameter index has.
const ONEP_VARIATIONS = [-2, -1, 0, 1, 2];
// Fallback (backend.py's ONEP_MAX_INDEX_FOR_SUITE) for IllustrisTNG, used
// only until GET /api/metadata loads.
const FALLBACK_ONEP_MAX_INDEX = 28;

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
export function SingleRealizationFields({
  catalog, value, onChange, allowedSuites, allowedSets, hideRealizationValueControls,
}: SingleRealizationFieldsProps) {
  const activeSet = catalog?.sets.find((s) => s.name === value.setName);
  const realizationCount = realizationCountFor(catalog, value.setName, value.suite);
  const isOnep = value.setName === '1P';

  const suiteOptions = (catalog?.suites ?? [value.suite]).filter((s) => !allowedSuites || allowedSuites.includes(s));
  const setOptions = (catalog?.sets ?? []).filter((s) => !allowedSets || allowedSets.includes(s.name));
  const applySet = (setName: string) =>
    onChange({ ...value, setName, realization: setName === '1P' ? onepRealizationId(1, 0) : 0 });

  // Auto-correct: a narrower allowlist can appear after the value was
  // already set (e.g. CuratedTab's Statistic picker switches to one with
  // narrower real coverage while Suite/Set was already pointed at
  // something that's no longer valid) - snap to the first allowed option
  // rather than leaving a stale, now-invalid selection in place.
  useEffect(() => {
    if (allowedSuites && suiteOptions.length > 0 && !suiteOptions.includes(value.suite)) {
      onChange({ ...value, suite: suiteOptions[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedSuites, value.suite]);
  useEffect(() => {
    if (allowedSets && setOptions.length > 0 && !setOptions.some((s) => s.name === value.setName)) {
      applySet(setOptions[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedSets, value.setName]);

  // Same 1P picker as RealizationFields (see its own comment for why this
  // needs a parameter+variation picker instead of a plain realization
  // number) - only Galaxy Scaling Relations and Color-Mass Diagram among
  // this component's eight real statistics have real 1P data wired up
  // server-side; the other six will show their existing "no data"/
  // synthetic-fallback honesty for a 1P selection, same as any other
  // unsupported suite/set combination.
  const onepIsTng = value.suite === 'IllustrisTNG';
  const onepMaxIndex = catalog?.onep_max_index_for_suite[value.suite]
    ?? (onepIsTng ? FALLBACK_ONEP_MAX_INDEX : undefined);
  const onepParamOptions = onepIsTng
    ? (catalog?.onep_tng_params ?? []).map((p) => ({ index: p.index, name: p.name, label: `p${p.index}: ${p.name} (${p.category})` }))
    : Array.from({ length: onepMaxIndex ?? 0 }, (_, i) => ({ index: i + 1, name: `p${i + 1}`, label: `p${i + 1}` }));
  const parsedOnep = isOnep && typeof value.realization === 'string'
    ? parseOnepRealizationId(value.realization)
    : null;
  const onepParamIndex = parsedOnep?.paramIndex ?? 1;
  const onepVariation = parsedOnep?.variation ?? 0;
  const onepParamName = onepParamOptions.find((p) => p.index === onepParamIndex)?.name ?? `p${onepParamIndex}`;
  const onepMissingVariations = onepIsTng
    ? new Set(catalog?.onep_tng_missing_variations[String(onepParamIndex)] ?? [])
    : new Set<number>();
  const onepRealValue = useOnepParamValue(value.suite, onepParamIndex, onepVariation, isOnep && onepIsTng);
  const setOnep = (paramIndex: number, variation: number) =>
    onChange({ ...value, realization: onepRealizationId(paramIndex, variation) });
  const onepCaption = onepMissingVariations.has(onepVariation)
    ? `⚠️ p${onepParamIndex} has no published variation=${onepVariation > 0 ? `+${onepVariation}` : onepVariation} simulation (a real gap in the public release) - pick another variation.`
    : onepIsTng
      ? onepRealValue !== null
        ? `real value: ${onepParamName} = ${onepRealValue.toPrecision(4)}`
        : 'Real value not directly readable from any output file for this parameter - only the variation step is shown.'
      : undefined;

  return (
    <>
      <SelectField
        label="Suite"
        value={value.suite}
        options={suiteOptions}
        onChange={(suite) => onChange({ ...value, suite })}
      />
      <SelectField
        label="Set"
        value={activeSet?.label ?? value.setName}
        options={setOptions.map((s) => s.label)}
        onChange={(label) => {
          const next = setOptions.find((s) => s.label === label);
          if (next) applySet(next.name);
        }}
      />
      {isOnep ? (
        <>
          <SelectField
            label="1P Parameter"
            value={onepParamOptions.find((p) => p.index === onepParamIndex)?.label ?? `p${onepParamIndex}`}
            options={onepParamOptions.map((p) => p.label)}
            onChange={(label) => {
              const next = onepParamOptions.find((p) => p.label === label);
              if (next) setOnep(next.index, onepVariation);
            }}
          />
          {!hideRealizationValueControls && (
            <>
              <OptionSlider
                label="Variation"
                options={ONEP_VARIATIONS}
                value={onepVariation}
                formatValue={(v) => (v > 0 ? `+${v}` : String(v))}
                onChange={(variation) => setOnep(onepParamIndex, variation)}
              />
              {onepCaption && <p className="number-stepper__caption">{onepCaption}</p>}
            </>
          )}
        </>
      ) : !hideRealizationValueControls ? (
        <NumberStepper
          label="Realization"
          value={Number(value.realization)}
          onChange={(realization) => onChange({ ...value, realization })}
          caption={
            value.setName === 'SB' && realizationCount === null
              ? `⚠️ SB isn't published for ${value.suite} - only IllustrisTNG (SB28) and Astrid (SB7) have an SB set.`
              : realizationCount !== null ? `0–${realizationCount - 1}` : undefined
          }
        />
      ) : null}
    </>
  );
}
