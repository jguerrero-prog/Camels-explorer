import { useEffect } from 'react';
import { Radio } from '../Radio/Radio';
import { Checkbox } from '../Checkbox/Checkbox';
import './HidePopover.css';

export type HideScope = 'panel' | 'all';
export type HideCategory = 'annotations' | 'arrows' | 'notes' | 'readouts';

export type HideValues = Record<HideCategory, boolean>;

const CATEGORY_LABELS: Record<HideCategory, string> = {
  annotations: 'Annotations',
  arrows: 'Arrows',
  notes: 'Notes',
  readouts: 'Param readouts',
};

export type HidePopoverProps = {
  scope: HideScope;
  onScopeChange: (scope: HideScope) => void;
  /** Checkbox state for the *currently selected* scope - App.tsx swaps
   * this out when `scope` changes (all-panels values vs. this-panel's own
   * values), rather than this component knowing about two separate
   * state shapes. */
  values: HideValues;
  onToggle: (category: HideCategory, value: boolean) => void;
  /** True when scope is "This panel" but no tile is focused - there's
   * nothing for "this panel" to mean yet. Matches CopyAsCodePopover's own
   * "click a tile first" honesty rather than silently no-op-ing a click. */
  panelDisabled?: boolean;
  onClose: () => void;
};

/** Real (added 2026-08-06, direct user feedback: "I want us to create a
 * hide feature on the toolbar. This hide feature gives users the ability
 * to hide annotations, arrows, notes, or the paramreadouts... could apply
 * across the whole canvas, or per panel"). Same popover shell language as
 * CopyAsCodePopover (pointer + header + close button), anchored by
 * Toolbar the same way.
 *
 * **Real, deliberate model - hiding is a snapshot action, not a live
 * filter** (decided 2026-08-06, see UI_REFINEMENTS_EPIC.md ticket #3):
 * checking "Annotations" stamps `hidden: true` on every annotation that
 * exists *right now* in the selected scope (App.tsx's `handleHideToggle`)
 * - a fresh annotation added afterward stays visible until the box is
 * unchecked-then-rechecked. Param readouts are the one exception (no
 * per-item array to stamp - a tile just has no "creation moment" distinct
 * from its own readout), so that checkbox is a genuinely live gate instead
 * - see PlotTile's `readoutsHidden` prop. The checkbox UI here can't tell
 * the difference between the two models and doesn't need to; both read
 * from `values`/`onToggle` identically. */
export function HidePopover({ scope, onScopeChange, values, onToggle, panelDisabled, onClose }: HidePopoverProps) {
  const disabled = scope === 'panel' && panelDisabled;

  // Real fix (2026-08-06, code-quality audit): every other popover/dropdown
  // in the app (SelectField, ChartModeDropdown, FieldMapGroupControl)
  // closes on Escape - this one didn't, a real inconsistency, not a
  // deliberate omission.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="hide-popover" role="dialog" aria-label="Hide">
      <div className="hide-popover__pointer" aria-hidden="true" />
      <div className="hide-popover__header">
        <p className="hide-popover__title">Hide</p>
        <button type="button" className="hide-popover__close-btn" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>
      <Radio label="Apply to" value={scope === 'panel' ? 'This panel' : 'All panels'} options={['This panel', 'All panels']} onChange={(v) => onScopeChange(v === 'This panel' ? 'panel' : 'all')} />
      {disabled && <p className="hide-popover__caption">Click a tile first - "This panel" needs a focused tile.</p>}
      <div className="hide-popover__checkboxes">
        {(Object.keys(CATEGORY_LABELS) as HideCategory[]).map((category) => (
          <Checkbox
            key={category}
            label={CATEGORY_LABELS[category]}
            checked={values[category]}
            disabled={disabled}
            onChange={(checked) => onToggle(category, checked)}
          />
        ))}
      </div>
    </div>
  );
}
