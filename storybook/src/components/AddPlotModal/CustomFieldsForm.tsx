import { SelectField } from '../SelectField/SelectField';
import { Checkbox } from '../Checkbox/Checkbox';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { useCustomCount } from '../../lib/useCustomFields';
import { buildCustomFilters } from '../../lib/api';
import { labelFromTitleUnits } from '../../lib/customFieldFormat';
import type { CustomField, CustomFieldTreeNode, CustomParamRange } from '../../lib/api';
import './CustomTab.css';

export type CustomChartType = 'scatter' | 'histogram' | 'heatmap' | 'boxplot' | 'scatter3d';

/** All 5 of FlatHUB's own real chart types, now all wired to the live
 * `/custom/data`/`/custom/histogram` endpoints - see App.tsx's
 * `loadCustomTile` for how each maps to a real request shape. */
const CHART_TYPES: { value: CustomChartType; label: string; enabled: boolean }[] = [
  { value: 'scatter', label: 'Scatterplot', enabled: true },
  { value: 'histogram', label: 'Histogram', enabled: true },
  { value: 'heatmap', label: 'Heatmap', enabled: true },
  { value: 'boxplot', label: 'Box Plot', enabled: true },
  { value: 'scatter3d', label: '3D Scatterplot', enabled: true },
];

/** Real, per-chart-type required-field check (added 2026-08-06 alongside
 * enabling the other 4 chart types) - AddPlotModal's own confirm-button
 * gate used to hardcode `type && xField && yField`, correct only for
 * Scatterplot; Histogram never sets/needs a yField, and 3D Scatterplot
 * additionally needs zField, so that check silently kept "Add Plot"
 * disabled forever for any non-Scatterplot chart type. */
export function isCustomSelectionComplete(selection: CustomSelection): boolean {
  if (!selection.type || !selection.xField) return false;
  switch (selection.chartType) {
    case 'histogram': return true;
    case 'scatter3d': return Boolean(selection.yField && selection.zField);
    default: return Boolean(selection.yField);
  }
}

// The 3 real enum fields - never valid X/Y/Color axes (FlatHUB's /data
// endpoint returns their raw integer/bool encoding, not the decoded
// string, and plotting simulation_suite on an axis is nonsense anyway).
const ENUM_FIELDS = new Set(['simulation_suite', 'simulation_set', 'type']);

// Real but not user-facing: `_id` is FlatHUB's own internal document id,
// `simulation_set_id` is an internal integer paralleling simulation_set's
// enum - neither is part of any Group_*/Subhalo_*/params_* family and
// neither is in the "always relevant" list the task specified, so both are
// excluded from every picker here rather than shown as meaningless axes.
const INTERNAL_FIELDS = new Set(['_id', 'simulation_set_id']);

const ALWAYS_RELEVANT = new Set(['simulation_suite', 'simulation_set', 'snapshot', 'redshift', 'id']);

/** Fields relevant for a given `type` selection - Group_* only makes sense
 * for "FoF halo", Subhalo_* only for "Subhalo" (querying the wrong family
 * for a given type returns nulls, confirmed directly against the live
 * FlatHUB API), plus params_* / simulation_suite / simulation_set /
 * snapshot / redshift / id, which apply regardless of type. */
export function fieldsForType(fields: CustomField[], type: string): CustomField[] {
  const familyPrefix = type === 'FoF halo' ? 'Group_' : 'Subhalo_';
  return fields.filter(
    (f) =>
      !INTERNAL_FIELDS.has(f.name)
      && (f.name.startsWith(familyPrefix) || f.name.startsWith('params_') || ALWAYS_RELEVANT.has(f.name)),
  );
}

/** The narrower set valid for an X/Y/Color axis picker - same as
 * `fieldsForType` minus the 3 enum fields, which can't be plotted
 * numerically. */
function axisFields(fields: CustomField[], type: string): CustomField[] {
  return fieldsForType(fields, type).filter((f) => !ENUM_FIELDS.has(f.name));
}

/** Same family-filtering `fieldsForType` already does for the flat X/Y/
 * Color pickers, applied to the *nested* field-tree instead - only the
 * `params` branch (always relevant) plus whichever of `Group`/`Subhalo`
 * matches the selected Type is shown as a filterable branch.
 * `simulation_suite`/`simulation_set`/`type` are deliberately excluded
 * here even though `fieldsForType` includes them for the flat list - those
 * three already have their own dedicated top-level pickers (Suite/Set/
 * Type above), so showing them again in the Filters tree would just be a
 * confusing second way to set the same thing. */
export function filterTreeForType(tree: CustomFieldTreeNode[] | null, type: string): CustomFieldTreeNode[] {
  if (!tree || !type) return [];
  const familyName = type === 'FoF halo' ? 'Group' : 'Subhalo';
  return tree.filter((n) => n.name === 'params' || n.name === familyName);
}

