import plusIcon from './assets/icon-plus-button.svg';
import './TopNav.css';

export type TopNavProps = {
  /** "Untitled" in the real design - the folder this project lives in.
   * Confirmed 2026-08-04: this is a folder/project display, not a
   * navigational breadcrumb trail - see TopNav.mdx Spec. */
  folderName: string;
  /** e.g. "Project 1" - the project's own name. */
  projectName: string;
  onAddPlot: () => void;
};

export function TopNav({ folderName, projectName, onAddPlot }: TopNavProps) {
  return (
    <header className="top-nav">
      <div className="top-nav__path">
        <span className="top-nav__path-segment">{folderName}</span>
        <span className="top-nav__path-separator">/</span>
        <span className="top-nav__path-segment top-nav__path-segment--current">{projectName}</span>
      </div>
      <button type="button" className="top-nav__add-plot" onClick={onAddPlot}>
        <img src={plusIcon} alt="" />
        Add Plot
      </button>
    </header>
  );
}
