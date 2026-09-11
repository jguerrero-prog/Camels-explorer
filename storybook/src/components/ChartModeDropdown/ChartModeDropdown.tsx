import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import chevron from '../SelectField/assets/chevron.svg';
import './ChartModeDropdown.css';

export type ChartDisplayMode = 'static' | 'interactive' | 'scatter3d' | 'table';

const MODE_LABEL: Record<ChartDisplayMode, string> = {
  static: 'Static',
  interactive: 'Interactive',
  scatter3d: '3D Scatter',
  table: 'Table',
};

export type ChartModeDropdownProps = {
  mode: ChartDisplayMode;
  /** Only the modes available for this tile: `static` when a server-rendered
   * PNG exists, `table` when halo rows exist, and so on. Every option listed
   * is selectable, so this list never contains a disabled entry. `PlotTile`
   * computes it, and renders no dropdown at all when only one mode applies. */
  options: ChartDisplayMode[];
  onChange: (mode: ChartDisplayMode) => void;
};

/** Chooses how a tile draws its data: static image, interactive chart, 3D
 * scatter, or table. Renders in `PlotTile`'s header row, on the tile's own
 * opaque background rather than over the plot, and stays closed until
 * opened. Table is a different kind of view rather than a style variant of
 * the same chart, which is why this is a dropdown and not a toggle. */
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
