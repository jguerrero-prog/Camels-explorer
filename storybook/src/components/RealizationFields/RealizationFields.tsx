import { useEffect } from 'react';
import { SelectField } from '../SelectField/SelectField';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Checkbox } from '../Checkbox/Checkbox';
import { MultiSelect } from '../MultiSelect/MultiSelect';
import { Radio } from '../Radio/Radio';
import type { Catalog } from '../../lib/useCatalogMetadata';
import {
  realizationCountFor, onepRealizationId, parseOnepRealizationId, useOnepParamValue,
} from '../../lib/useCatalogMetadata';
import '../NumberStepper/NumberStepper.css';

export type RealizationFieldsValue = {
  suite: string;
  setName: string;
  compareMode: boolean;
  // A plain realization index for every set except 1P, whose real folders
  // are compound-named by parameter+variation (e.g. "p11_2") - see the 1P
  // block below.
  realizations: (number | string)[];
  /** Which axis Compare mode varies (issue #56) - 'realization' (fixed
   * suite, multiple realizations - the original, only behavior) or 'suite'
   * (fixed realization, multiple suites), letting a user check a result
   * against a different simulation code the way CAMELS' own papers do via
   * the CV set's shared realizations across suites. Optional and defaults
   * to 'realization' when omitted, so every existing value/caller keeps
   * its exact current behavior without needing to set this. */
  compareAxis?: 'realization' | 'suite';
  /** Selected suites when compareAxis === 'suite'. Ignored otherwise. */
  compareSuites?: string[];
};

// Real 1P variation steps (app.py's own select_slider options) - 0 is the
// fiducial (shared baseline) simulation every parameter index has.
const ONEP_VARIATIONS = [-2, -1, 0, 1, 2];
// Fallback (backend.py's ONEP_MAX_INDEX_FOR_SUITE) for IllustrisTNG, used
// only until GET /api/metadata loads.
const FALLBACK_ONEP_MAX_INDEX = 28;

export type RealizationFieldsProps = {
  catalog: Catalog | null;
  value: RealizationFieldsValue;
  onChange: (value: RealizationFieldsValue) => void;
  /** Restricts the Suite dropdown to only these suites - e.g. SFR History
   * only has real coverage for 3 of 4 (backend.py's PUBLIC_SFRH_SUITES,
   * exposed as GET /api/metadata's statistic_suites). Omit when every
   * suite is real for this statistic (most are). Added 2026-08-05 so an
   * unsupported combination can't be configured in the first place, rather
   * than only being disclosed as "No data available" after the fact. */
  allowedSuites?: string[];
  /** Restricts the Set dropdown similarly - only Bispectrum is narrower
   * than "every set" among this component's real statistics. */
  allowedSets?: string[];
};

/** Suite / Set / Compare mode / Realization(s) - the real fields every
 * per-tile sidebar in this app opens with, regardless of which statistic
 * it's for (see `GET /api/metadata`'s own suites/sets, shared across every
 * statistic). Extracted 2026-08-05 from `MassRangeSidebar` once
 * `PowerSpectrumSidebar`/`BispectrumSidebar`/`SFRHistorySidebar` were about
 * to duplicate the identical block a 3rd/4th/5th time - not a
 * pre-emptive abstraction, real duplication crossing the "three strikes"
 * line this project already applies elsewhere. */
