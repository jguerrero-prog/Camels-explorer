import { useState } from 'react';
import { CustomFilterSettingsModal } from './CustomFilterSettingsModal';
import type { CustomSelection } from './CustomFieldsForm';
import type { CustomFieldTreeNode } from '../../lib/api';
import './CustomTab.css';

export type CustomFilterSettingsProps = {
  tree: CustomFieldTreeNode[] | null;
  treeError?: boolean;
  selection: CustomSelection;
  onChange: (selection: CustomSelection) => void;
};

/** Real fix (2026-08-06, direct user feedback - see
 * `CustomFilterSettingsModal`'s own docs for the full "why"). Used to
 * render the field tree inline, collapsed-by-default, directly in the
 * cramped 280px sidebar column - now just opens that same tree in a real
 * modal instead, with real room. External props unchanged from the
 * original version of this component, so `CustomSidebar` (one of its two
 * callers - see `CustomTab.tsx` for the other, added the same day) needed
 * no changes at all. */
export function CustomFilterSettings({ tree, treeError, selection, onChange }: CustomFilterSettingsProps) {
  const [open, setOpen] = useState(false);
  const fieldCount = selection.activeFilterFields.length;

  return (
    <div className="custom-tab__filter-settings">
      <div className="custom-tab__divider" />
      <button type="button" className="custom-tab__filter-settings-header" onClick={() => setOpen(true)}>
        <span className="custom-tab__label">Filter settings</span>
        {fieldCount > 0 && (
          <span className="custom-tab__filter-settings-count">
            {fieldCount} field{fieldCount === 1 ? '' : 's'}
          </span>
        )}
      </button>
      {open && (
        <CustomFilterSettingsModal
          tree={tree}
          treeError={treeError}
          selection={selection}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
