import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Slider } from '../Slider/Slider';
import { Checkbox } from '../Checkbox/Checkbox';
import chevronIcon from './assets/chevron.svg';
import './UnderlyingHalos.css';

export type HaloRow = {
  subfindId: number;
  stellarMass: number;
  gasMass: number;
  dmMass: number;
  bhMass: number;
  sfr: number;
  vmax: number;
  stellarMetallicity: number;
};

/** Real (added 2026-08-07, direct user request: "recycle the underlying
 * halos table" for the VIDE void catalog "to keep components consistent"
 * rather than build a bespoke second table). Column shape is now the
 * caller's concern - this component no longer hardcodes a halo-specific
 * row/column shape internally. */
export type AnyRow = Record<string, unknown>;
export type ColumnDef = {
  key: string;
  label: string;
  width: number;
  format: (row: AnyRow) => string;
};

export type UnderlyingHalosProps = {
  rows: AnyRow[];
  /** backend.py's Catalog.raw_frame - curated columns + every other real
   * column this file has, same row order as `rows`. null when unavailable
   * (see get_halo_catalog's own real None case) - the "Show all available
   * fields" checkbox is disabled rather than hidden in that case, same
   * pattern as app.py's own real Catalog Browser tab. Real only for per-
   * halo catalogs - the VIDE void catalog has no second, deeper field set
   * behind its real fetch (`app.py`'s own void table just shows every
   * column it has, always), so its caller omits this too. */
  rawRows?: Record<string, number>[] | null;
  /** Which columns to render - defaults to the real per-halo column set
   * (`HALO_COLUMNS`) every existing caller already relied on implicitly. */
  columns?: ColumnDef[];
  /** Real disclosure shown above the table when the statistic feeding this
   * tile doesn't plot the same quantity any column here represents (e.g.
   * Halo Mass Function/Baryon Fraction bin by FoF group mass, which this
   * per-subhalo catalog has no column for at all) - see PlotTile.tsx's
   * `haloMassContextNote`. Omitted for Stellar Mass Function, whose own
   * Stellar Mass column IS what's plotted. */
  massContextNote?: string;
  /** Real numeric filter slider, keyed by one of `columns`' own field keys
   * - defaults to the original "Minimum stellar mass" filter every
   * existing per-halo caller relied on. `app.py`'s own real VIDE void
   * table has no filter at all (voids number in the dozens/hundreds, not
   * thousands) - its caller passes `null` to omit the slider rather than
   * fabricate a filter Streamlit itself doesn't have. */
  filter?: { key: string; label: string; format: (v: number) => string } | null;
  /** Real wording, defaulting to the exact strings every existing per-halo
   * caller already showed (zero behavior change for those callers). The
   * VIDE void catalog caller overrides these to match `app.py`'s own real
   * "Void catalog fields (VIDE)" wording/file naming instead. */
  label?: string;
  itemNoun?: string;
  footerNoun?: string;
  csvFilename?: string;
  /** Real (wired 2026-08-07, direct user request - this replaces what used
   * to be a permanently-disabled "+ Add a halo finder" placeholder button).
   * `backend.py`'s `get_alt_halo_catalog()`/`GET /halo-catalog/alt` already
   * real for AHF/Rockstar/CAESAR/CAESAR Galaxies - this renders a real
   * dropdown (reusing the same portal `Dropdown` the column kebab/eye menus
   * use) switching which finder's catalog `rows`/`columns` show. The fetch
   * itself is the caller's job (`App.tsx`'s `handleSelectHaloFinder`) - this
   * component still never fetches on its own, only `onSelect` + `current`/
   * `options`/`loading` to reflect state. `null`/omitted for catalogs with
   * no alternate-finder concept (the VIDE void catalog) - no button at all,
   * not a disabled one, since there's nothing to eventually wire up there. */
  finderPicker?: {
    current: string;
    options: string[];
    onSelect: (finder: string) => void;
    loading?: boolean;
  } | null;
  defaultExpanded?: boolean;
  /** Real fix (2026-08-06, direct user feedback): the fullscreen table
   * view had no indication of which tile/statistic it belonged to - just
   * a generic "View underlying halos" label. `PlotTile`'s own `title`
   * prop, threaded down one level, shown alongside that label only in the
   * fullscreen header (the collapsed inline disclosure already sits
   * directly under its own tile's title, so it doesn't need this - only
   * the fullscreen portal, which detaches from that visual context, does). */
  parentTitle?: string;
};

