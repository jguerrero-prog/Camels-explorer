import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import './NoteOverlay.css';

export type NoteShape = {
  id: string;
  xFrac: number;
  yFrac: number;
  text: string;
  /** Real (Toolbar's Hide feature, added 2026-08-06) - see Annotation's
   * own docs (AnnotationOverlay.tsx) for the full snapshot-stamp rule;
   * identical semantics here. */
  hidden?: boolean;
};

export type NoteOverlayProps = {
  notes: NoteShape[];
  onSaveText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, xFrac: number, yFrac: number) => void;
  /** A just-placed, not-yet-saved note - same shape as Annotate's own
   * draft, but with no pin/dot rendered underneath it (see this file's
   * own docs for why Note is deliberately not Annotate). */
  draft: { xFrac: number; yFrac: number } | null;
  onSaveDraft: (text: string) => void;
  onCancelDraft: () => void;
};

/** Real (added 2026-08-06, no Figma design - user-requested directly, "a
 * note, different from annotation"): a free-floating sticky note, placed
 * with one click anywhere on a tile's chart area. Deliberately distinct
 * from Annotate in both behavior and look - no anchor pin/dot (a note
 * isn't tied to one precise data point the way an annotation is), and
 * draggable (mousedown+drag repositions it) since a free note has no
 * "correct" location the way a pinned annotation does.
 *
 * Real fix (2026-08-06, direct user feedback): the original translucent
 * warm-amber card failed WCAG contrast. Now a flat, opaque cardinal-red
 * index card (verified 9.3:1/WCAG AAA white-on-red contrast - see
 * semantic.css's own `--color-note-*` docs) designed to survive a direct
 * screenshot into a research presentation, not a floating glassmorphic
 * overlay. */
export function NoteOverlay({ notes, onSaveText, onDelete, onMove, draft, onSaveDraft, onCancelDraft }: NoteOverlayProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [draftText, setDraftText] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const startDrag = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    setDragId(id);
    const container = (e.currentTarget as HTMLElement).closest('.plot-tile__chart-area') as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const handleMove = (moveEvent: MouseEvent) => {
      const xFrac = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
      const yFrac = Math.min(1, Math.max(0, (moveEvent.clientY - rect.top) / rect.height));
      onMove(id, xFrac, yFrac);
    };
    const handleUp = () => {
      setDragId(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <>
      {notes.map((n) => (
        <div
          key={n.id}
          className={`note-card ${dragId === n.id ? 'note-card--dragging' : ''}`}
          style={{ left: `${n.xFrac * 100}%`, top: `${n.yFrac * 100}%` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="note-card__handle" onMouseDown={(e) => startDrag(e, n.id)}>
            <button
              type="button"
              className="note-card__delete"
              onClick={() => onDelete(n.id)}
              aria-label="Delete note"
              title="Delete note"
            >
              ×
            </button>
          </div>
          {editingId === n.id ? (
            <>
              <textarea
                className="note-card__input"
                value={editText}
                autoFocus
                onChange={(e) => setEditText(e.target.value)}
              />
              <button
                type="button"
                className="note-card__save"
                onClick={() => {
                  onSaveText(n.id, editText.trim());
                  setEditingId(null);
                }}
              >
                Save
              </button>
            </>
          ) : (
            <p
              className="note-card__text"
              onClick={() => {
                setEditingId(n.id);
                setEditText(n.text);
              }}
            >
              {n.text || 'Click to edit…'}
            </p>
          )}
        </div>
      ))}
      {draft && (
        <div className="note-card" style={{ left: `${draft.xFrac * 100}%`, top: `${draft.yFrac * 100}%` }} onClick={(e) => e.stopPropagation()}>
          <textarea
            className="note-card__input"
            placeholder="Type a note…"
            autoFocus
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <div className="note-card__actions">
            <button type="button" className="note-card__cancel" onClick={onCancelDraft}>
              Cancel
            </button>
            <button
              type="button"
              className="note-card__save"
              disabled={!draftText.trim()}
              onClick={() => onSaveDraft(draftText.trim())}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}
