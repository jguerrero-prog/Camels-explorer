import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import chevron from '../SelectField/assets/chevron.svg';
import './ChartModeDropdown.css';

export type ChartDisplayMode = 'static' | 'interactive' | 'table';

const MODE_LABEL: Record<ChartDisplayMode, string> = {
  static: 'Static',
  interactive: 'Interactive',
  table: 'Table',
};

export type ChartModeDropdownProps = {
  mode: ChartDisplayMode;
  /** Real, deliberate constraint (2026-08-06 - see PlotTile's own docs for
   * how this is computed): only ever the modes that are genuinely real for
   * this tile (e.g. 'static' only when a server-rendered PNG exists,
   * 'table' only when `halos` is non-null) - never a disabled option, since
   * every option here is always selectable. A single-option list means
   * `PlotTile` doesn't render this component at all (see its own docs),
   * matching the original toggle's "no toggle when nothing to switch to"
   * behavior. */
  options: ChartDisplayMode[];
  onChange: (mode: ChartDisplayMode) => void;
};

/** Real fix (2026-08-06, direct user feedback: "the static/interactive
 * toggle is becoming illegible at times... I think it's because it sits
 * inside the plot... place it to the top right of the plot instead" +
 * "perhaps the static/interactive toggle should be a small dropdown where
 * users could decide between static, interactive, or table"). Replaces
 * the old two-button segmented pill that floated on top of the chart
 * itself (`PlotChart`'s own `.plot-chart__toggle`, removed) - this renders
 * in `PlotTile`'s header row instead, next to the title, always on the
 * tile's own opaque background rather than over plotted content that can
 * visually collide with it. A small, closed-by-default dropdown rather
 * than a segmented toggle, since "Table" is a genuinely different kind of
 * view, not just a style variant of the same chart. */
export function ChartModeDropdown({ mode, options, onChange }: ChartModeDropdownProps) {
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
      if ((e.target as HTMLElement).closest?.('.chart-mode-dropdown__menu')) return;
      setOpen(false);
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
    <div className="chart-mode-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="chart-mode-dropdown__trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{MODE_LABEL[mode]}</span>
        <img className="chart-mode-dropdown__chevron" style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }} src={chevron} alt="" />
      </button>
      {open &&
        createPortal(
          <ul
            className="chart-mode-dropdown__menu"
            role="listbox"
            style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, minWidth: menuRect.width }}
          >
            {options.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option === mode}
                  className={`chart-mode-dropdown__option ${option === mode ? 'chart-mode-dropdown__option--selected' : ''}`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span>{MODE_LABEL[option]}</span>
                  {option === mode && <span className="chart-mode-dropdown__check">✓</span>}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