/** Add/remove a field from `activeFilterFields` (the Filters tree's own
 * "+ Add"/"Remove" toggle) - shared by CustomFieldsForm (modal's inline
 * tree) and CustomSidebar's own "Filter settings" section (post-creation
 * tree), so both stay in sync via the exact same logic rather than two
 * hand-copied implementations drifting apart. Removing a field also drops
 * any range already set for it - an unconstrained field re-added later
 * starts fresh at its full real range, not a stale leftover value. */
export function toggleCustomFilterField(selection: CustomSelection, name: string): CustomSelection {
  const active = selection.activeFilterFields.includes(name);
  if (active) {
    const { [name]: _removed, ...restParams } = selection.paramFilters;
    return {
      ...selection,
      activeFilterFields: selection.activeFilterFields.filter((f) => f !== name),
      paramFilters: restParams,
    };
  }
  return { ...selection, activeFilterFields: [...selection.activeFilterFields, name] };
}

export type CustomSelection = {
  type: 'FoF halo' | 'Subhalo' | '';
  suite: string; // '' = Any
  set: string; // '' = Any
  /** Fields the user has added via the Filters tree ("+ Add") - just
   * names, no values. A name here with no matching `paramFilters` entry
   * means "added but unconstrained" (full real range), matching the
   * original static placeholder's own "Nothing is pre-selected" caption -
   * added-but-unconstrained is a real, distinct state from not-added, even
   * though both currently don't narrow the query. */
  activeFilterFields: string[];
  /** Real min/max only for fields whose range has actually been dragged
   * away from its default (in CustomFilterValues, sidebar-only) - see
   * CustomParamRange's own docs in lib/api.ts. */
  paramFilters: Record<string, CustomParamRange>;
  chartType: CustomChartType;
  xField: string;
  /** For Box Plot, this is the VALUE field the quartiles are computed over
   * (FlatHUB's own `quartiles` param), not a second axis to plot - see
   * the "Value field" picker below. Unused (ignored) for Histogram. */
  yField: string;
  colorField: string; // '' = none
  /** 3D Scatterplot's third axis - unused for every other chart type. */
  zField: string;
  logX: boolean;
  logY: boolean;
  logZ: boolean;
  /** Real FlatHUB HistogramField.size (bucket count) - applies to xField
   * for Histogram/Box Plot, and to both xField/yField for Heatmap (one
   * shared grid resolution, not independent per axis - keeps the control
   * to one field rather than two for a minor axis-symmetry gain). Unused
   * for Scatterplot/3D Scatterplot, which plot raw rows, not buckets. */
  binCount: number;
};

export const EMPTY_CUSTOM_SELECTION: CustomSelection = {
  type: '',
  suite: '',
  set: '',
  activeFilterFields: [],
  paramFilters: {},
  chartType: 'scatter',
  xField: '',
  yField: '',
  colorField: '',
  zField: '',
  logX: false,
  logY: false,
  logZ: false,
  binCount: 20,
};

export function fieldLabel(field: CustomField | undefined): string {
  if (!field) return '';
  return labelFromTitleUnits(field.title, field.units);
}

export type CustomFieldsFormProps = {
  fields: CustomField[];
  selection: CustomSelection;
  onChange: (selection: CustomSelection) => void;
};

/** The real, wired guts of the Custom tab - shared between CustomTab (Add
 * Plot modal, creation) and CustomSidebar (post-creation edit), so a
 * user's filters/fields stay editable after a tile exists, same as every
 * other statistic's own per-tile sidebar. Every option here comes from the
 * live `GET /api/custom/fields`/`/field-tree` responses - nothing is a
 * fabricated field tree (see the placeholder this replaced, CustomTab.tsx's
 * own history).
 *
 * Deliberately contains ZERO Slider/range-input elements - this component
 * only ever lets a user pick *which* fields to filter on (the Filters
 * tree's "+ Add"/"Remove"), never *what value* to filter them to. Real
 * range/value editing lives in CustomFilterValues, rendered only by
 * CustomSidebar (post-creation) - see that file's own docs for why: fixing
 * a range blind inside a modal you have to close and resubmit to see the
 * effect of gives no immediate feedback, the exact interaction bug a user
 * caught directly in an earlier pass of this tab.
 *
 * Real fix (2026-08-06, direct user feedback): this used to also own an
 * inline Filters tree (`showFilterTree` prop, defaulting to true here) -
 * removed entirely in favor of `CustomFilterSettings`' own modal, which
 * both `CustomTab` and `CustomSidebar` now render as a real separate
 * step - see `CustomFilterSettingsModal.mdx`. `tree`/`treeError` are no
 * longer props here at all, since this component has nothing left to do
 * with them. */
