import type { ReactNode } from 'react';
import './ParamsSidebar.css';

export type ParamsSidebarProps = {
  /** The statistic's own name, e.g. "SFR History". */
  title: string;
  /** Real fields are heterogeneous - SelectField, Slider, NumberStepper,
   * Checkbox, MultiSelect all appear in the real params panel depending on
   * the statistic (confirmed 2026-08-04 across multiple frames). ParamsSidebar
   * only owns the panel shell (title/divider) - composing the right
   * fields for a given statistic is the caller's job, matching STUDIO_PLAN.md's
   * "only show controls a statistic actually consumes" rule. */
  children: ReactNode;
};

export function ParamsSidebar({ title, children }: ParamsSidebarProps) {
  return (
    <div className="params-sidebar">
      <p className="params-sidebar__title">{title}</p>
      <div className="params-sidebar__divider" />
      {children}
    </div>
  );
}
