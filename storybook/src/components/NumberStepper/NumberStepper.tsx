import { useEffect, useState } from 'react';
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

/** A numeric increment/decrement field - not to be confused with a
 * multi-step wizard progress indicator, which is a separate, still-
 * undesigned component (see STORYBOOK_STRUCTURE.md's inventory).
 *
 * The value is a real editable input, not just a display span - typing a
 * number directly and using the +/- buttons are both real, equally valid
 * ways to set it (fixed 2026-08-04: the value used to be click-only). */
export function NumberStepper({ label, value, step = 1, onChange, formatValue = String, caption }: NumberStepperProps) {
  const [text, setText] = useState(formatValue(value));

  // Keep the displayed text in sync with an externally-changed value (e.g.
  // the +/- buttons, or a parent resetting it) without fighting the user
  // mid-keystroke - only resets when `value` itself actually changes.
  useEffect(() => {
    setText(formatValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() !== '' && !Number.isNaN(parsed)) {
      onChange(parsed);
    } else {
      setText(formatValue(value));
    }
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
          <button type="button" className="number-stepper__btn" onClick={() => onChange(value + step)} aria-label="Increment">
            <img src={chevronUp} alt="" />
          </button>
          <button type="button" className="number-stepper__btn" onClick={() => onChange(value - step)} aria-label="Decrement">
            <img src={chevronDown} alt="" />
          </button>
        </div>
      </div>
      {caption && <p className="number-stepper__caption">{caption}</p>}
    </div>
  );
}
