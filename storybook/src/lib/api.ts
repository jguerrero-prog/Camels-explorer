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
    realization: number | string;
    snapnum: number;
    min: number;
    max: number;
    bins: number;
  },
): Promise<Result | null> {
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
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
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
    realizations: (number | string)[];
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
  realization: number | string;
  snapnum: number;
  grid: number;
  MAS: string;
  threads: number;
  ptype: number[];
  kRange: 'standard' | 'allk';
  rsdAxis: number | null;
  multipole: string;
}): Promise<Result | null> {
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
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function powerSpectrumImageUrl(params: {
  suite: string;
  setName: string;
  realizations: (number | string)[];
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
  realization: number | string;
  field: string;
  muIndex: number;
  kRange: 'lowk' | 'highk';
  rsdAxis: number | null;
  ell: number;
}): Promise<Result | null> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    field: params.field,
    mu_index: String(params.muIndex),
    k_range: params.kRange,
    ell: String(params.ell),
    fetch_public: 'true',
  });
  if (params.rsdAxis !== null) qs.set('rsd_axis', String(params.rsdAxis));
  const res = await fetch(`${API_BASE}/bispectrum?${qs}`);
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization - see api/deps.py's require()
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function bispectrumImageUrl(params: {
  suite: string;
  setName: string;
  realizations: (number | string)[];
  field: string;
  muIndex: number;
  kRange: 'lowk' | 'highk';
  rsdAxis: number | null;
  ell: number;
}): string {
  const qs = new URLSearchParams();
  qs.set('suite', params.suite);
  qs.set('set_name', params.setName);
  qs.set('field', params.field);
  qs.set('mu_index', String(params.muIndex));
  qs.set('k_range', params.kRange);
  qs.set('ell', String(params.ell));
  if (params.rsdAxis !== null) qs.set('rsd_axis', String(params.rsdAxis));
  for (const realization of params.realizations) qs.append('realizations', String(realization));
  qs.set('fetch_public', 'true');
  return `${API_BASE}/bispectrum/plot.png?${qs}`;
}

export async function fetchSFRHistory(params: {
  suite: string;
  setName: string;
  realization: number | string;
  zMin: number;
  zMax: number;
  bins: number;
}): Promise<Result | null> {
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
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function sfrHistoryImageUrl(params: {
  suite: string;
  setName: string;
  realizations: (number | string)[];
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

// Real-data-only, no synthetic fallback - both return the fetched
// note/halo-count only (the chart itself is the PNG, see
// xrayProfilesImageUrl/haloProfilesImageUrl), matching StaticImageChart's
// own real image-load error handling for the chart proper. `null` means
// exactly what api/deps.py's require() means server-side: no real data
// for this selection (a 404), not a network failure.
export type XrayProfilesMeta = { note: string; nHalos: number };

export async function fetchXrayProfilesMeta(params: {
  suite: string;
  setName: string;
  realization: number | string;
}): Promise<XrayProfilesMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/xray-profiles?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note, nHalos: data.log_mass.length };
}

export function xrayProfilesImageUrl(params: { suite: string; setName: string; realization: number | string }): string {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    fetch_public: 'true',
  });
  return `${API_BASE}/xray-profiles/plot.png?${qs}`;
}

export type HaloProfilesMeta = { note: string; nHalos: number };

export async function fetchHaloProfilesMeta(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  field: string;
}): Promise<HaloProfilesMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), field: params.field, fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/halo-profiles?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note, nHalos: data.log_mass.length };
}

export function haloProfilesImageUrl(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  field: string;
  highlightRank: number;
}): string {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), field: params.field,
    highlight_rank: String(params.highlightRank), fetch_public: 'true',
  });
  return `${API_BASE}/halo-profiles/plot.png?${qs}`;
}

export type ColorMassDiagramMeta = { note: string; nGalaxies: number };

export async function fetchColorMassDiagramMeta(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  band1: string;
  band2: string;
  spsModel: string;
  spectraType: string;
}): Promise<ColorMassDiagramMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), band1: params.band1, band2: params.band2,
    sps_model: params.spsModel, spectra_type: params.spectraType, fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/color-mass-diagram?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note, nGalaxies: data.color.length };
}

