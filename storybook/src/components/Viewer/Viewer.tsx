import type { ReactNode } from 'react';
import './Viewer.css';

export type ViewerProps = {
  mode: 'grid' | 'stacked';
  children: ReactNode;
};

/** Arranges Tile children per the real "2x2 panel" (grid) and "stacked
 * panel" (stacked) containers - both use a 16px outer padding and 16px gap
 * between tiles, confirmed from both frames' real child positions. This is
 * layout only - it doesn't render tile content itself. */
export function Viewer({ mode, children }: ViewerProps) {
  return <div className={`viewer viewer--${mode}`}>{children}</div>;
}
