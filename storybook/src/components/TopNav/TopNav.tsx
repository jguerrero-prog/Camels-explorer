import type { ReactNode } from 'react';
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
  /** Real slot (Figma node 1012:1124, "header") for Toolbar - the real
   * frame shows breadcrumbs/toolbar/Add Plot in one row, not two. Omit
   * entirely (not just hide) when no plot exists yet - see TopNav.mdx. */
  toolbar?: ReactNode;
};

export function TopNav({ folderName, projectName, onAddPlot, toolbar }: TopNavProps) {
  return (
    <header className="top-nav">
      <div className="top-nav__path">
        <span className="top-nav__path-segment">{folderName}</span>
        <span className="top-nav__path-separator">/</span>
        <span className="top-nav__path-segment top-nav__path-segment--current">{projectName}</span>
      </div>
      {toolbar}
      <button type="button" className="top-nav__add-plot" onClick={onAddPlot}>
        <img src={plusIcon} alt="" />
        Add Plot
      </button>
    </header>
  );
}