export function colorMassDiagramImageUrl(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  band1: string;
  band2: string;
  spsModel: string;
  spectraType: string;
}): string {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), band1: params.band1, band2: params.band2,
    sps_model: params.spsModel, spectra_type: params.spectraType, fetch_public: 'true',
  });
  return `${API_BASE}/color-mass-diagram/plot.png?${qs}`;
}

export type FieldPDFMeta = { note: string };

export async function fetchFieldPDFMeta(params: {
  suite: string;
  field: string;
  grid: number;
  redshift: number;
}): Promise<FieldPDFMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, field: params.field, grid: String(params.grid),
    redshift: String(params.redshift), fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/field-pdf?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note };
}

export function fieldPDFImageUrl(params: { suite: string; field: string; grid: number; redshift: number }): string {
  const qs = new URLSearchParams({
    suite: params.suite, field: params.field, grid: String(params.grid),
    redshift: String(params.redshift), fetch_public: 'true',
  });
  return `${API_BASE}/field-pdf/plot.png?${qs}`;
}

export type LymanAlphaSpectrumMeta = { note: string };

export async function fetchLymanAlphaSpectrumMeta(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  sightline: number;
}): Promise<LymanAlphaSpectrumMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), sightline: String(params.sightline), fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/lyman-alpha-spectrum?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note };
}

export function lymanAlphaSpectrumImageUrl(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  sightline: number;
}): string {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), sightline: String(params.sightline), fetch_public: 'true',
  });
  return `${API_BASE}/lyman-alpha-spectrum/plot.png?${qs}`;
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
  realization: number | string;
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
  if (res.status === 404) return null; // real gap: no halo catalog for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Real (added 2026-08-07, direct user request: wire in the alternate halo
 * finders) - backend.py's already-real `get_alt_halo_catalog()`/
 * `GET /halo-catalog/alt`, previously only wired into app.py's Streamlit
 * Catalog Browser tab. Same real `Catalog` shape as `fetchHaloCatalog`
 * above, just for a different finder's own real columns (AHF/Rockstar/
 * CAESAR/CAESAR Galaxies each have their own real schema - see App.tsx's
 * per-finder `ColumnDef` constants). */
export type AltHaloCatalog = HaloCatalog;