function formatMass(value: number) {
  return value.toExponential(2);
}

function formatRawValue(value: unknown) {
  if (typeof value !== 'number') return String(value);
  // Small integers (SubfindID, counts) read fine as plain digits; large
  // ones (a mass that happens to land on a whole number) still need
  // exponential notation - real catalog floats rarely round this cleanly,
  // but the threshold guards against it regardless.
  if (Number.isInteger(value) && Math.abs(value) < 1e4) return String(value);
  return Math.abs(value) >= 1e4 || (Math.abs(value) < 1e-3 && value !== 0) ? value.toExponential(2) : value.toFixed(3);
}

// Real column names/units match backend.py's get_halo_catalog() exactly
// (Stellar Metallicity has no bracketed unit there either - dimensionless).
// Exported so PlotTile.tsx's per-halo call sites can pass it explicitly
// as `columns` (the default value below also covers callers that don't).
export const HALO_COLUMNS: ColumnDef[] = [
  { key: 'subfindId', label: 'Subfind ID', width: 90, format: (r) => String(r.subfindId) },
  { key: 'stellarMass', label: 'Stellar Mass [Msun/h]', width: 130, format: (r) => formatMass(r.stellarMass as number) },
  { key: 'gasMass', label: 'Gas Mass [Msun/h]', width: 120, format: (r) => formatMass(r.gasMass as number) },
  { key: 'dmMass', label: 'DM Mass [Msun/h]', width: 110, format: (r) => formatMass(r.dmMass as number) },
  { key: 'bhMass', label: 'BH Mass [Msun/h]', width: 110, format: (r) => formatMass(r.bhMass as number) },
  { key: 'sfr', label: 'SFR [Msun/yr]', width: 100, format: (r) => (r.sfr as number).toFixed(2) },
  { key: 'vmax', label: 'Vmax [km/s]', width: 90, format: (r) => (r.vmax as number).toFixed(1) },
  { key: 'stellarMetallicity', label: 'Stellar Metallicity', width: 130, format: (r) => (r.stellarMetallicity as number).toFixed(4) },
];

