import { useEffect } from 'react';
import './RatioDiffPopover.css';

export type RatioDiffCandidate = {
  tileId: string;
  title: string;
  caption: string;
  /** Whether this tile can be compared against. Only a tile showing the
   * same statistic has an x-axis that means the same thing. A tile showing a
   * different statistic is still listed, but disabled, so the user can see
   * why it is not on offer. */
  compatible: boolean;
};

export type RatioDiffPopoverProps = {
  candidates: RatioDiffCandidate[];
  selectedTileId: string | null;
  onSelect: (tileId: string) => void;
  onNewPlot: () => void;
  onCompare: (mode: 'ratio' | 'difference') => void;
  mode: 'ratio' | 'difference';
  onModeChange: (mode: 'ratio' | 'difference') => void;
  /** Dismisses the popover on Escape. There is no close button in the
   * header, so this is the only way to leave without choosing something.
   * Optional in the type because the application always supplies it, not
   * because omitting it is expected. */
  onClose?: () => void;
};

/** "Compare against" popover for the ratio and difference tool: picks
 * another tile to compare the focused tile against. */
export function RatioDiffPopover({
  candidates, selectedTileId, onSelect, onNewPlot, onCompare, mode, onModeChange, onClose,
}: RatioDiffPopoverProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="ratio-diff-popover" role="dialog" aria-label="Compare against">
      <div className="ratio-diff-popover__header">
        <p className="ratio-diff-popover__eyebrow">Compare against</p>
      </div>
      <button type="button" className="ratio-diff-popover__row ratio-diff-popover__row--new" onClick={onNewPlot}>
        <span className="ratio-diff-popover__plus-wrap">+</span>
        <span className="ratio-diff-popover__text-col">
          <span className="ratio-diff-popover__row-title">New plot</span>
          <span className="ratio-diff-popover__row-caption">Configure a fresh comparison target</span>
        </span>
      </button>
      <div className="ratio-diff-popover__divider" />
      <div className="ratio-diff-popover__candidates">
        {candidates.length === 0 && (
          <p className="ratio-diff-popover__empty">No other tiles yet - add one to compare against.</p>
        )}
        {candidates.map((c) => (
          <label
            key={c.tileId}
            className={`ratio-diff-popover__row ${!c.compatible ? 'ratio-diff-popover__row--disabled' : ''}`}
          >
            <input
              type="checkbox"
              className="ratio-diff-popover__checkbox"
              checked={selectedTileId === c.tileId}
              disabled={!c.compatible}
              onChange={() => c.compatible && onSelect(c.tileId)}
            />
            <span className="ratio-diff-popover__text-col">
              <span className="ratio-diff-popover__row-title">{c.title}</span>
              <span className="ratio-diff-popover__row-caption">
                {c.compatible ? c.caption : "Different statistic - axes aren't comparable"}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="ratio-diff-popover__divider" />
      <div className="ratio-diff-popover__mode-row">
        <button
          type="button"
          className={`ratio-diff-popover__mode-btn ${mode === 'ratio' ? 'ratio-diff-popover__mode-btn--active' : ''}`}
          onClick={() => onModeChange('ratio')}
        >
          Ratio
        </button>
        <button
          type="button"
          className={`ratio-diff-popover__mode-btn ${mode === 'difference' ? 'ratio-diff-popover__mode-btn--active' : ''}`}
          onClick={() => onModeChange('difference')}
        >
          Difference
        </button>
      </div>
      <div className="ratio-diff-popover__footer">
        <button
          type="button"
          className="ratio-diff-popover__compare-btn"
          disabled={!selectedTileId}
          onClick={() => selectedTileId && onCompare(mode)}
        >
          Compare
        </button>
      </div>
    </div>
  );
}