export async function fetchAltHaloCatalog(params: {
  finder: string;
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
}): Promise<AltHaloCatalog> {
  const qs = new URLSearchParams({
    finder: params.finder,
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    snapnum: String(params.snapnum),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/halo-catalog/alt?${qs}`);
  if (res.status === 404) return null; // real gap: no catalog from this finder for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Real (added 2026-08-07, direct user request: wire in SubLink/SubLink_gal
 * merger history and Rockstar Consistent Trees) - backend.py's already-real
 * `get_merger_history()`/`get_consistent_trees_history()`, previously only
 * reachable from app.py's own "Trace a subhalo's merger history" expander.
 * Same real `MergerHistory` dataclass shape either way - one real per-
 * snapshot mass/particle-count history along the main branch, root first. */
export type MergerHistory = {
  redshift: number[];
  mass: number[];
  subfind_id: number;
  num_particles: number[] | null;
  source: string;
  note: string;
} | null;

export async function fetchMergerHistory(params: {
  suite: string;
  setName: string;
  realization: number | string;
  subfindId: number;
  rootSnapnum: number;
  variant: 'SubLink' | 'SubLink_gal';
}): Promise<MergerHistory> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    subfind_id: String(params.subfindId),
    root_snapnum: String(params.rootSnapnum),
    variant: params.variant,
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/merger-history?${qs}`);
  if (res.status === 404) return null; // real gap: no tree entry for this SubfindID/root_snapnum
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchConsistentTreesHistory(params: {
  suite: string;
  setName: string;
  realization: number | string;
  haloId: number;
}): Promise<MergerHistory> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    halo_id: String(params.haloId),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/consistent-trees-history?${qs}`);
  if (res.status === 404) return null; // real gap: no tree entry for this halo id at the root snapshot
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Real (added 2026-08-07, direct user request: wire in CAMELS-SAM) -
 * backend.py's already-real `get_sam_catalog()`/`GET /sam-catalog`,
 * previously only reachable from app.py's own "CAMELS-SAM" tab. Same real
 * `Catalog` shape as `fetchHaloCatalog` - hardcoded to the LH set (the
 * only one backend.py's `PUBLIC_SAM_SETS` covers), no suite param at all
 * (CAMELS-SAM isn't a hydro-suite product). */
export type SamCatalog = HaloCatalog;

export async function fetchSamCatalog(realization: number): Promise<SamCatalog> {
  const qs = new URLSearchParams({ set_name: 'LH', realization: String(realization), fetch_public: 'true' });
  const res = await fetch(`${API_BASE}/sam-catalog?${qs}`);
  if (res.status === 404) return null; // real gap: no SAM catalog for this realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Real (added 2026-08-07, direct user request: wire in black hole event
 * logs) - backend.py's already-real `get_blackhole_mergers()`/
 * `GET /blackhole-mergers`, a genuinely undocumented raw simulation-output
 * product (see backend.py's own PUBLIC_BLACKHOLE_MERGERS_SUITES comment
 * for the real evidence behind the column meaning). IllustrisTNG-only. */
export type BlackholeMergers = HaloCatalog;

export async function fetchBlackholeMergers(params: {
  suite: string;
  setName: string;
  realization: number | string;
}): Promise<BlackholeMergers> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/blackhole-mergers?${qs}`);
  if (res.status === 404) return null; // real gap: no merger events for this suite/set/realization
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

export type ScalingRelationsMeta = { note: string; source: string };

export async function fetchScalingRelationsMeta(params: {
  suite: string;
  setName: string;
  realization: number | string;
  SMmin: number;
  SMmax: number;
  bins: number;
  snapnum: number;
}): Promise<ScalingRelationsMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    SMmin: String(params.SMmin), SMmax: String(params.SMmax), bins: String(params.bins),
    snapnum: String(params.snapnum), fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/scaling-relations?${qs}`);
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note, source: data.source };
}

export function scalingRelationsImageUrl(params: {
  suite: string;
  setName: string;
  realization: number | string;
  SMmin: number;
  SMmax: number;
  bins: number;
  snapnum: number;
}): string {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    SMmin: String(params.SMmin), SMmax: String(params.SMmax), bins: String(params.bins),
    snapnum: String(params.snapnum), fetch_public: 'true',
  });
  return `${API_BASE}/scaling-relations/plot.png?${qs}`;
}

export type FieldMap2DMeta = { note: string; source: string };

export async function fetchFieldMap2DMeta(params: {
  suite: string;
  setName: string;
  realization: number | string;
  field: string;
}): Promise<FieldMap2DMeta | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    field: params.field, fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/field-map-2d?${qs}`);
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { note: data.note, source: data.source };
}

export function fieldMap2DImageUrl(params: {
  suite: string;
  setName: string;
  realization: number | string;
  field: string;
}): string {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    field: params.field, fetch_public: 'true',
  });
  return `${API_BASE}/field-map-2d/plot.png?${qs}`;
}

export type DensityField3D = {
  density: number[][][];
  box_size: number;
  source: string;
  note: string;
};

