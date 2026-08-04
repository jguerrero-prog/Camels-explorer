import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 * functioning picker.
 *
 * The menu renders in a portal (document.body), positioned via
 * getBoundingClientRect rather than nested `position: absolute` - a real
 * bug caught inside AddPlotModal: nested absolute positioning gets clipped
 * by the modal's own scrollable fields area, so the last field's menu was
 * invisible until the user scrolled the whole modal. */
export function SelectField({ label, value, options, onChange, caption }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current!.getBoundingClientRect();
    setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((e.target as HTMLElement).closest?.('.select-field__menu')) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Closes on scroll rather than tracking/repositioning continuously -
    // simpler, and avoids the menu visually detaching from its trigger if
    // an ancestor (e.g. the modal's own scrollable fields area) scrolls.
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <div className="select-field" ref={rootRef}>
      <p className="select-field__label">{label}</p>
      <button
        ref={triggerRef}
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
      {open &&
        createPortal(
          <ul
            className="select-field__menu"
            role="listbox"
            style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width }}
          >
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
          </ul>,
          document.body,
        )}
      {caption && <p className="select-field__caption">{caption}</p>}
    </div>
  );
}
