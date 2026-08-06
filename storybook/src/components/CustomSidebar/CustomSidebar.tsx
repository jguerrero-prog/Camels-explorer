import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Button } from '../Button/Button';
import { CustomFieldsForm } from '../AddPlotModal/CustomFieldsForm';
import type { CustomSelection } from '../AddPlotModal/CustomFieldsForm';
import { CustomFilterValues } from '../AddPlotModal/CustomFilterValues';
import { CustomFilterSettings } from '../AddPlotModal/CustomFilterSettings';
import { useCustomFields, useCustomFieldTree } from '../../lib/useCustomFields';
import '../ParamsSidebar/ParamsSidebar.css';

export type CustomSidebarProps = {
  selection: CustomSelection;
  onChange: (selection: CustomSelection) => void;
  onRemove: () => void;
};

/** Custom tile's real per-tile sidebar (added 2026-08-05) - reuses
 * `CustomFieldsForm`, the exact same field-picking UI `CustomTab` (Add
 * Plot modal) uses, so a Custom tile's filters/fields/chart params stay
 * editable after creation - the same real capability every other
 * statistic's own per-tile sidebar already has (see BispectrumSidebar/
 * SFRHistorySidebar etc.), rather than a one-shot, uneditable tile.
 *
 * Real, deliberate difference from the modal (fixed 2026-08-05, see
 * CustomFilterValues' own docs): this is the ONE place a filter field's
 * actual Min/Max range gets edited, via `CustomFilterValues` rendered
 * below the shared form - dragging a slider here calls `onChange` with
 * the updated selection, which App.tsx's `refetchCustomTile` turns into a
 * real, live re-fetch of the already-rendered tile next to it, giving the
 * immediate visual feedback a value picked blind inside a modal never
 * could.
 *
 * Real fix (2026-08-05), caught directly by a user: this used to render
 * `CustomFieldsForm` with its full inline Filters tree (every field,
 * always expanded) ahead of the actual values - "looks like an exact copy
 * and paste" of the modal, burying the values a user actually came here to
 * adjust under a wall of "+ Add" buttons. Now: top-level choices → live
 * values for whichever fields are already active (`CustomFilterValues`) →
 * a divider → a "Filter settings…" button (`CustomFilterSettings`) opening
 * the same tree in a real modal (real fix, 2026-08-06 - see
 * `CustomFilterSettingsModal.mdx` for why it's a modal now, not an inline
 * collapsible section) for adding/removing filters post-creation without
 * reopening the Add Plot modal.
 *
 * Real fix (2026-08-06): this content's own scroll/fade overflow handling
 * (base pickers + N filter values + the tree, filters unbounded in count)
 * used to be hand-rolled entirely in this file, since `ParamsSidebar` was
 * shared by ~12 other statistics' sidebars that never needed to scroll.
 * Generalized into `ParamsSidebar` itself (its own `footer` prop covers
 * "Remove plot" staying pinned) so every sidebar gets the same real
 * scroll-then-fade affordance, not just this one. */
export function CustomSidebar({ selection, onChange, onRemove }: CustomSidebarProps) {
  const { fields, error } = useCustomFields();
  const { tree, error: treeError } = useCustomFieldTree();

  return (
    <ParamsSidebar title="Custom" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      {error ? (
        <p className="custom-tab__error">Couldn't load real field metadata — is the API server running?</p>
      ) : !fields ? (
        <p className="custom-tab__loading">Loading real FlatHUB field list…</p>
      ) : (
        <>
          <CustomFieldsForm fields={fields} selection={selection} onChange={onChange} />
          <CustomFilterValues
            fields={fields}
            activeFilterFields={selection.activeFilterFields}
            paramFilters={selection.paramFilters}
            onChange={(paramFilters) => onChange({ ...selection, paramFilters })}
          />
          <CustomFilterSettings tree={tree} treeError={treeError} selection={selection} onChange={onChange} />
        </>
      )}
    </ParamsSidebar>
  );
}
