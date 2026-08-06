import { RangeFilterControl } from '../RangeFilterControl/RangeFilterControl';
import { labelFromTitleUnits } from '../../lib/customFieldFormat';
import type { CustomField, CustomParamRange } from '../../lib/api';
import './CustomTab.css';

export type CustomFilterValuesProps = {
  fields: CustomField[];
  activeFilterFields: string[];
  paramFilters: Record<string, CustomParamRange>;
  onChange: (paramFilters: Record<string, CustomParamRange>) => void;
};

/** Real Min/Max range editing for whichever fields the user has added as
 * filters (via CustomFilterTree, in the modal or here) - deliberately
 * sidebar-only. This is the "immediate feedback" the user asked for: it
 * sits next to the live rendered tile, so dragging/typing a value here
 * refetches/re-renders it live via CustomSidebar's onChange ->
 * App.tsx's refetchCustomTile, the same pattern every other statistic's
 * own sidebar already uses (see MassRangeSidebar). Never rendered inside
 * the Add Plot modal - CustomFieldsForm (used there) has no
 * RangeFilterControl import at all; only CustomSidebar renders this
 * component.
 *
 * Real, deliberate correction 2026-08-05: this used to render each active
 * filter as two separate full-width `Slider`s (one "Min", one "Max"),
 * each independently draggable across the field's entire real range -
 * not FlatHUB's own real filter-component shape. Per direct user
 * feedback ("Flathub has those filter components as a container housing
 * a range slider and a min and max input field"), each filter now renders
 * as one `RangeFilterControl`: two typeable number inputs plus one real
 * dual-handle range track. See RangeFilterControl.mdx. */
export function CustomFilterValues({ fields, activeFilterFields, paramFilters, onChange }: CustomFilterValuesProps) {
  if (activeFilterFields.length === 0) return null;
  const fieldByName = new Map(fields.map((f) => [f.name, f]));

  return (
    <div className="custom-tab__field">
      <p className="custom-tab__label">Filter values</p>
      <p className="custom-tab__caption">Drag to constrain the live tile - refetches as you go.</p>
      {activeFilterFields.map((name) => {
        const field = fieldByName.get(name);
        if (!field) return null; // real gap: field metadata hasn't loaded/matched yet
        const statsMin = field.stats?.min;
        const statsMax = field.stats?.max;
        // Real gap: some Group_*/Subhalo_* leaves carry no live `stats` at
        // all, and a handful have min===max - never fabricate a 0-1
        // fallback bound (see feedback_camels_synthetic_removal.md's own
        // "never fabricate" discipline), and a zero-width range would
        // divide by zero in RangeFilterControl's own percent math. Both
        // cases: show the field as added, say the range is unavailable,
        // render no control rather than a lying or dead one.
        if (statsMin === undefined || statsMax === undefined || statsMax <= statsMin) {
          return (
            <div key={name} className="custom-tab__param-row">
              <p className="custom-tab__param-row-label">{labelFromTitleUnits(field.title, field.units)}</p>
              <p className="custom-tab__caption">No live range available for this field.</p>
            </div>
          );
        }
        const range: CustomParamRange = paramFilters[name] ?? { min: statsMin, max: statsMax };
        return (
          <div key={name} className="custom-tab__param-row">
            <RangeFilterControl
              label={labelFromTitleUnits(field.title, field.units)}
              min={statsMin}
              max={statsMax}
              value={range}
              onChange={(next) => onChange({ ...paramFilters, [name]: next })}
            />
          </div>
        );
      })}
    </div>
  );
}