function KebabIcon() {
  return (
    <svg width="4" height="14" viewBox="0 0 4 14" fill="none" aria-hidden="true">
      <circle cx="2" cy="2" r="1.5" fill="currentColor" />
      <circle cx="2" cy="7" r="1.5" fill="currentColor" />
      <circle cx="2" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 6V2H6M10 2H14V6M14 10V14H10M6 14H2V10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Real, portal-rendered dropdown (same clipping fix as SelectField/
 * MultiSelect - document.body + position:fixed from the trigger's actual
 * on-screen rect, since this table's own overflow-x:auto would otherwise
 * clip a nested-absolute menu). */
function Dropdown({ top, left, onClose, children }: { top: number; left: number; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.('.underlying-halos__dropdown')) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="underlying-halos__dropdown" style={{ position: 'fixed', top, left }}>
      {children}
    </div>,
    document.body,
  );
}

const DEFAULT_FILTER = { key: 'stellarMass', label: 'Minimum stellar mass', format: formatMass };

export function UnderlyingHalos({
  rows, rawRows, columns = HALO_COLUMNS, massContextNote,
  filter = DEFAULT_FILTER, label = 'View underlying halos', itemNoun = 'halos', footerNoun = 'halos/subhalos',
  csvFilename = 'halos.csv', finderPicker = null,
  defaultExpanded = false, parentTitle,
}: UnderlyingHalosProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const maxFilterValue = useMemo(
    () => (filter ? rows.reduce((max, row) => Math.max(max, Number(row[filter.key]) || 0), 0) : 0),
    [rows, filter],
  );
  const [filterValue, setFilterValue] = useState(0);
  const [showAllFields, setShowAllFields] = useState(false);
  const [finderMenu, setFinderMenu] = useState<{ top: number; left: number } | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [columnMenu, setColumnMenu] = useState<{ key: string; top: number; left: number } | null>(null);
  const [eyeMenu, setEyeMenu] = useState<{ top: number; left: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fullscreen]);

  // Same row order/index as `rows` (backend.py's raw_frame = concat of
  // frame + extra columns) - filtering by position keeps the filter
  // consistent whichever set of columns is currently displayed. No-op mask
  // (everything passes) when `filter` is omitted (the VIDE void catalog).
  const filterMask = useMemo(
    () => (filter ? rows.map((r) => Number(r[filter.key]) >= filterValue) : rows.map(() => true)),
    [rows, filter, filterValue],
  );
  const filteredCurated = useMemo(() => rows.filter((_, i) => filterMask[i]), [rows, filterMask]);
  const filteredRaw = useMemo(
    () => (rawRows ? rawRows.filter((_, i) => filterMask[i]) : null),
    [rawRows, filterMask],
  );

  const rawColumns: ColumnDef[] = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return Object.keys(rawRows[0]).map((key) => ({
      key,
      label: key,
      width: 130,
      format: (row: AnyRow) => formatRawValue(row[key]),
    }));
  }, [rawRows]);

  const usingRaw = showAllFields && filteredRaw !== null;
  const allColumns = usingRaw ? rawColumns : columns;
  const activeRows: AnyRow[] = usingRaw ? filteredRaw! : filteredCurated;

  const orderedColumns = useMemo(() => {
    const visible = allColumns.filter((c) => !hiddenKeys.has(c.key));
    const pinned = pinnedKeys
      .map((k) => visible.find((c) => c.key === k))
      .filter((c): c is ColumnDef => Boolean(c));
    const unpinned = visible.filter((c) => !pinnedKeys.includes(c.key));
    return { pinned, unpinned, all: [...pinned, ...unpinned] };
  }, [allColumns, hiddenKeys, pinnedKeys]);

  const pinnedOffsets = useMemo(() => {
    const map = new Map<string, number>();
    let offset = 0;
    for (const col of orderedColumns.pinned) {
      map.set(col.key, offset);
      offset += col.width;
    }
    return map;
  }, [orderedColumns.pinned]);

  // z-index is deliberately left to CSS (.underlying-halos__th/--pinned,
  // .underlying-halos__td--pinned) rather than set here - an inline value
  // would win over those classes and break the header-row-above-pinned-
  // column stacking order.
  function stickyStyle(col: ColumnDef): React.CSSProperties | undefined {
    if (!pinnedOffsets.has(col.key)) return undefined;
    return { position: 'sticky', left: pinnedOffsets.get(col.key), width: col.width };
  }

  function downloadCsv() {
    const header = orderedColumns.all.map((c) => c.label);
    const lines = [header.join(',')];
    for (const row of activeRows) {
      lines.push(orderedColumns.all.map((c) => c.format(row)).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = csvFilename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderTable() {
    return (
      <div className="underlying-halos__table-container">
        <div className="underlying-halos__table-toolbar">
          <button
            type="button"
            className="underlying-halos__toolbar-btn"
            aria-label="Show/hide columns"
            title="Show/hide columns"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setEyeMenu({ top: rect.bottom + 4, left: rect.right - 220 });
            }}
          >
            <EyeIcon />
          </button>
          <button
            type="button"
            className="underlying-halos__toolbar-btn"
            aria-label="View fullscreen"
            title="View fullscreen"
            onClick={() => setFullscreen((f) => !f)}
          >
            <ExpandIcon />
          </button>
        </div>
        <div className="underlying-halos__table-wrap">
          <table className="underlying-halos__table">
            <thead>
              <tr>
                {orderedColumns.all.map((col) => (
                  <th
                    key={col.key}
                    className={`underlying-halos__th ${pinnedOffsets.has(col.key) ? 'underlying-halos__th--pinned' : ''}`}
                    style={stickyStyle(col)}
                  >
                    <span className="underlying-halos__th-inner">
                      <span className="underlying-halos__th-label">{col.label}</span>
                      <button
                        type="button"
                        className="underlying-halos__kebab"
                        aria-label={`${col.label} column options`}
                        title={`${col.label} column options`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setColumnMenu({ key: col.key, top: rect.bottom + 4, left: rect.left });
                        }}
                      >
                        <KebabIcon />
                      </button>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, i) => (
                <tr key={i}>
                  {orderedColumns.all.map((col) => (
                    <td
                      key={col.key}
                      className={pinnedOffsets.has(col.key) ? 'underlying-halos__td--pinned' : undefined}
                      style={stickyStyle(col)}
                    >
                      {col.format(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="underlying-halos">
      <button
        type="button"
        className="underlying-halos__header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <img
          className="underlying-halos__chevron"
          src={chevronIcon}
          alt=""
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="underlying-halos__label">{label}</span>
        <span className="underlying-halos__count">{filteredCurated.length.toLocaleString()} {itemNoun}</span>
      </button>

      {expanded && (
        <div className="underlying-halos__reveal">
          {massContextNote && <p className="underlying-halos__context-note">{massContextNote}</p>}
          <Checkbox
            label="Show all available fields (raw)"
            checked={showAllFields}
            onChange={setShowAllFields}
            disabled={!rawRows}
          />

          <div className="underlying-halos__controls">
            {filter && (
              <Slider
                label={filter.label}
                min={0}
                max={maxFilterValue}
                value={filterValue}
                onChange={setFilterValue}
                formatValue={filter.format}
              />
            )}
            {finderPicker && (
              <button
                type="button"
                className="underlying-halos__add-finder"
                disabled={finderPicker.loading}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setFinderMenu({ top: rect.bottom + 4, left: rect.left });
                }}
              >
                {finderPicker.loading ? 'Loading…' : `Halo finder: ${finderPicker.current}`}
              </button>
            )}
          </div>

          {renderTable()}

          <div className="underlying-halos__footer">
            <span className="underlying-halos__remaining">
              Showing {activeRows.length.toLocaleString()} of {rows.length.toLocaleString()} {footerNoun}
            </span>
            <button type="button" className="underlying-halos__download" onClick={downloadCsv}>
              Download CSV
            </button>
          </div>
        </div>
      )}

      {columnMenu &&
        (() => {
          const col = allColumns.find((c) => c.key === columnMenu.key)!;
          const isPinned = pinnedKeys.includes(col.key);
          return (
            <Dropdown top={columnMenu.top} left={columnMenu.left} onClose={() => setColumnMenu(null)}>
              <button
                type="button"
                className="underlying-halos__dropdown-item"
                onClick={() => {
                  setPinnedKeys((prev) => (isPinned ? prev.filter((k) => k !== col.key) : [...prev, col.key]));
                  setColumnMenu(null);
                }}
              >
                {isPinned ? 'Unpin column' : 'Pin column'}
              </button>
              <button
                type="button"
                className="underlying-halos__dropdown-item"
                onClick={() => {
                  setHiddenKeys((prev) => new Set(prev).add(col.key));
                  setPinnedKeys((prev) => prev.filter((k) => k !== col.key));
                  setColumnMenu(null);
                }}
              >
                Hide column
              </button>
            </Dropdown>
          );
        })()}

      {eyeMenu && (
        <Dropdown top={eyeMenu.top} left={eyeMenu.left} onClose={() => setEyeMenu(null)}>
          {allColumns.map((col) => (
            <label className="underlying-halos__dropdown-checkbox" key={col.key}>
              <input
                type="checkbox"
                checked={!hiddenKeys.has(col.key)}
                onChange={(e) => {
                  setHiddenKeys((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.delete(col.key);
                    else next.add(col.key);
                    return next;
                  });
                  if (!e.target.checked) setPinnedKeys((prev) => prev.filter((k) => k !== col.key));
                }}
              />
              {col.label}
            </label>
          ))}
        </Dropdown>
      )}

      {finderMenu && finderPicker && (
        <Dropdown top={finderMenu.top} left={finderMenu.left} onClose={() => setFinderMenu(null)}>
          {finderPicker.options.map((option) => (
            <button
              key={option}
              type="button"
              className="underlying-halos__dropdown-item"
              onClick={() => {
                finderPicker.onSelect(option);
                setFinderMenu(null);
              }}
            >
              {option === finderPicker.current ? `✓ ${option}` : option}
            </button>
          ))}
        </Dropdown>
      )}

      {fullscreen &&
        createPortal(
          <div className="underlying-halos__fullscreen">
            <div className="underlying-halos__fullscreen-header">
              <div className="underlying-halos__fullscreen-header-left">
                <span className="underlying-halos__label">
                  {parentTitle && <span className="underlying-halos__fullscreen-parent-title">{parentTitle} — </span>}
                  {label}
                </span>
                <Checkbox
                  label="Show all available fields (raw)"
                  checked={showAllFields}
                  onChange={setShowAllFields}
                  disabled={!rawRows}
                />
              </div>
              <button type="button" className="underlying-halos__fullscreen-close" onClick={() => setFullscreen(false)} aria-label="Exit fullscreen" title="Exit fullscreen">
                ×
              </button>
            </div>
            {massContextNote && <p className="underlying-halos__context-note">{massContextNote}</p>}
            <div className="underlying-halos__fullscreen-body">{renderTable()}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
