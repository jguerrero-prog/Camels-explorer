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

export async function fetchStellarMassFunction(params: {
  suite: string;
  setName: string;
  realization: number;
  snapnum: number;
  SMmin: number;
  SMmax: number;
  bins: number;
}): Promise<Result> {
  const qs = new URLSearchParams({
    suite: params.suite,
    set_name: params.setName,
    realization: String(params.realization),
    snapnum: String(params.snapnum),
    SMmin: String(params.SMmin),
    SMmax: String(params.SMmax),
    bins: String(params.bins),
    fetch_public: 'true',
  });
  const res = await fetch(`${API_BASE}/stellar-mass-function?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Deterministic URL for the real, server-rendered matplotlib PNG (see
 * backend.py's render_stellar_mass_function_png / PlotChart.mdx). Query
 * params are always added in the same order and `realizations` is joined
 * in array order (not sorted) - given the same params object, this always
 * returns the identical string, so passing it to an <img src> never causes
 * a spurious re-fetch from an incidentally-reordered query string. */
export function stellarMassFunctionImageUrl(params: {
  suite: string;
  setName: string;
  realizations: number[];
  snapnum: number;
  SMmin: number;
  SMmax: number;
  bins: number;
}): string {
  const qs = new URLSearchParams();
  qs.set('suite', params.suite);
  qs.set('set_name', params.setName);
  qs.set('snapnum', String(params.snapnum));
  qs.set('SMmin', String(params.SMmin));
  qs.set('SMmax', String(params.SMmax));
  qs.set('bins', String(params.bins));
  for (const realization of params.realizations) qs.append('realizations', String(realization));
  qs.set('fetch_public', 'true');
  return `${API_BASE}/stellar-mass-function/plot.png?${qs}`;
}

export type HaloCatalogRow = Record<string, number>;
export type HaloCatalog = {
  frame: HaloCatalogRow[];
  box_size: number;
  redshift: number;
  note: string;
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
  }));
}
