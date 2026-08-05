import './Radio.css';

export type RadioProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** Real field pattern (matches SelectField's own caption) - a short
   * helper line under the control. */
  caption?: string;
};

/** A new primitive - no Figma frame shows a radio control in this app's own
 * design system yet, but `app.py` uses `st.radio(..., horizontal=True)` for
 * several real, mutually-exclusive 2-3 option choices (Power Spectrum's "k
 * range" and "Multipole", Color-Mass Diagram's "Spectra") that a
 * `SelectField` dropdown would be overkill for - all the options are
 * visible and directly comparable at a glance, which is exactly what a
 * segmented control is for. Built to match this app's own existing
 * segmented-toggle visual language (`Toolbar`'s grid/stacked view-mode
 * switch, `--color-surface-toggle`/`--color-surface-toggle-active`) rather
 * than inventing a new visual treatment for the same interaction shape. */
export function Radio({ label, value, options, onChange, caption }: RadioProps) {
  return (
    <div className="radio">
      <p className="radio__label">{label}</p>
      <div className="radio__group" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            className={`radio__option ${option === value ? 'radio__option--active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {caption && <p className="radio__caption">{caption}</p>}
    </div>
  );
}
