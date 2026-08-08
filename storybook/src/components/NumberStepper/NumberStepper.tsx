import { useEffect, useRef, useState } from 'react';
import chevronUp from './assets/chevron-up.svg';
import chevronDown from './assets/chevron-down.svg';
import './NumberStepper.css';

export type NumberStepperProps = {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
  /** e.g. `(v) => v.toFixed(1)` to match the real "10.0" display. Defaults
   * to String(value). */
  formatValue?: (value: number) => string;
  /** Real field pattern (e.g. Realization's "0–999"): a short helper line
   * under the input. */
  caption?: string;
};

// Real bug fixed (direct QA report): the +/- buttons used to call onChange
// synchronously on every click, and every real caller wires onChange
// straight to a backend refetch - clicking 5 times in a row (e.g. 4->9)
// fired 5 separate loads instead of one, confirmed via repeated 404s in
// the console for each intermediate value. Same bug class Slider.tsx
// already fixed for range sliders (its own COMMIT_DEBOUNCE_MS comment) -
// same fix here: wait for a pause in clicking before actually committing.
const COMMIT_DEBOUNCE_MS = 300;

/** A numeric increment/decrement field - not to be confused with a
 * multi-step wizard progress indicator, which is a separate, still-
 * undesigned component (see STORYBOOK_STRUCTURE.md's inventory).
 *
 * The value is a real editable input, not just a display span - typing a
 * number directly and using the +/- buttons are both real, equally valid
 * ways to set it (fixed 2026-08-04: the value used to be click-only). */
export function NumberStepper({ label, value, step = 1, onChange, formatValue = String, caption }: NumberStepperProps) {
  const [text, setText] = useState(formatValue(value));
  // The +/- buttons' own "current" number, decoupled from the (debounced,
  // not-yet-committed) `value` prop - mirrors Slider's `dragValue`, so 5
  // rapid clicks advance 4->5->6->7->8->9 instead of all computing
  // `value + step` off the same stale prop.
  const pendingRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the displayed text (and the buttons' own pending value) in sync
  // with an externally-changed value (e.g. a parent resetting it, or the
  // debounced onChange below finally landing) without fighting the user
  // mid-keystroke - only resets when `value` itself actually changes.
  useEffect(() => {
    setText(formatValue(value));
    pendingRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const commit = () => {
    // A typed-and-blurred commit is immediate and supersedes any still-
    // pending button-click debounce below - without this, that stale
    // timeout could still fire afterwards and silently overwrite what the
    // user just typed.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const parsed = Number(text);
    if (text.trim() !== '' && !Number.isNaN(parsed)) {
      onChange(parsed);
    } else {
      setText(formatValue(value));
    }
  };

  const bump = (next: number) => {
    pendingRef.current = next;
    setText(formatValue(next));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onChange(next);
    }, COMMIT_DEBOUNCE_MS);
  };

  return (
    <div className="number-stepper">
      <p className="number-stepper__label">{label}</p>
      <div className="number-stepper__input-row">
        <input
          className="number-stepper__value"
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setText(formatValue(value));
          }}
        />
        <div className="number-stepper__buttons">
          <button type="button" className="number-stepper__btn" onClick={() => bump(pendingRef.current + step)} aria-label="Increment">
            <img src={chevronUp} alt="" />
          </button>
          <button type="button" className="number-stepper__btn" onClick={() => bump(pendingRef.current - step)} aria-label="Decrement">
            <img src={chevronDown} alt="" />
          </button>
        </div>
      </div>
      {caption && <p className="number-stepper__caption">{caption}</p>}
    </div>
  );
}
