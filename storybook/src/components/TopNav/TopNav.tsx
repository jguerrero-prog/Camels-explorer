import type { ReactNode } from 'react';
import plusIcon from './assets/icon-plus-button.svg';
import './TopNav.css';

export type TopNavProps = {
  onAddPlot: () => void;
  /** Slot for the `Toolbar`, which shares this one row with the Add Plot
   * button. Omit it entirely, rather than rendering a hidden one, when no
   * plot exists yet. */
  toolbar?: ReactNode;
  /** Slot for the `LoadingIndicator`. It shares a flex group with the Add
   * Plot button, so it always sits immediately to the button's left whether
   * or not `toolbar` is present. */
  loadingIndicator?: ReactNode;
};

export function TopNav({ onAddPlot, toolbar, loadingIndicator }: TopNavProps) {
  return (
    <header className="top-nav">
      {toolbar}
      <div className="top-nav__actions">
        {loadingIndicator}
        <button type="button" className="top-nav__add-plot" onClick={onAddPlot}>
          <img src={plusIcon} alt="" />
          Add Plot
        </button>
      </div>
    </header>
  );
}
