import annotateIcon from './assets/annotate.svg';
import ratioDiffIcon from './assets/ratio-diff.svg';
import rulerIcon from './assets/ruler.svg';
import linkedBrushingIcon from './assets/linked-brushing.svg';
import copyProvenanceIcon from './assets/copy-provenance.svg';
import copyAsCodeIcon from './assets/copy-as-code.svg';
import aiAgentIcon from './assets/ai-agent.svg';
import gridIcon from './assets/grid.svg';
import stackedIcon from './assets/stacked.svg';
import './Toolbar.css';

export type ViewMode = 'grid' | 'stacked';

export type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Tool click handlers - all optional since this is skeleton-level: no
   * tool has real behavior wired yet (annotations, ratio/diff overlay,
   * ruler, linked brushing, copy provenance, copy as code, AI agent). See
   * Toolbar.mdx Spec for what's real vs. still just a real, named slot. */
  onAnnotate?: () => void;
  onRatioDiff?: () => void;
  onRuler?: () => void;
  onLinkedBrushing?: () => void;
  onCopyProvenance?: () => void;
  onCopyAsCode?: () => void;
  onAiAgent?: () => void;
};

export function Toolbar({
  viewMode,
  onViewModeChange,
  onAnnotate,
  onRatioDiff,
  onRuler,
  onLinkedBrushing,
  onCopyProvenance,
  onCopyAsCode,
  onAiAgent,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button type="button" className="toolbar__tool" onClick={onAnnotate} aria-label="Annotate">
        <img src={annotateIcon} alt="" />
      </button>
      <button type="button" className="toolbar__tool" onClick={onRatioDiff} aria-label="Ratio / diff overlay">
        <img src={ratioDiffIcon} alt="" />
      </button>
      <button type="button" className="toolbar__tool" onClick={onRuler} aria-label="Ruler">
        <img src={rulerIcon} alt="" />
      </button>
      <button type="button" className="toolbar__tool" onClick={onLinkedBrushing} aria-label="Linked cross-tile brushing">
        <img src={linkedBrushingIcon} alt="" />
      </button>
      <button type="button" className="toolbar__tool" onClick={onCopyProvenance} aria-label="Copy provenance">
        <img src={copyProvenanceIcon} alt="" />
      </button>
      <button type="button" className="toolbar__tool" onClick={onCopyAsCode} aria-label="Copy as code">
        <img src={copyAsCodeIcon} alt="" />
      </button>
      <div className="toolbar__divider" />
      <button type="button" className="toolbar__tool" onClick={onAiAgent} aria-label="AI agent">
        <img src={aiAgentIcon} alt="" />
      </button>
      <div className="toolbar__spacer" />
      <div className="toolbar__viewmode">
        <button
          type="button"
          className={`toolbar__viewmode-option ${viewMode === 'grid' ? 'toolbar__viewmode-option--active' : ''}`}
          onClick={() => onViewModeChange('grid')}
          aria-pressed={viewMode === 'grid'}
          aria-label="Grid view"
        >
          <img src={gridIcon} alt="" />
        </button>
        <button
          type="button"
          className={`toolbar__viewmode-option ${viewMode === 'stacked' ? 'toolbar__viewmode-option--active' : ''}`}
          onClick={() => onViewModeChange('stacked')}
          aria-pressed={viewMode === 'stacked'}
          aria-label="Stacked view"
        >
          <img src={stackedIcon} alt="" />
        </button>
      </div>
    </div>
  );
}
