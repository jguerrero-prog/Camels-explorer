import type { ReactNode } from 'react';
import plusIcon from './assets/icon-plus-empty-state.svg';
import './Tile.css';

export type TileProps = {
  title: string;
  onAddPlot: () => void;
  /** Real Figma evidence (node `1113:1609`, "stats-row") nests the canvas's
   * zero-plots stat chips as the last child inside the same card as the
   * lone starter tile's empty state — not as a separate row above it. Tile
   * still doesn't decide *whether* to show them (that's a canvas-level
   * call, see CanvasStatsRow.mdx) — this is just the slot for it. */
  footer?: ReactNode;
};

export function Tile({ title, onAddPlot, footer }: TileProps) {
  return (
    <div className="tile">
      <h3 className="tile__title">{title}</h3>
      <button type="button" className="tile__empty-state" onClick={onAddPlot}>
        <span className="tile__empty-icon">
          <img src={plusIcon} alt="" />
        </span>
        <p className="tile__empty-caption">Add a plot or simulation</p>
      </button>
      {footer}
    </div>
  );
}
