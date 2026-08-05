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

export async function fetchPowerSpectrum(params: {
  suite: string;
  setName: string;
  realization: number;
  snapnum: number;
  grid: number;
  MAS: string;
  threads: number;
  ptype: number[];
  kRange: 'standard' | 'allk';
  rsdAxis: number | null;
  multipole: string;
}): Promise<Result> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    snapnum: String(params.snapnum),
    grid: String(params.grid),
    MAS: params.MAS,
    threads: String(params.threads),
    k_range: params.kRange,
    multipole: params.multipole,
    fetch_public: 'true',
  });
  for (const p of params.ptype) qs.append('ptype', String(p));
  if (params.rsdAxis !== null) qs.set('rsd_axis', String(params.rsdAxis));
  const res = await fetch(`${API_BASE}/power-spectrum?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function powerSpectrumImageUrl(params: {
  suite: string;
  setName: string;
  realizations: number[];
  snapnum: number;
  grid: number;
  MAS: string;
  threads: number;
  ptype: number[];
  kRange: 'standard' | 'allk';
  rsdAxis: number | null;
  multipole: string;
  showLinearPk: boolean;
}): string {
  const qs = new URLSearchParams();
  qs.set('suite', params.suite);
  qs.set('set_name', params.setName);
  qs.set('snapnum', String(params.snapnum));
  qs.set('grid', String(params.grid));
  qs.set('MAS', params.MAS);
  qs.set('threads', String(params.threads));
  for (const p of params.ptype) qs.append('ptype', String(p));
  qs.set('k_range', params.kRange);
  qs.set('multipole', params.multipole);
  if (params.rsdAxis !== null) qs.set('rsd_axis', String(params.rsdAxis));
  qs.set('show_linear_pk', String(params.showLinearPk));
  for (const realization of params.realizations) qs.append('realizations', String(realization));
  qs.set('fetch_public', 'true');
  return `${API_BASE}/power-spectrum/plot.png?${qs}`;
}

export async function fetchBispectrum(params: {
  suite: string;
  setName: string;
  realization: number;
  field: string;
  muIndex: number;
}): Promise<Result | null> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    field: params.field,
    mu_index: String(params.muIndex),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/bispectrum?${qs}`);
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization - see api/deps.py's require()
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function bispectrumImageUrl(params: {
  suite: string;
  setName: string;
  realizations: number[];
  field: string;
  muIndex: number;
}): string {
  const qs = new URLSearchParams();
  qs.set('suite', params.suite);
  qs.set('set_name', params.setName);
  qs.set('field', params.field);
  qs.set('mu_index', String(params.muIndex));
  for (const realization of params.realizations) qs.append('realizations', String(realization));
  qs.set('fetch_public', 'true');
  return `${API_BASE}/bispectrum/plot.png?${qs}`;
}

export async function fetchSFRHistory(params: {
  suite: string;
  setName: string;
  realization: number;
  zMin: number;
  zMax: number;
  bins: number;
}): Promise<Result> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    z_min: String(params.zMin),
    z_max: String(params.zMax),
    bins: String(params.bins),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/sfr-history?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function sfrHistoryImageUrl(params: {
  suite: string;
  setName: string;
  realizations: number[];
  zMin: number;
  zMax: number;
  bins: number;
  showSymbolicFit: boolean;
  Om: number;
  s8: number;
  A1: number;
  A3: number;
}): string {
  const qs = new URLSearchParams();
  qs.set('suite', params.suite);
  qs.set('set_name', params.setName);
  qs.set('z_min', String(params.zMin));
  qs.set('z_max', String(params.zMax));
  qs.set('bins', String(params.bins));
  qs.set('show_symbolic_fit', String(params.showSymbolicFit));
  if (params.showSymbolicFit) {
    qs.set('Om', String(params.Om));
    qs.set('s8', String(params.s8));
    qs.set('A1', String(params.A1));
    qs.set('A3', String(params.A3));
  }
  for (const realization of params.realizations) qs.append('realizations', String(realization));
  qs.set('fetch_public', 'true');
  return `${API_BASE}/sfr-history/plot.png?${qs}`;
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
