import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import chevron from '../SelectField/assets/chevron.svg';
import './MultiSelect.css';

export type MultiSelectProps = {
  label: string;
  values: string[];
  onRemove: (value: string) => void;
  onAdd: (value: string) => void;
  placeholder?: string;
  /** Real field pattern (see SelectField/NumberStepper): a short helper
   * line under the box, e.g. a total available count. */
  caption?: string;
  /** When provided, a chevron affordance opens a dropdown of these values
   * (already-added ones excluded) as an alternative to typing - real usage:
   * the full list of valid realizations for the selected set. */
  options?: string[];
};

/** Chip-based multi-value field. Real source: Figma node `1019:37`
 * ("field-Realizations to compare"). The dropdown affordance (portal-based,
 * same technique as SelectField) was added 2026-08-04 on direct user
 * feedback - free-typing alone left "which values are actually valid"
 * undiscoverable. */
export function MultiSelect({ label, values, onRemove, onAdd, placeholder = 'Add…', caption, options }: MultiSelectProps) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed) {
      onAdd(trimmed);
      setDraft('');
    }
  }

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current!.getBoundingClientRect();
    setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) });

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((e.target as HTMLElement).closest?.('.multi-select__menu')) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Real bug fixed 2026-08-04: a capture-phase window listener receives
    // scroll events from the menu's OWN internal list too (its max-height
    // makes it independently scrollable) - without this guard, scrolling
    // the open menu closed it immediately, making a long options list
    // (e.g. 1,000 realizations) effectively unscrollable past the first
    // handful of entries.
    const onScroll = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('.multi-select__menu')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const availableOptions = options?.filter((o) => !values.includes(o));

  return (
    <div className="multi-select" ref={rootRef}>
      <p className="multi-select__label">{label}</p>
      <div className="multi-select__box">
        {values.map((value) => (
          <button type="button" className="multi-select__chip" key={value} onClick={() => onRemove(value)}>
            <span className="multi-select__chip-value">{value}</span>
            <span className="multi-select__chip-remove">×</span>
          </button>
        ))}
        <input
          className="multi-select__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
          }}
          placeholder={placeholder}
        />
        {options && (
          <button
            ref={triggerRef}
            type="button"
            className="multi-select__trigger"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`${label} options`}
          >
            <img
              className="multi-select__chevron"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
              src={chevron}
              alt=""
            />
          </button>
        )}
      </div>
      {open &&
        availableOptions &&
        createPortal(
          <ul
            className="multi-select__menu"
            role="listbox"
            style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width }}
          >
            {availableOptions.length === 0 ? (
              <li className="multi-select__menu-empty">All values added</li>
            ) : (
              availableOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    className="multi-select__option"
                    onClick={() => {
                      onAdd(option);
                      setOpen(false);
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
      {caption && <p className="multi-select__caption">{caption}</p>}
    </div>
  );
}