export async function fetchDensityField3D(params: {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  grid: number;
  field: string;
}): Promise<DensityField3D | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    snapnum: String(params.snapnum), grid: String(params.grid), field: params.field,
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/density-field-3d?${qs}`);
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type VoidCatalog = {
  positions: number[][];
  radius: number[];
  density_contrast: number[];
  box_size: number;
  extra: Record<string, number>[] | null;
  source: string;
  note: string;
};

export async function fetchVoidCatalog(params: {
  suite: string;
  setName: string;
  realization: number | string;
}): Promise<VoidCatalog | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/void-catalog?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // The API deliberately returns 200 + a literal `null` body (not a 404)
  // when there are no real voids for this selection - void catalog is an
  // optional overlay, not the tile's main content (see api/routers/
  // fields.py's void_catalog docstring). `null` propagates here as-is.
  return res.json();
}

export type ParticleCloud = {
  positions: number[][];
  box_size: number;
  source: string;
  note: string;
};

export async function fetchParticleCloud(params: {
  suite: string;
  setName: string;
  realization: number | string;
  maxParticles: number;
  snapnum: number;
}): Promise<ParticleCloud | null> {
  const qs = new URLSearchParams({
    suite: params.suite, set_name: params.setName, realization: String(params.realization),
    max_particles: String(params.maxParticles), snapnum: String(params.snapnum),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/particle-cloud?${qs}`);
  if (res.status === 404) return null; // real gap: no data for this suite/set/realization
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Custom tab (added 2026-08-05): real, live, cross-realization queries
// against Flatiron's own public FlatHUB API, proxied through
// api/routers/custom.py - genuinely different from every fetch above,
// which is always scoped to one suite/set/realization's own files. These
// three endpoints query the whole ~2.9B-row ensemble at once.

export type CustomFieldStats = {
  count?: number;
  min?: number;
  max?: number;
  avg?: number;
  /** Only present for enum fields (simulation_suite/simulation_set/type) -
   * real per-value counts, not used for slider bounds. */
  terms?: { value: number | boolean; count: number }[];
  others?: number;
};

export type CustomField = {
  name: string;
  title: string;
  descr?: string;
  type: string;
  dtype: string;
  units?: string;
  enum?: string[];
  required?: boolean;
  stats?: CustomFieldStats;
};

/** Real fetch for GET /api/custom/fields - every queryable field for the
 * live FlatHUB catalog, with real min/max/avg stats where available.
 * Powers CustomTab/CustomSidebar's field pickers and slider bounds -
 * nothing here is invented (see api/routers/custom.py's own docstring). */
