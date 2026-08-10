import { useState } from 'react';
import './FieldMapMosaic.css';

export type FieldMapMosaicCell =
  | { realization: number; imageUrl: string }
  | { suite: string; imageUrl: string }
  | null;

export type FieldMapMosaicProps = {
  cells: FieldMapMosaicCell[];
  rows: number;
  cols: number;
  field: string;
};

// Real (issue #56 follow-up) - a second, additive cell shape alongside the
// original { realization, imageUrl }: one cell per suite instead of one
// per consecutive realization, same fixed-realization-vary-suite idea
// Compare mode's own suite axis uses. The realization variant's own shape/
// rendering is completely unchanged below.
function cellTag(cell: NonNullable<FieldMapMosaicCell>): string {
  return 'suite' in cell ? cell.suite : String(cell.realization);
}

function MosaicCell({ cell, field }: { cell: FieldMapMosaicCell; field: string }) {
  const [imageError, setImageError] = useState(false);

  if (!cell) {
    return (
      <div className="field-map-mosaic__cell field-map-mosaic__cell--empty">
        <p className="field-map-mosaic__no-data">No data</p>
      </div>
    );
  }

  const tag = cellTag(cell);
  return (
    <div className="field-map-mosaic__cell">
      {imageError ? (
        <p className="field-map-mosaic__no-data">Couldn't load</p>
      ) : (
        <img
          className="field-map-mosaic__image"
          src={cell.imageUrl}
          alt={'suite' in cell ? `${field} 2D map, ${cell.suite}` : `${field} 2D map, realization ${cell.realization}`}
          onError={() => setImageError(true)}
        />
      )}
      <span className="field-map-mosaic__realization-tag">{tag}</span>
    </div>
  );
}

/** Real (added 2026-08-06, ticket #12 - grouped 2D field maps). Renders an
 * R×C mosaic of independent per-realization map images inside ONE tile -
 * genuinely distinct from the outer canvas's own multi-tile grid view
 * (`Viewer`'s `.viewer--grid`), which the user explicitly called out as a
 * different thing ("not the same as the outer canvas's own multi-tile
 * grid view"). Each cell is its own real, independent
 * `GET /field-map-2d/plot.png` fetch (`App.tsx`'s `loadFieldMap2DTile`
 * fires N of these in parallel via `Promise.all`, mirroring the same
 * parallel-fetch pattern Compare mode already uses for Power Spectrum/
 * Bispectrum/SFR History) - a missing/404 realization shows "No data" in
 * just that cell rather than failing the whole tile, the same
 * per-item-independent-failure handling Compare mode's own multi-
 * realization fetch already uses.
 *
 * Rendered via `PlotTile`'s `chart.kind: 'plotly-3d'` escape hatch
 * (`content: ReactNode`) rather than a new dedicated chart kind for a
 * grid of static images - the closest existing fit, since neither
 * `'plotly'` nor `'static-image'` assumes more than one image/series. */
export function FieldMapMosaic({ cells, rows, cols, field }: FieldMapMosaicProps) {
  return (
    <div
      className="field-map-mosaic"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {cells.map((cell, i) => <MosaicCell key={cell ? cellTag(cell) : `empty-${i}`} cell={cell} field={field} />)}
    </div>
  );
}
