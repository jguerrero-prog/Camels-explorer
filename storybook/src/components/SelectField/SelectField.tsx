import { useEffect, useRef, useState } from 'react';
import chevron from './assets/chevron.svg';
import './SelectField.css';

export type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** Real field pattern (Figma node 975:869, "field-Set"): a short helper
   * line under the input, e.g. realization count for a chosen set. */
  caption?: string;
};

/** The real open-menu design this component was missing (see Spec) - not
 * sourced from Figma, since no frame has ever shown this state. Built to
 * unblock the Add Plot modal's Curated tab, which needs a real,
 * functioning picker. */
export function SelectField({ label, value, options, onChange, caption }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="select-field" ref={rootRef}>
      <p className="select-field__label">{label}</p>
      <button
        type="button"
        className="select-field__input"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="select-field__value">{value}</span>
        <img
          className="select-field__chevron"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
          src={chevron}
          alt=""
        />
      </button>
      {open && (
        <ul className="select-field__menu" role="listbox">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                className={`select-field__option ${option === value ? 'select-field__option--selected' : ''}`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span>{option}</span>
                {option === value && <span className="select-field__check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {caption && <p className="select-field__caption">{caption}</p>}
    </div>
  );
}
