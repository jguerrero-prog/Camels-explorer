import thumbIcon from './assets/thumb.svg';
import './Slider.css';

export type SliderProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** How the current value renders in the label row, e.g. String for a
   * plain number or a formatter for units. Defaults to String(value). */
  formatValue?: (value: number) => string;
  /** Defaults to 1 (every prior real usage - Bins, OptionSlider's index
   * ranges - is a whole-number range). Real gap fixed 2026-08-05: a
   * fractional real range (e.g. SFR History's Ωm slider, 0.1-0.5) needs a
   * fractional step - the browser's own default step of 1 would only ever
   * let the value sit at `min` for a range that narrow. */
  step?: number;
};

export function Slider({ label, min, max, value, onChange, formatValue = String, step = 1 }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider__label-row">
        <p className="slider__label">{label}</p>
        <p className="slider__value">{formatValue(value)}</p>
      </div>
      <div className="slider__track-wrap">
        <div className="slider__track" />
        <div className="slider__fill" style={{ width: `${percent}%` }} />
        <img className="slider__thumb" src={thumbIcon} alt="" style={{ left: `calc(${percent}% - 7px)` }} />
        <input
          className="slider__input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
}
