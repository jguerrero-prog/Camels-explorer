import { useEffect, useRef, useState } from 'react';
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

// Real bug fixed 2026-08-05: a dragged <input type="range"> fires `onChange`
// on every tick (every pixel), and every real caller of this component wires
// `onChange` straight to a backend refetch (App.tsx's refetchXXXTile
// functions) - for params like Snapshot that re-render a PNG, this fired a
// full network round-trip per tick, causing exactly the reported "range
// slider causes crazy friction, repeated slow renders" symptom. Fixing this
// once here (rather than in every one of ~13 call sites) means every future
// slider is correct by default.
const COMMIT_DEBOUNCE_MS = 300;

export function Slider({ label, min, max, value, onChange, formatValue = String, step = 1 }: SliderProps) {
  const [dragValue, setDragValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The thumb must reflect external value changes (e.g. switching to a
  // different tile/statistic) even though dragValue otherwise tracks the
  // user's own in-progress drag independently of the (debounced) `value` prop.
  useEffect(() => {
    setDragValue(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleChange = (next: number) => {
    setDragValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onChange(next);
    }, COMMIT_DEBOUNCE_MS);
  };

  // Firing immediately on release (mouse/touch) makes a deliberate drag feel
  // as responsive as before the debounce; keyboard/arrow-key adjustments
  // still commit via the trailing timeout above since there's no pointerup.
  const commitNow = () => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    onChange(dragValue);
  };

  const percent = ((dragValue - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider__label-row">
        <p className="slider__label">{label}</p>
        <p className="slider__value">{formatValue(dragValue)}</p>
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
          value={dragValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          onPointerUp={commitNow}
          aria-label={label}
        />
      </div>
    </div>
  );
}
