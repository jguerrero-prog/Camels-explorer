import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomFilterTree } from './CustomFilterTree';
import { filterTreeForType, toggleCustomFilterField } from './CustomFieldsForm';
import type { CustomSelection } from './CustomFieldsForm';
import type { CustomFieldTreeNode } from '../../lib/api';
import './CustomFilterSettingsModal.css';

export type CustomFilterSettingsModalProps = {
  tree: CustomFieldTreeNode[] | null;
  treeError?: boolean;
  selection: CustomSelection;
  onChange: (selection: CustomSelection) => void;
  onClose: () => void;
};

/** Real fix (2026-08-06, direct user feedback: "the filter settings on the
 * side menu has a poor experience... turn 'filter settings' to instead
 * open up a modal where all of the filters live and all of the context
 * fits with no cutoffs"). Replaces two previously-separate cramped homes
 * for the same real `CustomFilterTree` - `CustomFieldsForm`'s own inline
 * tree (shown at tile-creation time, in the Add Plot modal's ~400px-wide
 * column) and `CustomFilterSettings`' collapsed-by-default sidebar section
 * (shown post-creation, in the 280px `ParamsSidebar` column) - with one
 * shared, full-size modal used from both places. Real field descriptions,
 * group names, and "N fields" badges get real room instead of fighting
 * truncation in either narrow column (see `CustomTab.css`'s own
 * 2026-08-06 overflow fixes, which this sidesteps rather than needing
 * more of). */
export function CustomFilterSettingsModal({ tree, treeError, selection, onChange, onClose }: CustomFilterSettingsModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const nodes = filterTreeForType(tree, selection.type);

  return createPortal(
    <div className="filter-settings-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="filter-settings-modal" role="dialog" aria-modal="true" aria-label="Filter settings">
        <div className="filter-settings-modal__header">
          <p className="filter-settings-modal__title">Filter settings</p>
          <button type="button" className="filter-settings-modal__close" onClick={onClose} aria-label="Close" title="Close">
            ×
          </button>
        </div>
        <div className="filter-settings-modal__divider" />
        <div className="filter-settings-modal__body">
          <p className="custom-tab__caption">Add fields as live filters — nothing is pre-selected.</p>
          {!selection.type ? (
            <p className="custom-tab__caption">Pick a Type first.</p>
          ) : treeError ? (
            <p className="custom-tab__caption">Couldn't load the real field tree — is the API server running?</p>
          ) : !tree ? (
            <p className="custom-tab__caption">Loading real field tree…</p>
          ) : (
            <CustomFilterTree
              nodes={nodes}
              activeFields={selection.activeFilterFields}
              onToggle={(name) => onChange(toggleCustomFilterField(selection, name))}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
