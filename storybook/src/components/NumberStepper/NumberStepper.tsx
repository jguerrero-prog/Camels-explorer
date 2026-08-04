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
};

/** A numeric increment/decrement field - not to be confused with a
 * multi-step wizard progress indicator, which is a separate, still-
 * undesigned component (see STORYBOOK_STRUCTURE.md's inventory). */
export function NumberStepper({ label, value, step = 1, onChange, formatValue = String }: NumberStepperProps) {
  return (
    <div className="number-stepper">
      <p className="number-stepper__label">{label}</p>
      <div className="number-stepper__input-row">
        <span className="number-stepper__value">{formatValue(value)}</span>
        <div className="number-stepper__buttons">
          <button type="button" className="number-stepper__btn" onClick={() => onChange(value + step)} aria-label="Increment">
            <img src={chevronUp} alt="" />
          </button>
          <button type="button" className="number-stepper__btn" onClick={() => onChange(value - step)} aria-label="Decrement">
            <img src={chevronDown} alt="" />
          </button>
        </div>
      </div>
    </div>
  );
}
