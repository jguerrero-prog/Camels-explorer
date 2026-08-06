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
  /** Opt-in only - every existing caller omits this and is 100% unchanged.
   * When true, renders a "Search..." text input pinned to the top of the
   * open menu (matches FlatHUB's own real search-above-list pattern) that
   * case-insensitive substring-filters `options` as the user types. Meant
   * for callers with large option counts where a flat scroll is unusable
   * (e.g. CustomFieldsForm's X/Y/Color field pickers, ~177 options) - NOT
   * for the small pickers elsewhere (Suite/Set/statistic pickers), where a
   * search box would just be visual noise for a 3-5 item list. */
  searchable?: boolean;
  /** Options present in the list but not selectable - rendered dimmed with
   * a "Coming soon" suffix, never fires `onChange`. Opt-in (existing
   * callers omit this and are unaffected) - built for small, fixed-option
   * pickers like CustomFieldsForm's Chart type, where some real FlatHUB
   * chart types are visibly present but not yet implemented (see
   * CHART_TYPES' own "no silent scope cut" docs) rather than a large
   * filterable list. */
  disabledOptions?: string[];
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
