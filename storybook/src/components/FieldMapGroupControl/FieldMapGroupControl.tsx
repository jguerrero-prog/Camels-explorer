import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GridSizePicker } from '../GridSizePicker/GridSizePicker';
import type { GridSize } from '../GridSizePicker/GridSizePicker';
import './FieldMapGroupControl.css';

export type FieldMapGroupControlProps = {
  /** `null` = single map (today's default behavior, unchanged). */
  value: GridSize | null;
  onChange: (size: GridSize | null) => void;
  /** The tile's own "Realization" field value - shown in the caption so
   * the real fill range (e.g. "Realizations 42-57") is visible before
   * committing, not just after. */
  startRealization: number;
  maxRows?: number;
  maxCols?: number;
};

/** Real (added 2026-08-06, ticket #12 - "2D Field Map currently shows one
 * realization at a time... researchers like placing 2d field maps in
 * groups like 4 rows 4 columns"). Trigger button + portal-positioned
 * popover (same positioning pattern as `ChartModeDropdown` - a
 * `getBoundingClientRect` on open, `position: fixed`, closes on outside
 * click/Escape) wrapping the real `GridSizePicker` widget. Lives inside
 * `FieldMap2DSidebar`, right below the Field picker.
 *
 * Real, deliberate constraint: only offered when the tile's `realization`
 * is a plain number - see `FieldMap2DSidebar`'s own docs for why 1P (whose
 * `realization` is a compound string id like `"p11_2"`, not a number) has
 * no real "next realization" to sequentially fill a grid with, so this
 * control isn't rendered at all for a 1P selection rather than shown
 * disabled with no explanation. */
export function FieldMapGroupControl({ value, onChange, startRealization, maxRows = 6, maxCols = 6 }: FieldMapGroupControlProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current!.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((e.target as HTMLElement).closest?.('.field-map-group-control__menu')) return;
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
    <div className="field-map-group-control" ref={rootRef}>
      <p className="field-map-group-control__label">Group view</p>
      <button
        ref={triggerRef}
        type="button"
        className="field-map-group-control__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{value ? `${value.rows} × ${value.cols} grid` : 'Single map'}</span>
      </button>
      <p className="field-map-group-control__caption">
        {value
          ? `Realizations ${startRealization}–${startRealization + value.rows * value.cols - 1}, filled left-to-right/top-to-bottom from the Realization field above.`
          : 'One realization at a time - open the picker to mosaic several together.'}
      </p>
      {open
        && createPortal(
          <div className="field-map-group-control__menu" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}>
            <GridSizePicker
              maxRows={maxRows}
              maxCols={maxCols}
              onSelect={(size) => {
                onChange(size);
                setOpen(false);
              }}
            />
            {value && (
              <>
                <div className="field-map-group-control__divider" />
                <button
                  type="button"
                  className="field-map-group-control__reset"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  Back to single map
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
