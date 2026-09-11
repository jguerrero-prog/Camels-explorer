import type { ReactNode } from 'react';
import annotateIcon from './assets/annotate.svg';
import arrowIcon from './assets/arrow.svg';
import noteIcon from './assets/note.svg';
import ratioDiffIcon from './assets/ratio-diff.svg';
import rulerIcon from './assets/ruler.svg';
import linkedBrushingIcon from './assets/linked-brushing.svg';
import copyProvenanceIcon from './assets/copy-provenance.svg';
import copyAsCodeIcon from './assets/copy-as-code.svg';
import hideIcon from './assets/hide.svg';
import gridIcon from './assets/grid.svg';
import stackedIcon from './assets/stacked.svg';
import './Toolbar.css';

export type ViewMode = 'grid' | 'stacked';

export type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAnnotate?: () => void;
  /** Whether Annotate mode is on. Takes the same pressed treatment as the
   * active view mode, so it is clear that the next click on a chart drops a
   * pin rather than focusing the tile. */
  annotateActive?: boolean;
  /** Enters arrow mode: click a start point, then an end point. Unlike an
   * annotation, an arrow points at something without saying anything about
   * it. */
  onArrow?: () => void;
  arrowActive?: boolean;
  /** Enters note mode: one click places a free-floating card. Unlike an
   * annotation it has no pin and no precise location, so it is for a remark
   * about the figure rather than about a point in it. */
  onNote?: () => void;
  noteActive?: boolean;
  onHide?: () => void;
  /** Slot for `HidePopover`, anchored below the Hide button. A popover
   * rather than a mode, so there is no active state: the button's look never
   * changes, only whether the popover renders. */
  hidePopover?: ReactNode;
  onRatioDiff?: () => void;
  /** Slot for `RatioDiffPopover`, anchored below the Ratio/diff button. */
  ratioDiffPopover?: ReactNode;
  onRuler?: () => void;
  /** Whether Ruler mode is on. Same pressed treatment as Annotate. */
  rulerActive?: boolean;
  onLinkedBrushing?: () => void;
  /** Whether Linked brushing mode is on. Same pressed treatment as
   * Annotate and Ruler. */
  linkedBrushingActive?: boolean;
  onCopyProvenance?: () => void;
  onCopyAsCode?: () => void;
  /** Slot for `CopyAsCodePopover`. The toolbar owns the anchor and the
   * pointer offset, so a caller only decides whether it is open and what
   * code to show, not where it sits. */
  copyAsCodePopover?: ReactNode;
};

export function Toolbar({
  viewMode,
  onViewModeChange,
  onAnnotate,
  annotateActive,
  onArrow,
  arrowActive,
  onNote,
  noteActive,
  onHide,
  hidePopover,
  onRatioDiff,
  ratioDiffPopover,
  onRuler,
  rulerActive,
  onLinkedBrushing,
  linkedBrushingActive,
  onCopyProvenance,
  onCopyAsCode,
  copyAsCodePopover,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button
        type="button"
        className={`toolbar__tool ${annotateActive ? 'toolbar__tool--active' : ''}`}
        onClick={onAnnotate}
        aria-pressed={annotateActive}
        aria-label="Annotate"
        title="Annotate"
      >
        <img src={annotateIcon} alt="" />
      </button>
      <button
        type="button"
        className={`toolbar__tool ${arrowActive ? 'toolbar__tool--active' : ''}`}
        onClick={onArrow}
        aria-pressed={arrowActive}
        aria-label="Arrow"
        title="Arrow"
      >
        <img src={arrowIcon} alt="" />
      </button>
      <button
        type="button"
        className={`toolbar__tool ${noteActive ? 'toolbar__tool--active' : ''}`}
        onClick={onNote}
        aria-pressed={noteActive}
        aria-label="Note"
        title="Note"
      >
        <img src={noteIcon} alt="" />
      </button>
      <div className="toolbar__tool-wrap">
        <button type="button" className="toolbar__tool" onClick={onHide} aria-label="Hide" title="Hide">
          <img src={hideIcon} alt="" />
        </button>
        {hidePopover && <div className="toolbar__popover-anchor">{hidePopover}</div>}
      </div>
      <div className="toolbar__tool-wrap">
        <button type="button" className="toolbar__tool" onClick={onRatioDiff} aria-label="Ratio / diff overlay" title="Ratio / diff overlay">
          <img src={ratioDiffIcon} alt="" />
        </button>
        {ratioDiffPopover && <div className="toolbar__popover-anchor">{ratioDiffPopover}</div>}
      </div>
      <button
        type="button"
        className={`toolbar__tool ${rulerActive ? 'toolbar__tool--active' : ''}`}
        onClick={onRuler}
        aria-pressed={rulerActive}
        aria-label="Ruler"
        title="Ruler"
      >
        <img src={rulerIcon} alt="" />
      </button>
      <button
        type="button"
        className={`toolbar__tool ${linkedBrushingActive ? 'toolbar__tool--active' : ''}`}
        onClick={onLinkedBrushing}
        aria-pressed={linkedBrushingActive}
        aria-label="Linked cross-tile brushing"
        title="Linked cross-tile brushing"
      >
        <img src={linkedBrushingIcon} alt="" />
      </button>
      <button type="button" className="toolbar__tool" onClick={onCopyProvenance} aria-label="Copy provenance" title="Copy provenance">
        <img src={copyProvenanceIcon} alt="" />
      </button>
      <div className="toolbar__tool-wrap">
        <button type="button" className="toolbar__tool" onClick={onCopyAsCode} aria-label="Copy as code" title="Copy as code">
          <img src={copyAsCodeIcon} alt="" />
        </button>
        {copyAsCodePopover && <div className="toolbar__popover-anchor">{copyAsCodePopover}</div>}
      </div>
      <div className="toolbar__spacer" />
      <div className="toolbar__viewmode">
        <button
          type="button"
          className={`toolbar__viewmode-option ${viewMode === 'grid' ? 'toolbar__viewmode-option--active' : ''}`}
          onClick={() => onViewModeChange('grid')}
          aria-pressed={viewMode === 'grid'}
          aria-label="Grid view"
          title="Grid view"
        >
          <img src={gridIcon} alt="" />
        </button>
        <button
          type="button"
          className={`toolbar__viewmode-option ${viewMode === 'stacked' ? 'toolbar__viewmode-option--active' : ''}`}
          onClick={() => onViewModeChange('stacked')}
          aria-pressed={viewMode === 'stacked'}
          aria-label="Stacked view"
          title="Stacked view"
        >
          <img src={stackedIcon} alt="" />
        </button>
      </div>
    </div>
  );
}
