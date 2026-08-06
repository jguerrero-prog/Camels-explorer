import './ArrowOverlay.css';

export type ArrowShape = {
  id: string;
  xFracA: number;
  yFracA: number;
  xFracB: number;
  yFracB: number;
  /** Real (Toolbar's Hide feature, added 2026-08-06) - see Annotation's
   * own docs (AnnotationOverlay.tsx) for the full snapshot-stamp rule;
   * identical semantics here. */
  hidden?: boolean;
};

export type ArrowOverlayProps = {
  arrows: ArrowShape[];
  onDelete: (id: string) => void;
  /** The first click of a not-yet-finished arrow, awaiting its second
   * click - rendered as a small dot so there's visible feedback that the
   * start point registered. */
  draftA: { xFrac: number; yFrac: number } | null;
};

/** Real (added 2026-08-06, no Figma design - user-requested directly): a
 * straight arrow of arbitrary length/direction between two clicked
 * points, in the same fractional chart-area coordinate space Annotate's
 * pins use (see PlotTile's onChartClick) - so it stays correctly placed
 * regardless of how large the tile renders. Percentage coordinates on the
 * SVG elements themselves (not a viewBox+transform) - straight lines stay
 * straight under independent-axis percentage scaling, and this avoids
 * needing the chart area's actual pixel size at render time. */
export function ArrowOverlay({ arrows, onDelete, draftA }: ArrowOverlayProps) {
  return (
    <svg className="arrow-overlay" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow-overlay-head" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-accent-gradient-end)" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <line
          key={a.id}
          className="arrow-overlay__line"
          x1={`${a.xFracA * 100}%`}
          y1={`${a.yFracA * 100}%`}
          x2={`${a.xFracB * 100}%`}
          y2={`${a.yFracB * 100}%`}
          markerEnd="url(#arrow-overlay-head)"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(a.id);
          }}
        />
      ))}
      {draftA && (
        <circle
          className="arrow-overlay__draft-point"
          cx={`${draftA.xFrac * 100}%`}
          cy={`${draftA.yFrac * 100}%`}
          r={4}
        />
      )}
    </svg>
  );
}
