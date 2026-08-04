import type { ReactNode } from 'react';
import './ParamsSidebar.css';

export type ParamsSidebarProps = {
  /** e.g. "PANEL 1 · FOCUSED" - which tile this panel belongs to. */
  panelLabel: string;
  /** The statistic's own name, e.g. "SFR History". */
  title: string;
  /** Real fields are heterogeneous - SelectField, Slider, NumberStepper,
   * Checkbox, MultiSelect all appear in the real params panel depending on
   * the statistic (confirmed 2026-08-04 across multiple frames). ParamsSidebar
   * only owns the panel shell (eyebrow/title/divider) - composing the right
   * fields for a given statistic is the caller's job, matching STUDIO_PLAN.md's
   * "only show controls a statistic actually consumes" rule. */
  children: ReactNode;
};

export function ParamsSidebar({ panelLabel, title, children }: ParamsSidebarProps) {
  return (
    <div className="params-sidebar">
      <p className="params-sidebar__eyebrow">{panelLabel}</p>
      <p className="params-sidebar__title">{title}</p>
      <div className="params-sidebar__divider" />
      {children}
    </div>
  );
}
