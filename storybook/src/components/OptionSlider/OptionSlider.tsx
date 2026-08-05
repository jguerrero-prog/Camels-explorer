import { Slider } from '../Slider/Slider';

export type OptionSliderProps<T> = {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  /** Defaults to String(option) - override for a richer label, e.g.
   * Bispectrum's "±0.5 (equilateral)" annotation on one specific value. */
  formatValue?: (value: T) => string;
};

/** A thin `Slider` wrapper over a fixed, ordered array of option values
 * (not a continuous numeric range) - matches `app.py`'s own real
 * `st.select_slider(...)` control, used for Power Spectrum's "Grid size"
 * (128/256/512/1024) and Bispectrum's "Triangle shape" (10 real mu
 * values). Streamlit deliberately chose a slider affordance over a
 * dropdown for these - the options are ordered and the *position* along
 * that order carries meaning (bigger grid = finer; mu moves from squeezed
 * to stretched triangles) - so this stays a slider rather than becoming
 * another `SelectField` dropdown. Internally just a `Slider` over the
 * option array's index. */
export function OptionSlider<T>({ label, options, value, onChange, formatValue }: OptionSliderProps<T>) {
  const index = Math.max(0, options.indexOf(value));
  const format = formatValue ?? ((v: T) => String(v));
  return (
    <Slider
      label={label}
      min={0}
      max={options.length - 1}
      value={index}
      onChange={(i) => onChange(options[i])}
      formatValue={(i) => format(options[i])}
    />
  );
}
