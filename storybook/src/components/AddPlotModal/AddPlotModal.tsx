import { useEffect, useRef, useState } from 'react';
import { CuratedTab } from './CuratedTab';
import type { CuratedSelection } from './CuratedTab';
import { CustomTab } from './CustomTab';
import { EMPTY_CUSTOM_SELECTION, isCustomSelectionComplete } from './CustomFieldsForm';
import type { CustomSelection } from './CustomFieldsForm';
import './AddPlotModal.css';

export type AddPlotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Fires only when confirming from the Curated tab. */
  onSubmitCurated: (selection: CuratedSelection) => void;
  /** Fires only when confirming from the Custom tab (real, wired
   * 2026-08-05 - see CustomTab). Two separate callbacks rather than one
   * discriminated-union callback: App.tsx's dispatch already branches on
   * `selection.statistic`/tile `kind` per statistic, so a caller needing
   * to re-discriminate a union here would just be undoing this split. */
  onSubmitCustom: (selection: CustomSelection) => void;
  /** Which tab shows first - defaults to Curated, matching the real
   * Figma default. Mainly for Storybook/docs to show the Custom tab
   * without requiring a click. */
  initialTab?: 'curated' | 'custom';
};

const EMPTY_SELECTION: CuratedSelection = { suite: '', set: '', realization: 0, statistic: '' };

export function AddPlotModal({ isOpen, onClose, onSubmitCurated, onSubmitCustom, initialTab = 'curated' }: AddPlotModalProps) {
  const [tab, setTab] = useState<'curated' | 'custom'>(initialTab);
  const [selection, setSelection] = useState<CuratedSelection>(EMPTY_SELECTION);
  const [customSelection, setCustomSelection] = useState<CustomSelection>(EMPTY_CUSTOM_SELECTION);
  const fieldsRef = useRef<HTMLDivElement>(null);
  // Drives the bottom "more content below" fade on the fields area - real
  // fix (2026-08-05) for the modal growing much taller on Custom than
  // Curated: `.add-plot-modal__fields` now has a FIXED height (matching
  // Curated's own natural rendered height, see AddPlotModal.css), so both
  // tabs keep the same overall modal footprint and Custom's longer content
  // scrolls within it instead. A MutationObserver (not just a resize/
  // scroll listener) is needed here, unlike SelectField's own version of
  // this pattern - this container's height is fixed, so its own box never
  // resizes when content grows/shrinks (a tree group expanding, filters
  // being added), only `scrollHeight` does.
  const [canScrollMore, setCanScrollMore] = useState(false);

  useEffect(() => {
    const el = fieldsRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const update = () => setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    update();
    el.addEventListener('scroll', update);
    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [tab]);

  if (!isOpen) return null;

  const canSubmit =
    tab === 'curated'
      ? Boolean(selection.suite && selection.set && selection.statistic)
      : isCustomSelectionComplete(customSelection);

  // Real (2026-08-06 heuristic pass): the confirm button gave zero
  // indication of WHY it was disabled - a one-line, always-muted hint
  // rather than a loud inline validation error, matching this modal's own
  // existing caption tone ("Pick a Type first.").
  const missingFieldHint = canSubmit
    ? null
    : tab === 'curated'
      ? 'Pick a Suite, Set, and Statistic to continue.'
      : 'Pick a Type and the required fields for this chart type to continue.';

  return (
    <div className="add-plot-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="add-plot-modal" role="dialog" aria-modal="true" aria-label="Add a plot or simulation">
        <div className="add-plot-modal__header">
          <p className="add-plot-modal__title">Add a plot or simulation</p>
          <button type="button" className="add-plot-modal__close" onClick={onClose} aria-label="Close" title="Close">
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
        <div className="add-plot-modal__fields-wrap">
          <div className="add-plot-modal__fields" ref={fieldsRef}>
            {tab === 'curated' ? (
              <CuratedTab selection={selection} onChange={setSelection} />
            ) : (
              <CustomTab selection={customSelection} onChange={setCustomSelection} />
            )}
          </div>
          {canScrollMore && <div className="add-plot-modal__fields-fade" aria-hidden="true" />}
        </div>
        <div className="add-plot-modal__footer-divider" />
        <div className="add-plot-modal__footer">
          {missingFieldHint && <p className="add-plot-modal__footer-hint">{missingFieldHint}</p>}
          <button type="button" className="add-plot-modal__btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="add-plot-modal__btn-confirm"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              if (tab === 'curated') onSubmitCurated(selection);
              else onSubmitCustom(customSelection);
            }}
          >
            Add Plot
          </button>
        </div>
      </div>
    </div>
  );
}
