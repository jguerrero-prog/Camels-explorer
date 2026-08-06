import { useCustomFields, useCustomFieldTree } from '../../lib/useCustomFields';
import { CustomFieldsForm } from './CustomFieldsForm';
import type { CustomSelection } from './CustomFieldsForm';
import { CustomFilterSettings } from './CustomFilterSettings';
import './CustomTab.css';

export type { CustomSelection, CustomChartType } from './CustomFieldsForm';
export { EMPTY_CUSTOM_SELECTION } from './CustomFieldsForm';

export type CustomTabProps = {
  selection: CustomSelection;
  onChange: (selection: CustomSelection) => void;
};

/** The real, wired Custom tab (replaces the static Figma-transcribed
 * placeholder this file used to be - see git history/AddPlotModal.mdx for
 * the "before"). Every field/option here is fetched live from
 * `GET /api/custom/fields` (api/routers/custom.py, proxying Flatiron's own
 * public FlatHUB API) - the real value proposition this tab exists for is
 * querying across the *whole* ~2.9B-row cross-realization ensemble, not
 * one realization's own files the way Curated's tab does.
 *
 * The actual field-picking UI lives in `CustomFieldsForm` - shared with
 * `CustomSidebar` (App.tsx) so a tile's filters/fields stay editable after
 * creation, the same as every other statistic's own per-tile sidebar. */
export function CustomTab({ selection, onChange }: CustomTabProps) {
  const { fields, error } = useCustomFields();
  const { tree, error: treeError } = useCustomFieldTree();

  if (error) {
    return (
      <p className="custom-tab__error">
        Couldn't load real field metadata — is the API server running?
        <br />
        <code>uvicorn api.main:app --port 8010</code>
      </p>
    );
  }

  if (!fields) {
    return <p className="custom-tab__loading">Loading real FlatHUB field list (241 fields)…</p>;
  }

  return (
    <>
      <CustomFieldsForm fields={fields} selection={selection} onChange={onChange} />
      {/* Real fix (2026-08-06, direct user feedback): the inline Filters
          tree this used to render (CustomFieldsForm's own `showFilterTree`
          default) is gone - same "Filter settings…" modal trigger
          CustomSidebar already uses post-creation, so both places share
          one real experience instead of two differently-cramped ones. */}
      <CustomFilterSettings tree={tree} treeError={treeError} selection={selection} onChange={onChange} />
    </>
  );
}
