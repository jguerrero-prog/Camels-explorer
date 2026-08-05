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

export type UnderlyingHalosProps = {
  rows: HaloRow[];
  /** backend.py's Catalog.raw_frame - curated columns + every other real
   * column this file has, same row order as `rows`. null when unavailable
   * (see get_halo_catalog's own real None case) - the "Show all available
   * fields" checkbox is disabled rather than hidden in that case, same
   * pattern as app.py's own real Catalog Browser tab. */
  rawRows?: Record<string, number>[] | null;
  defaultExpanded?: boolean;
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

type AnyRow = Record<string, unknown>;

type ColumnDef = {
  key: string;
  label: string;
  width: number;
  format: (row: AnyRow) => string;
};

// Real column names/units match backend.py's get_halo_catalog() exactly
// (Stellar Metallicity has no bracketed unit there either - dimensionless).
const CURATED_COLUMNS: ColumnDef[] = [
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

export function UnderlyingHalos({ rows, rawRows, defaultExpanded = false }: UnderlyingHalosProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const maxStellarMass = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.stellarMass), 0),
    [rows],
  );
  const [minStellarMass, setMinStellarMass] = useState(0);
  const [showAllFields, setShowAllFields] = useState(false);
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
  // frame + extra columns) - filtering by position keeps the mass filter
  // consistent whichever set of columns is currently displayed.
  const massMask = useMemo(() => rows.map((r) => r.stellarMass >= minStellarMass), [rows, minStellarMass]);
  const filteredCurated = useMemo(() => rows.filter((_, i) => massMask[i]), [rows, massMask]);
  const filteredRaw = useMemo(
    () => (rawRows ? rawRows.filter((_, i) => massMask[i]) : null),
    [rawRows, massMask],
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
  const allColumns = usingRaw ? rawColumns : CURATED_COLUMNS;
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
    link.download = 'halos.csv';
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
        <span className="underlying-halos__label">View underlying halos</span>
        <span className="underlying-halos__count">{filteredCurated.length.toLocaleString()} halos</span>
      </button>

      {expanded && (
        <div className="underlying-halos__reveal">
          <Checkbox
            label="Show all available fields (raw)"
            checked={showAllFields}
            onChange={setShowAllFields}
            disabled={!rawRows}
          />

          <div className="underlying-halos__controls">
            <Slider
              label="Minimum stellar mass"
              min={0}
              max={maxStellarMass}
              value={minStellarMass}
              onChange={setMinStellarMass}
              formatValue={formatMass}
            />
            <button type="button" className="underlying-halos__add-finder" disabled>
              + Add a halo finder
            </button>
          </div>

          {renderTable()}

          <div className="underlying-halos__footer">
            <span className="underlying-halos__remaining">
              Showing {activeRows.length.toLocaleString()} of {rows.length.toLocaleString()} halos/subhalos
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

      {fullscreen &&
        createPortal(
          <div className="underlying-halos__fullscreen">
            <div className="underlying-halos__fullscreen-header">
              <span className="underlying-halos__label">View underlying halos</span>
              <button type="button" className="underlying-halos__fullscreen-close" onClick={() => setFullscreen(false)} aria-label="Exit fullscreen">
                ×
              </button>
            </div>
            <div className="underlying-halos__fullscreen-body">{renderTable()}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
