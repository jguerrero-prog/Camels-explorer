import { useEffect, useRef, useState } from 'react';
import thumbIcon from '../Slider/assets/thumb.svg';
import './RangeFilterControl.css';

export type RangeFilterValue = { min: number; max: number };

export type RangeFilterControlProps = {
  label: string;
  /** Real bound of the underlying field (e.g. `stats.min`/`stats.max`) -
   * never fabricated; callers must gate on a real, non-degenerate range
   * before rendering this (see CustomFilterValues' own "No live range
   * available" guard, which stays there rather than being duplicated
   * here). */
  min: number;
  max: number;
  value: RangeFilterValue;
  onChange: (value: RangeFilterValue) => void;
  /** Defaults to a threshold-based formatter (exponential outside
   * [1e-3, 1e5], fixed(3) otherwise) - CAMELS fields span from `params_*`
   * (roughly 0-1) to `Group_M_Crit200` (~1e10-1e15), and `toFixed(3)` on
   * the latter overflows a narrow sidebar input. */
  formatValue?: (value: number) => string;
  /** Defaults to 500 steps across the real min/max range, same generic
   * sizing CustomFilterValues' old two-Slider rendering used. */
  step?: number;
};

// Same real bug/fix as Slider.tsx (see its own comment): a dragged
// <input type="range"> fires `onChange` per pixel, and every real caller
// here wires onChange to a live tile refetch (CustomSidebar ->
// App.tsx's refetchCustomTile) - keep the identical debounce-then-commit
// shape so this doesn't regress that fix. One shared timer for the whole
// {min, max} pair (not one per thumb) so a quick drag-min-then-drag-max
// can't let a stale min timer clobber an in-flight max edit.
const COMMIT_DEBOUNCE_MS = 300;

function defaultFormatValue(v: number): string {
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return v.toExponential(2);
  return v.toFixed(3);
}

/** FlatHUB's own real filter-component shape (user-specified, based on
 * flathub.flatironinstitute.org's live filter UI): one container holding
 * two typeable number inputs (min/max, exact-value entry) and one real
 * dual-handle range slider (a shared track, fill between the two thumbs
 * showing the selected sub-range) - not the two independently-draggable
 * full-width single-value sliders this replaced.
 *
 * Built as two overlapping native <input type="range"> elements (the
 * well-known accessible dual-range pattern) rather than a fully custom
 * pointer-tracking implementation - gets native keyboard/touch support for
 * free. Both inputs span the FULL [min, max] domain (never clamped to each
 * other's current value) so each native thumb's geometric position always
 * matches its custom-drawn <img> counterpart; non-crossing is enforced in
 * the change handlers instead (Math.min/Math.max against the other
 * thumb's current value). Pointer routing: the inputs themselves are
 * `pointer-events: none` (so they never blanket-swallow drags) and only
 * their thumb pseudo-elements re-enable `pointer-events: auto` - see
 * RangeFilterControl.css. Whichever thumb sits in the domain's upper half
 * is raised (z-index) so the two stay independently grabbable even when
 * adjacent/overlapping near the middle. */
