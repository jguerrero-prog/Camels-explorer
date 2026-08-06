import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import './LinkedBrushOverlay.css';

export type LinkedBrushOverlayProps = {
  /** Whether this tile can start a NEW drag right now (App.tsx's own
   * Linked brushing toolbar toggle) - a tile showing someone else's
   * highlight can still always be re-dragged to become the new source. */
  captureActive: boolean;
  /** The current cross-tile selection, or null if none is active
   * anywhere yet. Every visible tile renders the SAME xFrac band on its
   * own chart width (Figma node 1063-10's real pixel measurements show
   * both panels' bands share one width fraction - confirmed directly
   * against the frame's own rectangle coordinates, not assumed) - it's
   * deliberately NOT translated into each tile's own data units, since
   * two arbitrary statistics (e.g. Redshift vs. Stellar mass) have no
   * real unit correspondence to translate through. */
  xFracStart: number | null;
  xFracEnd: number | null;
  /** True only for the tile whose drag produced the current selection -
   * shows the real data-range label (this tile's own x-axis, the one
   * range this component CAN state precisely) instead of just "LINKED". */
  isSource: boolean;
  /** Real label for the source tile only - e.g. "z = 2.1 - 4.3 selected",
   * computed from this tile's own real series data by App.tsx. Approximate
   * (a static PNG's exact plot-area inset isn't known client-side) - the
   * caller prefixes with "~" when that matters. */
  sourceLabel?: string;
  onBrush: (xFracStart: number, xFracEnd: number) => void;
  onClear: () => void;
};

/** Real (added 2026-08-06, Figma node 1063-10's brush-selection/
 * linked-highlight/linked-badge) - Linked cross-tile brushing. Drag a
 * horizontal band on any tile; every other visible tile highlights the
 * identical fraction of its own chart width. See this file's own
 * `xFracStart`/`xFracEnd` docs for why fraction-of-width (not translated
 * data units) is the real, defensible rule here. */
export function LinkedBrushOverlay({
  captureActive, xFracStart, xFracEnd, isSource, sourceLabel, onBrush, onClear,
}: LinkedBrushOverlayProps) {
  const [dragStartFrac, setDragStartFrac] = useState<number | null>(null);
  const [dragCurrentFrac, setDragCurrentFrac] = useState<number | null>(null);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!captureActive) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const startFrac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setDragStartFrac(startFrac);
    setDragCurrentFrac(startFrac);

    const handleMove = (moveEvent: globalThis.MouseEvent) => {
      const frac = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
      setDragCurrentFrac(frac);
    };
    const handleUp = (upEvent: globalThis.MouseEvent) => {
      const endFrac = Math.min(1, Math.max(0, (upEvent.clientX - rect.left) / rect.width));
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      setDragStartFrac(null);
      setDragCurrentFrac(null);
      if (Math.abs(endFrac - startFrac) > 0.01) {
        onBrush(Math.min(startFrac, endFrac), Math.max(startFrac, endFrac));
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const liveStart = dragStartFrac !== null && dragCurrentFrac !== null ? Math.min(dragStartFrac, dragCurrentFrac) : null;
  const liveEnd = dragStartFrac !== null && dragCurrentFrac !== null ? Math.max(dragStartFrac, dragCurrentFrac) : null;
  const showStart = liveStart ?? xFracStart;
  const showEnd = liveEnd ?? xFracEnd;

  return (
    <div
      className={`linked-brush-overlay ${captureActive ? 'linked-brush-overlay--capturing' : ''}`}
      onMouseDown={handleMouseDown}
    >
      {showStart !== null && showEnd !== null && (
        <>
          <div
            className="linked-brush-overlay__band"
            style={{ left: `${showStart * 100}%`, width: `${(showEnd - showStart) * 100}%` }}
          />
          {liveStart === null && (
            <div className="linked-brush-overlay__badge" style={{ left: `${showStart * 100}%` }}>
              <span className="linked-brush-overlay__badge-dot" />
              <span>{isSource && sourceLabel ? sourceLabel : 'LINKED'}</span>
              <button
                type="button"
                className="linked-brush-overlay__clear"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                aria-label="Clear linked brush"
                title="Clear linked brush"
              >
                ×
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
