import { useEffect, useState } from 'react';
import './LoadingIndicator.css';

// Streamlit's own top-right "script is running" cue cycles through a small
// set of activity pictograms (bike/swim/broom/run) rather than a plain
// spinner - named directly by the user as the reference to match.
const ACTIVITIES = ['🚴', '🏊', '🧹', '🏃'];
const CYCLE_MS = 900;

export type LoadingIndicatorProps = {
  /** Discards whatever response is still in flight (App.tsx's requestSeqRef
   * guard) and clears every tile's loading state - there's no real network
   * cancellation, but that's invisible to the user either way. */
  onStop: () => void;
};

/** Shown in TopNav, left of Add Plot, whenever any tile has a refetch in
 * flight - added 2026-08-05 after the user reported "crazy friction" with
 * no visual cue that a slider change was still loading. See
 * LoadingIndicator.mdx. */
export function LoadingIndicator({ onStop }: LoadingIndicatorProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => (f + 1) % ACTIVITIES.length), CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-indicator">
      <span className="loading-indicator__icon" aria-hidden="true">{ACTIVITIES[frame]}</span>
      <span className="loading-indicator__label">Loading…</span>
      <button type="button" className="loading-indicator__stop" onClick={onStop}>
        Stop
      </button>
    </div>
  );
}
