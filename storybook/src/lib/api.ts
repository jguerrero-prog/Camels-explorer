/** Real fetch helpers for the API server (api/main.py, port 8010) - shared
 * by App.tsx's tile-focus wiring. Dev-only base URL, same as
 * AddPlotModal/CuratedTab.tsx's own API_BASE - revisit before packaging. */
const API_BASE = 'http://localhost:8010/api';

export type Result = {
  x: number[];
  y: number[];
  x_label: string;
  y_label: string;
  log_x: boolean;
  log_y: boolean;
  source: string;
  note: string;
};

/** Real fetch for any of the three "mass range" statistics (Stellar Mass
 * Function, Halo Mass Function, Baryon Fraction) - see
 * MassRangeSidebar/massRangeConfig.ts. `config` supplies the real endpoint
 * path and mass-param names (SMmin/SMmax vs. RMmin/RMmax), which are the
 * only real differences in these three statistics' backend.py signatures. */
export async function fetchMassRangeResult(
  config: { endpoint: string; minParam: string; maxParam: string },
  params: {
    suite: string;
    setName: string;
    realization: number;
    snapnum: number;
    min: number;
    max: number;
    bins: number;
  },
): Promise<Result> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    snapnum: String(params.snapnum),
    bins: String(params.bins),
    fetch_public: 'true',
  });
  qs.set(config.minParam, String(params.min));
  qs.set(config.maxParam, String(params.max));
  const res = await fetch(`${API_BASE}/${config.endpoint}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Deterministic URL for the real, server-rendered matplotlib PNG (see
 * backend.py's _render_mass_range_png / PlotChart.mdx). Query params are
 * always added in the same order and `realizations` is joined in array
 * order (not sorted) - given the same params object, this always returns
 * the identical string, so passing it to an <img src> never causes a
 * spurious re-fetch from an incidentally-reordered query string. */
export function massRangeImageUrl(
  config: { endpoint: string; minParam: string; maxParam: string },
  params: {
    suite: string;
    setName: string;
    realizations: number[];
    snapnum: number;
    min: number;
    max: number;
    bins: number;
  },
): string {
  const qs = new URLSearchParams();
  qs.set('suite', params.suite);
  qs.set('set_name', params.setName);
  qs.set('snapnum', String(params.snapnum));
  qs.set(config.minParam, String(params.min));
  qs.set(config.maxParam, String(params.max));
  qs.set('bins', String(params.bins));
  for (const realization of params.realizations) qs.append('realizations', String(realization));
  qs.set('fetch_public', 'true');
  return `${API_BASE}/${config.endpoint}/plot.png?${qs}`;
}

export type HaloCatalogRow = Record<string, number>;
export type HaloCatalog = {
  frame: HaloCatalogRow[];
  box_size: number;
  redshift: number;
  note: string;
  // frame's columns + every other real column this file has - backend.py's
  // Catalog.raw_frame, None when unavailable (matches get_halo_catalog's
  // own real None case, not a separate failure mode).
  raw_frame: HaloCatalogRow[] | null;
} | null;

export async function fetchHaloCatalog(params: {
  suite: string;
  setName: string;
  realization: number;
  snapnum: number;
}): Promise<HaloCatalog> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    snapnum: String(params.snapnum),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/halo-catalog?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Maps get_halo_catalog()'s real column names (backend.py) to
 * UnderlyingHalos's HaloRow shape. */
export function toHaloRows(catalog: HaloCatalog) {
  if (!catalog) return [];
  return catalog.frame.map((row) => ({
    subfindId: row['SubfindID'],
    stellarMass: row['Stellar Mass [Msun/h]'],
    gasMass: row['Gas Mass [Msun/h]'],
    dmMass: row['DM Mass [Msun/h]'],
    bhMass: row['BH Mass [Msun/h]'],
    sfr: row['SFR [Msun/yr]'],
    vmax: row['Vmax [km/s]'],
    stellarMetallicity: row['Stellar Metallicity'],
  }));
}