export function CustomFieldsForm({ fields, selection, onChange }: CustomFieldsFormProps) {
  const pickableFields = selection.type ? axisFields(fields, selection.type) : [];
  const fieldByName = new Map(fields.map((f) => [f.name, f]));
  const isScatter = selection.chartType === 'scatter';
  const isScatter3d = selection.chartType === 'scatter3d';
  const isHistogram = selection.chartType === 'histogram';
  const isHeatmap = selection.chartType === 'heatmap';
  const isBoxplot = selection.chartType === 'boxplot';

  const filters = buildCustomFilters(selection);
  const { count, status } = useCustomCount(filters);

  return (
    <div className="custom-tab">
      <SelectField
        label="Type"
        value={selection.type || 'Select a type…'}
        options={['Select a type…', 'FoF halo', 'Subhalo']}
        onChange={(v) => {
          if (v === 'Select a type…') return;
          onChange({ ...selection, type: v as 'FoF halo' | 'Subhalo', xField: '', yField: '', colorField: '', zField: '' });
        }}
      />

      <SelectField
        label="Suite"
        value={selection.suite || 'Any'}
        options={['Any', 'IllustrisTNG', 'SIMBA']}
        onChange={(v) => onChange({ ...selection, suite: v === 'Any' ? '' : v })}
      />
      <SelectField
        label="Set"
        value={selection.set || 'Any'}
        options={['Any', 'LH', '1P', 'CV', 'EX']}
        onChange={(v) => onChange({ ...selection, set: v === 'Any' ? '' : v })}
      />

      <SelectField
        label="Chart type"
        value={CHART_TYPES.find((c) => c.value === selection.chartType)?.label ?? CHART_TYPES[0].label}
        options={CHART_TYPES.map((c) => c.label)}
        disabledOptions={CHART_TYPES.filter((c) => !c.enabled).map((c) => c.label)}
        onChange={(label) => {
          const chosen = CHART_TYPES.find((c) => c.label === label);
          if (chosen?.enabled) onChange({ ...selection, chartType: chosen.value });
        }}
      />

      <SelectField
        label={isBoxplot ? 'Bucket field' : isHistogram ? 'Field' : 'X field'}
        value={selection.xField || 'Select a field…'}
        options={['Select a field…', ...pickableFields.map((f) => f.name)]}
        onChange={(v) => onChange({ ...selection, xField: v === 'Select a field…' ? '' : v })}
        caption={selection.xField ? fieldLabel(fieldByName.get(selection.xField)) : !selection.type ? 'Pick a Type first' : undefined}
        searchable
      />
      <Checkbox label="Log scale (X)" checked={selection.logX} onChange={(logX) => onChange({ ...selection, logX })} />

      {(isHistogram || isHeatmap || isBoxplot) && (
        <NumberStepper
          label="Bin count"
          value={selection.binCount}
          step={1}
          onChange={(v) => onChange({ ...selection, binCount: Math.max(2, Math.round(v)) })}
          caption={isHeatmap ? 'Applies to both fields' : undefined}
        />
      )}

      {(isScatter || isScatter3d || isHeatmap) && (
        <>
          <SelectField
            label="Y field"
            value={selection.yField || 'Select a field…'}
            options={['Select a field…', ...pickableFields.map((f) => f.name)]}
            onChange={(v) => onChange({ ...selection, yField: v === 'Select a field…' ? '' : v })}
            caption={selection.yField ? fieldLabel(fieldByName.get(selection.yField)) : !selection.type ? 'Pick a Type first' : undefined}
            searchable
          />
          <Checkbox label="Log scale (Y)" checked={selection.logY} onChange={(logY) => onChange({ ...selection, logY })} />
        </>
      )}

      {isBoxplot && (
        <SelectField
          label="Value field"
          value={selection.yField || 'Select a field…'}
          options={['Select a field…', ...pickableFields.map((f) => f.name)]}
          onChange={(v) => onChange({ ...selection, yField: v === 'Select a field…' ? '' : v })}
          caption={selection.yField ? `Quartiles of ${fieldLabel(fieldByName.get(selection.yField))}, per bucket` : !selection.type ? 'Pick a Type first' : undefined}
          searchable
        />
      )}

      {isScatter3d && (
        <>
          <SelectField
            label="Z field"
            value={selection.zField || 'Select a field…'}
            options={['Select a field…', ...pickableFields.map((f) => f.name)]}
            onChange={(v) => onChange({ ...selection, zField: v === 'Select a field…' ? '' : v })}
            caption={selection.zField ? fieldLabel(fieldByName.get(selection.zField)) : !selection.type ? 'Pick a Type first' : undefined}
            searchable
          />
          <Checkbox label="Log scale (Z)" checked={selection.logZ} onChange={(logZ) => onChange({ ...selection, logZ })} />
        </>
      )}

      {(isScatter || isScatter3d) && (
        <SelectField
          label="Color field (optional)"
          value={selection.colorField || 'None'}
          options={['None', ...pickableFields.map((f) => f.name)]}
          onChange={(v) => onChange({ ...selection, colorField: v === 'None' ? '' : v })}
          caption={selection.colorField ? fieldLabel(fieldByName.get(selection.colorField)) : undefined}
          searchable
        />
      )}

      <div className="custom-tab__count-preview">
        {status === 'error' ? (
          <p className="custom-tab__caption">Couldn't reach FlatHUB for a row count.</p>
        ) : (
          <p className="custom-tab__caption">
            {status === 'loading' || count === null ? 'Counting matching rows…' : `Filtered to ${count.toLocaleString()} out of 2,927,443,277 total rows`}
          </p>
        )}
      </div>
    </div>
  );
}
