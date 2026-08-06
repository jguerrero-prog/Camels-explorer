import { useState } from 'react';
import './AnnotationOverlay.css';

export type Annotation = {
  id: string;
  xFrac: number;
  yFrac: number;
  text: string;
  createdAt: number;
  /** Real (Toolbar's Hide feature, added 2026-08-06) - a snapshot stamp,
   * not a live filter: set on every annotation that existed *at the
   * moment* "Hide Annotations" was last clicked (see App.tsx's
   * `handleHideToggle`). An annotation created afterward starts `false`
   * regardless of the current hide state - it wasn't there to be stamped.
   * App.tsx filters this out before ever passing the array to this
   * component, so a hidden annotation is fully non-interactive, not just
   * visually dimmed. */
  hidden?: boolean;
};

export type AnnotationOverlayProps = {
  annotations: Annotation[];
  /** The annotation whose callout is open, or the sentinel `'new'` for a
   * just-placed pin still awaiting its first text entry. */
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  /** Pending pin position - not yet a real Annotation until text is
   * saved (see App.tsx's own annotateDraft state). Rendered the same way
   * as a real pin, just with an empty editable callout already open. */
  draft: { xFrac: number; yFrac: number } | null;
  onSaveDraft: (text: string) => void;
  onCancelDraft: () => void;
};

function relativeTime(createdAt: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - createdAt) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Real (Figma node 1055-10's annotation-pin/annotation-callout) - one pin
 * per real Annotation, positioned as a fraction of the chart area's own
 * box (see PlotTile's onChartClick), plus one optional draft pin/callout
 * for a click that hasn't been saved yet. No real multi-user identity in
 * this app, so the callout's "author-row" is just a relative timestamp,
 * not a name/avatar. */
export function AnnotationOverlay({
  annotations, activeId, onSelect, onDelete, draft, onSaveDraft, onCancelDraft,
}: AnnotationOverlayProps) {
  const [editText, setEditText] = useState('');

  return (
    <>
      {annotations.map((a) => (
        <div
          key={a.id}
          className="annotation-pin"
          style={{ left: `${a.xFrac * 100}%`, top: `${a.yFrac * 100}%` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(activeId === a.id ? null : a.id);
          }}
        >
          {activeId === a.id && (
            <div className="annotation-callout" onClick={(e) => e.stopPropagation()}>
              <div className="annotation-callout__author-row">
                <span className="annotation-callout__dot" />
                <span className="annotation-callout__time">{relativeTime(a.createdAt)}</span>
                <button
                  type="button"
                  className="annotation-callout__delete"
                  onClick={() => onDelete(a.id)}
                  aria-label="Delete annotation"
                  title="Delete annotation"
                >
                  ×
                </button>
              </div>
              <p className="annotation-callout__text">{a.text}</p>
            </div>
          )}
        </div>
      ))}
      {draft && (
        <div className="annotation-pin" style={{ left: `${draft.xFrac * 100}%`, top: `${draft.yFrac * 100}%` }}>
          <div className="annotation-callout" onClick={(e) => e.stopPropagation()}>
            <textarea
              className="annotation-callout__input"
              placeholder="Add a note…"
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="annotation-callout__actions">
              <button type="button" className="annotation-callout__cancel" onClick={onCancelDraft}>
                Cancel
              </button>
              <button
                type="button"
                className="annotation-callout__save"
                disabled={!editText.trim()}
                onClick={() => onSaveDraft(editText.trim())}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
