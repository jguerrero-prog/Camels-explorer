import { useEffect, useState } from 'react';

// Dev-only, matches AddPlotModal/CuratedTab.tsx's own API_BASE.
const API_BASE = 'http://localhost:8010/api';

// `realizations` is `null` for SB - unlike every other set, its real
// realization count is per-suite, not one flat number (see
// `sb_realizations_for_suite` below).
export type CatalogSet = { name: string; label: string; realizations: number | null; description: string };
export type Catalog = {
  suites: string[];
  sets: CatalogSet[];
  // SB's real per-suite folder name differs (IllustrisTNG "SB28", Astrid
  // "SB7") - resolved server-side for any real fetch (api/deps.py's
  // resolved_set_name), but the frontend still needs this real per-suite
  // realization count to bound its own Realization control. A suite
  // missing here (SIMBA/Swift-EAGLE) has no real SB set at all.
  sb_realizations_for_suite: Record<string, number>;
  statistics: string[];
  n_snapshots: number;
  bispectrum: { fields: string[]; mu_values: number[]; equilateral_mu_index: number };
  cmd_fields: { key: string; label: string }[];
  default_cmd_field: string;
  profiles_fields: string[];
  photometry: {
    sps_models: string[];
    spectra_types: string[];
    filter_groups: Record<string, string[]>;
  };
  pdf_grids: number[];
  pdf_redshifts: number[];
  lya_n_sightlines: number;
  // 1P (One-Parameter-at-a-time) picker constants - see RealizationFields'
  // own comment for why 1P needs a parameter+variation picker instead of a
  // plain realization number. onep_tng_missing_variations keys are the
  // parameter index as a string (JSON object keys are always strings).
  onep_tng_params: { index: number; name: string; category: string }[];
  onep_max_index_for_suite: Record<string, number>;
  onep_tng_missing_variations: Record<string, number[]>;
  // Per-statistic real suite/set coverage, keyed by the exact name in
  // `statistics` - see RealizationFields/SingleRealizationFields's own
  // allowedSuites/allowedSets props. A statistic missing from either map
  // has no real restriction narrower than "every suite"/"every set".
  statistic_suites: Record<string, string[]>;
  statistic_sets: Record<string, string[]>;
  sfrh_symbolic_model: {
    fiducial: { Om: number; s8: number; A1: number; A3: number };
    om_range: [number, number];
    s8_range: [number, number];
    a1_range: [number, number];
    a3_range: [number, number];
  };
};

/** Real realization count for a suite/set pair, or `null` if unknown/
 * unsupported. Every set except SB has one flat count (`CatalogSet.
 * realizations`); SB's is per-suite (`sb_realizations_for_suite`), and a
 * suite missing from that map has no real SB set at all - `null` there
 * too, not a guessed fallback, so callers can show an honest "not
 * published for this suite" message instead of a fabricated bound. */
export function realizationCountFor(catalog: Catalog | null, setName: string, suite: string): number | null {
  if (setName === 'SB') return catalog?.sb_realizations_for_suite[suite] ?? null;
  return catalog?.sets.find((s) => s.name === setName)?.realizations ?? null;
}

/** Shared `GET /api/metadata` fetch - was duplicated identically inside
 * MassRangeSidebar and about to be duplicated 3 more times for
 * PowerSpectrumSidebar/BispectrumSidebar/SFRHistorySidebar, so extracted
 * once real usage went from 1 to 4. Every per-statistic sidebar's own
 * Suite/Set fields are built from this same real catalog. */
export function useCatalogMetadata(): Catalog | null {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/metadata`)
      .then((res) => res.json())
      .then((data: Catalog) => !cancelled && setCatalog(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}

// Real 1P folder-naming scheme (mirrors backend.py's ONEP_VARIATION_SUFFIX/
// onep_realization_id exactly - real public 1P folders are named
// "1P_p{index}_{variation}", not "1P_{realization}" like every other set).
const ONEP_VARIATION_SUFFIX: Record<number, string> = { [-2]: 'n2', [-1]: 'n1', 0: '0', 1: '1', 2: '2' };
const ONEP_SUFFIX_TO_VARIATION: Record<string, number> = { n2: -2, n1: -1, '0': 0, '1': 1, '2': 2 };

export function onepRealizationId(paramIndex: number, variation: number): string {
  return `p${paramIndex}_${ONEP_VARIATION_SUFFIX[variation]}`;
}

/** Parses a 1P realization id (e.g. "p11_2") back into {paramIndex,
 * variation} - needed because RealizationFieldsValue/SingleRealizationFieldsValue
 * only store the combined string (same shape as any other realization), not
 * separate param/variation fields, so the picker has to recover its own
 * selection from it (e.g. after a suite/set change round-trips through
 * `onChange`). Returns `null` for anything that isn't a real 1P id. */
export function parseOnepRealizationId(id: string): { paramIndex: number; variation: number } | null {
  const m = /^p(\d+)_(n?\d+)$/.exec(id);
  if (!m) return null;
  const variation = ONEP_SUFFIX_TO_VARIATION[m[2]];
  if (variation === undefined) return null;
  return { paramIndex: Number(m[1]), variation };
}

/** Real value fetch for `GET /api/onep-param-value` - the "real value:
 * Omega_m = 0.301"-style caption below the 1P Variation slider (app.py's
 * own version prefixes this with 🟢, its real/synthetic-data indicator -
 * dropped here since this frontend has no synthetic-data path for this
 * specific value: it's either read from a real output file or not shown
 * at all, never a fabricated stand-in). Only IllustrisTNG's parameters are
 * directly readable this way (see backend.py's ONEP_TNG_PARAMS);
 * `enabled=false` skips the fetch entirely rather than requesting a value
 * that's never shown. */
export function useOnepParamValue(
  suite: string, paramIndex: number, variation: number, enabled: boolean,
): number | null {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(null);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({
      suite, param_index: String(paramIndex), variation: String(variation),
    });
    fetch(`${API_BASE}/onep-param-value?${qs}`)
      .then((res) => res.json())
      .then((data: { value: number | null }) => !cancelled && setValue(data.value))
      .catch(() => !cancelled && setValue(null));
    return () => {
      cancelled = true;
    };
  }, [suite, paramIndex, variation, enabled]);

  return value;
}
