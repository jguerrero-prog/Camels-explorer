import projectIcon from './assets/icon-rail-project.svg';
import filesIcon from './assets/icon-rail-files.svg';
import settingsIcon from './assets/icon-settings.svg';
import './IconRail.css';

export type IconRailPanel = 'project' | 'files' | null;

export type IconRailProps = {
  /** Which panel (if any) is currently open - Project and Files are mutually
   * exclusive and mutually exclusive with the params sidebar (see
   * STUDIO_PLAN.md "Left icon rail" section). Settings has no panel yet. */
  activePanel: IconRailPanel;
  onSelectPanel: (panel: IconRailPanel) => void;
};

export function IconRail({ activePanel, onSelectPanel }: IconRailProps) {
  return (
    <nav className="icon-rail" aria-label="Primary">
      <div className="icon-rail__avatar" aria-hidden="true" />
      <button
        type="button"
        className={`icon-rail__button ${activePanel === 'project' ? 'icon-rail__button--active' : ''}`}
        onClick={() => onSelectPanel(activePanel === 'project' ? null : 'project')}
        aria-pressed={activePanel === 'project'}
        aria-label="Project"
        title="Project"
      >
        <img src={projectIcon} alt="" />
      </button>
      <button
        type="button"
        className={`icon-rail__button ${activePanel === 'files' ? 'icon-rail__button--active' : ''}`}
        onClick={() => onSelectPanel(activePanel === 'files' ? null : 'files')}
        aria-pressed={activePanel === 'files'}
        aria-label="Files"
        title="Files"
      >
        <img src={filesIcon} alt="" />
      </button>
      <button type="button" className="icon-rail__button" aria-label="Settings" title="Settings">
        <img src={settingsIcon} alt="" />
      </button>
    </nav>
  );
}
