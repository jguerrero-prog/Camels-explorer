import { useState } from 'react';
import './GridSizePicker.css';

export type GridSize = { rows: number; cols: number };

export type GridSizePickerProps = {
  /** Both default to 6 - matches Google Docs'/MS Word's own "Insert Table"
   * picker default extent (a plain grid a user can still reach beyond by
   * moving off the last cell isn't supported here, since every real
   * caller of this component - field-map grouping - has no real use case
   * past ~6x6 cells in one tile). */
  maxRows?: number;
  maxCols?: number;
  onSelect: (size: GridSize) => void;
};

/** Real (added 2026-08-06, direct user feedback: "for grid size, they
 * should have the ability to set the grid size to whichever (2x2, 3x3,
 * 4x3, 5x4) you would need to create a grid picker, similar to table size
 * selectors you see in google docs or ms word"). A hover/drag grid,
 * deliberately not a plain R/C count field - hovering cell (r, c)
 * highlights every cell from the top-left corner through (r, c) and shows
 * the resulting "R × C" size below, exactly like Insert Table. Supports
 * non-square sizes (2×2 through maxRows×maxCols) - clicking any cell
 * commits that exact rectangle. This component owns only the grid/label
 * widget itself - see `FieldMapGroupControl` for the trigger button +
 * portal-positioned popover that anchors it inside a real sidebar. */
export function GridSizePicker({ maxRows = 6, maxCols = 6, onSelect }: GridSizePickerProps) {
  const [hover, setHover] = useState<GridSize | null>(null);

  return (
    <div className="grid-size-picker">
      <div
        className="grid-size-picker__grid"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)`, gridTemplateRows: `repeat(${maxRows}, 1fr)` }}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: maxRows }, (_, r) => (
          Array.from({ length: maxCols }, (_, c) => {
            const active = hover !== null && r < hover.rows && c < hover.cols;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={`grid-size-picker__cell ${active ? 'grid-size-picker__cell--active' : ''}`}
                onMouseEnter={() => setHover({ rows: r + 1, cols: c + 1 })}
                onClick={() => onSelect({ rows: r + 1, cols: c + 1 })}
                aria-label={`${r + 1} row${r === 0 ? '' : 's'} by ${c + 1} column${c === 0 ? '' : 's'}`}
              />
            );
          })
        ))}
      </div>
      <p className="grid-size-picker__label">{hover ? `${hover.rows} × ${hover.cols}` : 'Hover to pick a grid size'}</p>
    </div>
  );
}
