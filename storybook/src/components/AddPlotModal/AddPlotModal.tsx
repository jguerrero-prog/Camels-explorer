import { useState } from 'react';
import { CuratedTab } from './CuratedTab';
import type { CuratedSelection } from './CuratedTab';
import { CustomTab } from './CustomTab';
import './AddPlotModal.css';

export type AddPlotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Only reachable from the Curated tab - Custom is a placeholder with no
   * real submit path yet (see CustomTab). */
  onSubmit: (selection: CuratedSelection) => void;
  /** Which tab shows first - defaults to Curated, matching the real
   * Figma default. Mainly for Storybook/docs to show the Custom tab
   * without requiring a click. */
  initialTab?: 'curated' | 'custom';
};

const EMPTY_SELECTION: CuratedSelection = { suite: '', set: '', realization: 0, statistic: '' };

export function AddPlotModal({ isOpen, onClose, onSubmit, initialTab = 'curated' }: AddPlotModalProps) {
  const [tab, setTab] = useState<'curated' | 'custom'>(initialTab);
  const [selection, setSelection] = useState<CuratedSelection>(EMPTY_SELECTION);

  if (!isOpen) return null;

  const canSubmit = tab === 'curated' && selection.suite && selection.set && selection.statistic;

  return (
    <div className="add-plot-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="add-plot-modal" role="dialog" aria-modal="true" aria-label="Add a plot or simulation">
        <div className="add-plot-modal__header">
          <p className="add-plot-modal__title">Add a plot or simulation</p>
          <button type="button" className="add-plot-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="add-plot-modal__divider" />
        <div className="add-plot-modal__tab-row">
          <button
            type="button"
            className={`add-plot-modal__tab ${tab === 'curated' ? 'add-plot-modal__tab--active' : ''}`}
            onClick={() => setTab('curated')}
          >
            <span>Curated</span>
            <span className="add-plot-modal__tab-underline" />
          </button>
          <button
            type="button"
            className={`add-plot-modal__tab ${tab === 'custom' ? 'add-plot-modal__tab--active' : ''}`}
            onClick={() => setTab('custom')}
          >
            <span>Custom</span>
            <span className="add-plot-modal__tab-underline" />
          </button>
        </div>
        <div className="add-plot-modal__fields">
          {tab === 'curated' ? (
            <CuratedTab selection={selection} onChange={setSelection} />
          ) : (
            <CustomTab />
          )}
        </div>
        <div className="add-plot-modal__footer-divider" />
        <div className="add-plot-modal__footer">
          <button type="button" className="add-plot-modal__btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="add-plot-modal__btn-confirm"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(selection)}
          >
            Add Plot
          </button>
        </div>
      </div>
    </div>
  );
}