export async function fetchCustomFields(): Promise<CustomField[]> {
  const res = await fetch(`${API_BASE}/custom/fields`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Real, un-flattened field metadata (GET /api/custom/field-tree) - the
 * same fields `fetchCustomFields` returns, but with FlatHUB's own real
 * nesting preserved (`sub`) instead of flattened to leaf-only. A node with
 * `sub` is a browsable group (params, Group, Subhalo, and nested groups
 * like Group_CM/Group_MassType within them); a node without `sub` is a
 * real, addable leaf field - its `name` is already the fully-qualified
 * leaf name (`Group_CM_x`, `params_Omega_m`, etc.), not re-prefixed
 * client-side. Powers CustomFilterTree's "+ Add" browsing UI - a flat
 * list can't represent that a field belongs to a group without inventing
 * grouping logic the live schema already gives for free. */
export type CustomFieldTreeNode = {
  name: string;
  title: string;
  descr?: string;
  units?: string;
  stats?: CustomFieldStats;
  sub?: CustomFieldTreeNode[];
};

export async function fetchCustomFieldTree(): Promise<CustomFieldTreeNode[]> {
  const res = await fetch(`${API_BASE}/custom/field-tree`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** A field the user has added as a filter (see CustomFilterTree) only
 * actually constrains a query once a real min/max has been set away from
 * the field's full live-stats range - matching the field-tree's own
 * "Nothing is pre-selected" behavior. That real value-setting only
 * happens in CustomSidebar (see CustomFilterValues) - so a field can be
 * "added" (present in CustomSelection.activeFilterFields) with no entry
 * here at all, meaning unconstrained/full-range, not yet "enabled". */
export type CustomParamRange = { min: number; max: number };

/** The filterable subset of CustomSelection (see CustomFieldsForm.tsx) -
 * shared between the row-count preview and the real Scatterplot data
 * fetch so both build the exact same filters object from the exact same
 * fields, and between CustomTab (creation) and CustomSidebar
 * (post-creation edit). */
export type CustomFilterSelection = {
  type: string;
  suite: string;
  set: string;
  paramFilters: Record<string, CustomParamRange>;
};

export type CustomFilters = Record<string, string | { gte: number; lte: number }>;

/** Real field name -> value/range, exactly the shape GET /api/custom/count
 * and /custom/data both take. A field is omitted entirely (not just set to
 * its full stats range) whenever it's unconstrained - "Any" suite/set, or
 * a field that's been added to the Filters tree but never actually had a
 * range dragged in CustomFilterValues (no `paramFilters` entry at all) -
 * confirmed live: omitting entirely is a legal "no filter" (both endpoints
 * 200 with the full ~2.9B-row count when filters={}), and it sidesteps
 * float32 stats bounds (e.g. Omega_m's real min is 0.10000000149011612)
 * silently clipping edge rows a naive "gte: stats.min" would introduce. */
export function buildCustomFilters(selection: CustomFilterSelection): CustomFilters {
  const filters: CustomFilters = {};
  if (selection.type) filters.type = selection.type;
  if (selection.suite) filters.simulation_suite = selection.suite;
  if (selection.set) filters.simulation_set = selection.set;
  for (const [field, range] of Object.entries(selection.paramFilters)) {
    filters[field] = { gte: range.min, lte: range.max };
  }
  return filters;
}

/** Real row count matching `filters` - FlatHUB's own UI shows this same
 * "Filtered to N out of 2,927,443,277 total rows" preview, so a user isn't
 * surprised by how many rows a filter combination matches before adding
 * the tile. Real 502 (not 404) on a live FlatHUB query failure - see
 * api/routers/custom.py's custom_count - propagated as a thrown Error,
 * not a `null`, since there's no "this selection legitimately has zero
 * data" case here the way there is for per-realization file fetches. */
export async function fetchCustomCount(filters: CustomFilters): Promise<number> {
  const qs = new URLSearchParams({ filters: JSON.stringify(filters) });
  const res = await fetch(`${API_BASE}/custom/count?${qs}`);
  if (!res.ok) throw new Error(`Row-count query failed: HTTP ${res.status}`);
  return res.json();
}

/** Real matching rows (only the requested fields, only for rows where
 * they're present - see api/routers/custom.py's custom_data docstring).
 * Powers Scatterplot - raw rows, not pre-binned buckets. */
export async function fetchCustomData(
  fields: string[],
  filters: CustomFilters,
  limit = 2000,
): Promise<Record<string, number>[]> {
  const qs = new URLSearchParams({
    fields: fields.join(','),
    filters: JSON.stringify(filters),
    limit: String(limit),
  });
  const res = await fetch(`${API_BASE}/custom/data?${qs}`);
  if (!res.ok) throw new Error(`Row-data query failed: HTTP ${res.status}`);
  return res.json();
}

/** One real bucketing request field - matches api/routers/custom.py's
 * `custom_histogram`/FlatHUB's own HistogramField schema exactly. */
export type CustomHistogramField = { field: string; size: number; log: boolean };

/** One real bucket - `key` has one entry per requested `fields` (one for
 * Histogram, two for Heatmap: [xEdge, yEdge]). `quartiles`, when the
 * `/histogram` request included a `quartiles` field name, is that field's
 * real [min, q1, median, q3, max] five-number summary for rows falling in
 * this bucket - confirmed directly against a live response, not assumed
 * from docs (see this file's own dev notes / Table 1 row 91's box-plot
 * scoping). */
export type CustomHistogramBucket = { key: number[]; count: number; quartiles?: number[] };

export type CustomHistogramResponse = { sizes: number[]; buckets: CustomHistogramBucket[] };

/** Real pre-binned data - powers Histogram (one field), Heatmap (two
 * fields - FlatHUB's histogram natively supports N-D binning), and Box
 * Plot (one bucketing field + `quartiles` naming the field to summarize)
 * - see api/routers/custom.py's custom_histogram docstring. */
export async function fetchCustomHistogram(
  fields: CustomHistogramField[],
  filters: CustomFilters,
  quartiles?: string,
): Promise<CustomHistogramResponse> {
  const qs = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
  });
  if (quartiles) qs.set('quartiles', quartiles);
  const res = await fetch(`${API_BASE}/custom/histogram?${qs}`);
  if (!res.ok) throw new Error(`Histogram query failed: HTTP ${res.status}`);
  return res.json();
}
