import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import chevron from './assets/chevron.svg';
import './SelectField.css';

export type SelectFieldProps = {
  /** Field label, sentence case, units in square brackets if it has any. */
  label: string;
  /** The currently selected option. Must be one of `options`. */
  value: string;
  /** The full option list, in the order it should be shown. */
  options: string[];
  /** Called with the chosen option. Never fires for a disabled option. */
  onChange: (value: string) => void;
  /** A short helper line under the input, for example a realization count. */
  caption?: string;
  /**
   * Pins a search input to the top of the open menu that substring-filters
   * `options`. Use for pickers with more than about twenty options, such as the
   * catalog field pickers. Omit for short lists, where it is noise.
   */
  searchable?: boolean;
  /**
   * Options shown but not selectable, rendered dimmed with a "Coming soon"
   * suffix. Use to keep a known option visible rather than dropping it from the
   * list silently.
   */
  disabledOptions?: string[];
};

/**
 * Label plus a trigger that opens an option menu. The menu renders in a
 * `document.body` portal so a scrollable ancestor can never clip it.
 */
export function SelectField({ label, value, options, onChange, caption, searchable, disabledOptions }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0 });
  const [query, setQuery] = useState('');
  const [canScrollMore, setCanScrollMore] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visibleOptions =
    searchable && query.trim() ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase())) : options;

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current!.getBoundingClientRect();
    setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setQuery('');
    if (searchable) {
      // Portal content commits synchronously with this effect (same
      // render), so the input already exists in the DOM by the time this
      // runs - no extra rAF/timeout needed.
      searchInputRef.current?.focus();
    }

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
    // Real bug fixed 2026-08-04: a capture-phase window listener receives
    // scroll events from the menu's OWN internal list too (its max-height
    // makes it independently scrollable) - without this guard, scrolling
    // the open menu closed it immediately, making a long options list
    // effectively unscrollable.
    const onScroll = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('.select-field__menu')) return;
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

  // Drives the bottom "more content below" fade - only shown while the
  // list is actually scrolled short of its end, so it never appears on a
  // short (non-scrolling) options list and disappears once the user
  // scrolls to the bottom. Re-checked whenever the visible option count
  // changes (typing a search query can flip a list from scrollable to
  // fully-visible or back).
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const updateScrollState = () => {
      setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    };
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [open, visibleOptions.length]);

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
          <div
            className="select-field__menu"
            style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width }}
          >
            {searchable && (
              <div className="select-field__search-wrap">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="select-field__search"
                  placeholder="Search…"
                  aria-label={`Search ${label} options`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            )}
            <ul className="select-field__options" role="listbox" ref={listRef}>
              {visibleOptions.length === 0 ? (
                <li className="select-field__empty">No matching fields</li>
              ) : (
                visibleOptions.map((option) => {
                  const disabled = disabledOptions?.includes(option) ?? false;
                  return (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={option === value}
                        aria-disabled={disabled}
                        disabled={disabled}
                        className={`select-field__option ${option === value ? 'select-field__option--selected' : ''} ${disabled ? 'select-field__option--disabled' : ''}`}
                        onClick={() => {
                          if (disabled) return;
                          onChange(option);
                          setOpen(false);
                        }}
                      >
                        <span className="select-field__option-label">{option}</span>
                        {disabled ? (
                          <span className="select-field__option-suffix">Coming soon</span>
                        ) : (
                          option === value && <span className="select-field__check">✓</span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {canScrollMore && <div className="select-field__menu-fade" aria-hidden="true" />}
          </div>,
          document.body,
        )}
      {caption && <p className="select-field__caption">{caption}</p>}
    </div>
  );
}
