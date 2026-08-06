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
  /** Whether Annotate mode is currently on (App.tsx's own `annotateMode`)
   * - shows the same pressed-background treatment as the view-mode
   * toggle's active option, so it's clear the next click on a chart will
   * drop a pin rather than just focus the tile. */
  annotateActive?: boolean;
  /** Real (added 2026-08-06, no Figma design - user-requested directly):
   * draw a straight arrow of arbitrary length/direction anywhere on a
   * tile's chart, by clicking a start point then an end point. Distinct
   * from Annotate (a pin tied to one precise point, always carries text)
   * - an arrow points AT something without necessarily saying anything
   * about it. */
  onArrow?: () => void;
  arrowActive?: boolean;
  /** Real (added 2026-08-06, no Figma design) - a free-floating text note,
   * placed with a single click anywhere on a tile. Distinct from
   * Annotate: no anchor pin/dot, no precise-location semantics - just a
   * note living on the canvas near where it was dropped. */
  onNote?: () => void;
  noteActive?: boolean;
  onHide?: () => void;
  /** Real (added 2026-08-06, direct user feedback: "I want us to create a
   * hide feature on the toolbar... hide annotations, arrows, notes, or
   * the paramreadouts"). Same `toolbar__tool-wrap`/`toolbar__popover-anchor`
   * pattern as Ratio/diff and Copy as code below - a real popover, not a
   * toggle-mode tool, so (unlike Annotate/Arrow/Note) there's no
   * `hideActive` prop; the button's own look never changes, only whether
   * the popover renders. */
  hidePopover?: ReactNode;
  onRatioDiff?: () => void;
  /** Real (Figma node 989-10's ratio-diff-popover) - rendered directly
   * below the Ratio/diff button, same `toolbar__tool-wrap` anchor pattern
   * as Copy as code's own popover. */
  ratioDiffPopover?: ReactNode;
  onRuler?: () => void;
  /** Whether Ruler mode is currently on (App.tsx's own `rulerMode`) - same
   * pressed treatment as Annotate's own active state. */
  rulerActive?: boolean;
  onLinkedBrushing?: () => void;
  /** Whether Linked brushing mode is currently on (App.tsx's own
   * `brushCaptureActive`) - same pressed treatment as Annotate/Ruler. */
  linkedBrushingActive?: boolean;
  onCopyProvenance?: () => void;
  onCopyAsCode?: () => void;
  /** Real (Figma node 1076-10's plot-code-modal) - rendered directly below
   * the Copy as code button (this file owns the `position: relative`
   * anchor + the real dropdown-style pointer/offset), so App.tsx only
   * needs to decide whether the popover is open and what code to show,
   * not where onscreen it lives. */
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