export function RangeFilterControl({ label, min, max, value, onChange, formatValue = defaultFormatValue, step }: RangeFilterControlProps) {
  const [draft, setDraft] = useState(value);
  const [minText, setMinText] = useState(formatValue(value.min));
  const [maxText, setMaxText] = useState(formatValue(value.max));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reflect external value changes (e.g. switching tiles) - keyed on the
  // primitive min/max, not the `value` object identity, since a parent
  // re-render hands down a fresh {min,max} object every time even when
  // nothing real changed, which would otherwise fight an in-progress drag.
  useEffect(() => {
    setDraft(value);
    setMinText(formatValue(value.min));
    setMaxText(formatValue(value.max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.min, value.max]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const scheduleCommit = (next: RangeFilterValue) => {
    setDraft(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onChange(next);
    }, COMMIT_DEBOUNCE_MS);
  };

  // Firing immediately on release (mouse/touch) keeps a deliberate drag
  // feeling as responsive as before the debounce; keyboard/arrow-key
  // adjustments still commit via the trailing timeout since there's no
  // pointerup for those.
  const commitNow = () => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    onChange(draft);
  };

  const commitImmediate = (next: RangeFilterValue) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // A number input commits on every blur, including a click-in/click-out
    // with no real edit (and Escape, which reverts the text but still
    // blurs) - skip the refetch when nothing actually changed, same
    // "don't fire a network request for nothing" discipline the 300ms
    // drag debounce exists for.
    if (next.min === draft.min && next.max === draft.max) return;
    setDraft(next);
    onChange(next);
  };

  const rangeStep = step ?? (max - min) / 500;

  const handleMinRange = (v: number) => {
    const next = { min: Math.min(v, draft.max), max: draft.max };
    scheduleCommit(next);
    setMinText(formatValue(next.min));
  };
  const handleMaxRange = (v: number) => {
    const next = { min: draft.min, max: Math.max(v, draft.min) };
    scheduleCommit(next);
    setMaxText(formatValue(next.max));
  };

  // Number inputs commit immediately on blur/Enter (not through the drag
  // debounce - typing a value is a single deliberate action, not a stream
  // of ticks) and clamp out-of-bounds typed values to the field's real
  // min/max rather than silently accepting them.
  const commitMinText = () => {
    const parsed = Number(minText);
    if (minText.trim() === '' || Number.isNaN(parsed)) {
      setMinText(formatValue(draft.min));
      return;
    }
    const clamped = Math.min(Math.max(parsed, min), draft.max);
    setMinText(formatValue(clamped));
    commitImmediate({ min: clamped, max: draft.max });
  };
  const commitMaxText = () => {
    const parsed = Number(maxText);
    if (maxText.trim() === '' || Number.isNaN(parsed)) {
      setMaxText(formatValue(draft.max));
      return;
    }
    const clamped = Math.max(Math.min(parsed, max), draft.min);
    setMaxText(formatValue(clamped));
    commitImmediate({ min: draft.min, max: clamped });
  };

  const minPercent = ((draft.min - min) / (max - min)) * 100;
  const maxPercent = ((draft.max - min) / (max - min)) * 100;
  const minOnTop = draft.min - min > max - draft.max;
  // The native range input's own thumb is laid out inset by its own width
  // (center = percent * (trackWidth - thumbWidth) + thumbWidth/2), not at
  // a flat `percent%` - a plain `calc(percent% - 7px)` (this control's
  // 14px thumb, half-width 7px) drifts up to 7px off the real, only
  // clickable/draggable target at the two ends of the track. Matching
  // that inset here keeps the visible <img> thumb directly on top of the
  // real hit target across the whole range, not just at the midpoint.
  const thumbOffset = (percent: number) => `calc(${percent}% - ${(percent / 100) * 14}px)`;

  return (
    <div className="range-filter">
      <p className="range-filter__label">{label}</p>
      <div className="range-filter__inputs">
        <input
          className="range-filter__number"
          type="number"
          inputMode="decimal"
          step="any"
          value={minText}
          onChange={(e) => setMinText(e.target.value)}
          onBlur={commitMinText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setMinText(formatValue(draft.min));
          }}
          aria-label={`${label} minimum`}
        />
        <span className="range-filter__dash">–</span>
        <input
          className="range-filter__number"
          type="number"
          inputMode="decimal"
          step="any"
          value={maxText}
          onChange={(e) => setMaxText(e.target.value)}
          onBlur={commitMaxText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setMaxText(formatValue(draft.max));
          }}
          aria-label={`${label} maximum`}
        />
      </div>
      <div className="range-filter__track-wrap">
        <div className="range-filter__track" />
        <div className="range-filter__fill" style={{ left: `${minPercent}%`, width: `${Math.max(maxPercent - minPercent, 0)}%` }} />
        <img
          className="range-filter__thumb"
          src={thumbIcon}
          alt=""
          style={{ left: thumbOffset(minPercent), zIndex: minOnTop ? 3 : 2 }}
        />
        <img
          className="range-filter__thumb"
          src={thumbIcon}
          alt=""
          style={{ left: thumbOffset(maxPercent), zIndex: minOnTop ? 2 : 3 }}
        />
        <input
          className="range-filter__input"
          type="range"
          min={min}
          max={max}
          step={rangeStep}
          value={draft.min}
          onChange={(e) => handleMinRange(Number(e.target.value))}
          onPointerUp={commitNow}
          style={{ zIndex: minOnTop ? 5 : 4 }}
          aria-label={`${label} minimum handle`}
        />
        <input
          className="range-filter__input"
          type="range"
          min={min}
          max={max}
          step={rangeStep}
          value={draft.max}
          onChange={(e) => handleMaxRange(Number(e.target.value))}
          onPointerUp={commitNow}
          style={{ zIndex: minOnTop ? 4 : 5 }}
          aria-label={`${label} maximum handle`}
        />
      </div>
    </div>
  );
}