export function RealizationFields({ catalog, value, onChange, allowedSuites, allowedSets }: RealizationFieldsProps) {
  const activeSet = catalog?.sets.find((s) => s.name === value.setName);
  const realizationCount = realizationCountFor(catalog, value.setName, value.suite);
  const sbUnsupported = value.setName === 'SB' && realizationCount === null;
  const isOnep = value.setName === '1P';

  const suiteOptions = (catalog?.suites ?? [value.suite]).filter((s) => !allowedSuites || allowedSuites.includes(s));
  const setOptions = (catalog?.sets ?? []).filter((s) => !allowedSets || allowedSets.includes(s.name));
  const applySet = (setName: string) =>
    onChange({
      ...value,
      setName,
      compareMode: setName === '1P' ? false : value.compareMode,
      realizations: setName === '1P' ? [onepRealizationId(1, 0)] : [0],
    });

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

  // 1P is IllustrisTNG-named, generic p{N} for every other suite (real
  // parameters mostly aren't exposed in the other suites' own output-file
  // metadata - see backend.py's ONEP_TNG_PARAMS comment). Compare mode is
  // forced off for 1P (matches app.py's own `compare_mode = False`) - a
  // compound "p11_2"-style id can't be represented in the MultiSelect's
  // number-only "Realizations to compare" affordance below.
  const onepIsTng = value.suite === 'IllustrisTNG';
  const onepMaxIndex = catalog?.onep_max_index_for_suite[value.suite]
    ?? (onepIsTng ? FALLBACK_ONEP_MAX_INDEX : undefined);
  const onepParamOptions = onepIsTng
    ? (catalog?.onep_tng_params ?? []).map((p) => ({ index: p.index, name: p.name, label: `p${p.index}: ${p.name} (${p.category})` }))
    : Array.from({ length: onepMaxIndex ?? 0 }, (_, i) => ({ index: i + 1, name: `p${i + 1}`, label: `p${i + 1}` }));
  const parsedOnep = isOnep && typeof value.realizations[0] === 'string'
    ? parseOnepRealizationId(value.realizations[0])
    : null;
  const onepParamIndex = parsedOnep?.paramIndex ?? 1;
  const onepVariation = parsedOnep?.variation ?? 0;
  const onepParamName = onepParamOptions.find((p) => p.index === onepParamIndex)?.name ?? `p${onepParamIndex}`;
  const onepMissingVariations = onepIsTng
    ? new Set(catalog?.onep_tng_missing_variations[String(onepParamIndex)] ?? [])
    : new Set<number>();
  const onepRealValue = useOnepParamValue(value.suite, onepParamIndex, onepVariation, isOnep && onepIsTng);
  const setOnep = (paramIndex: number, variation: number) =>
    onChange({ ...value, realizations: [onepRealizationId(paramIndex, variation)] });
  const onepCaption = onepMissingVariations.has(onepVariation)
    ? `⚠️ p${onepParamIndex} has no published variation=${onepVariation > 0 ? `+${onepVariation}` : onepVariation} simulation (a real gap in the public release) - pick another variation.`
    : onepIsTng
      ? onepRealValue !== null
        ? `real value: ${onepParamName} = ${onepRealValue.toPrecision(4)}`
        : 'Real value not directly readable from any output file for this parameter - only the variation step is shown.'
      : undefined;

  const compareBySuite = value.compareMode && !isOnep && value.compareAxis === 'suite';
  const compareSuites = value.compareSuites ?? [];

  return (
    <>
      {!compareBySuite && (
        <SelectField
          label="Suite"
          value={value.suite}
          options={suiteOptions}
          onChange={(suite) => onChange({ ...value, suite })}
        />
      )}
      <SelectField
        label="Set"
        value={activeSet?.label ?? value.setName}
        options={setOptions.map((s) => s.label)}
        onChange={(label) => {
          const next = setOptions.find((s) => s.label === label);
          if (next) applySet(next.name);
        }}
      />
      {!isOnep && (
        <Checkbox
          label="Compare mode"
          checked={value.compareMode}
          onChange={(compareMode) => onChange({ ...value, compareMode })}
        />
      )}
      {sbUnsupported && (
        <p className="number-stepper__caption">
          ⚠️ SB isn't published for {value.suite} - only IllustrisTNG (SB28) and Astrid (SB7) have an SB set.
        </p>
      )}
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
          <OptionSlider
            label="Variation"
            options={ONEP_VARIATIONS}
            value={onepVariation}
            formatValue={(v) => (v > 0 ? `+${v}` : String(v))}
            onChange={(variation) => setOnep(onepParamIndex, variation)}
          />
          {onepCaption && <p className="number-stepper__caption">{onepCaption}</p>}
        </>
      ) : value.compareMode ? (
        <>
          <Radio
            label="Compare by"
            value={compareBySuite ? 'Suites' : 'Realizations'}
            options={['Realizations', 'Suites']}
            onChange={(label) => {
              const axis = label === 'Suites' ? 'suite' : 'realization';
              onChange({
                ...value,
                compareAxis: axis,
                // Seed with the currently-fixed suite the first time someone
                // switches to suite-axis, so the MultiSelect isn't empty.
                compareSuites: axis === 'suite' && compareSuites.length === 0 ? [value.suite] : value.compareSuites,
              });
            }}
          />
          {compareBySuite ? (
            <>
              <NumberStepper
                label="Realization"
                value={Number(value.realizations[0])}
                onChange={(realization) => onChange({ ...value, realizations: [realization] })}
                caption={realizationCount !== null ? `0–${realizationCount - 1}` : undefined}
              />
              <MultiSelect
                label="Suites to compare"
                values={compareSuites}
                onAdd={(v) => {
                  if (suiteOptions.includes(v) && !compareSuites.includes(v)) {
                    onChange({ ...value, compareSuites: [...compareSuites, v] });
                  }
                }}
                onRemove={(v) => {
                  const remaining = compareSuites.filter((s) => s !== v);
                  if (remaining.length > 0) onChange({ ...value, compareSuites: remaining });
                }}
                placeholder="Add suite…"
                options={suiteOptions}
              />
            </>
          ) : (
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
              caption={realizationCount !== null ? `${realizationCount.toLocaleString()} realizations available` : undefined}
              options={realizationCount !== null ? Array.from({ length: realizationCount }, (_, i) => String(i)) : undefined}
            />
          )}
        </>
      ) : (
        <NumberStepper
          label="Realization"
          value={Number(value.realizations[0])}
          onChange={(realization) => onChange({ ...value, realizations: [realization] })}
          caption={realizationCount !== null ? `0–${realizationCount - 1}` : undefined}
        />
      )}
    </>
  );
}
