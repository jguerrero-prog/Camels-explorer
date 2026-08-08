import { useEffect, useState } from 'react';
import { API_BASE } from './api';

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
  // Real parameter NAMES for the *legacy* 1P scheme (issue #51's own
  // follow-up investigation - see LEGACY_ONEP_PARAM_COUNT's own comment
  // below for the evidence), keyed by suite since the 4 astrophysical
  // params' own letter prefix differs by suite (A_/B_/C_). Names, not
  // real per-variation values - no output file gives those directly for
  // this scheme.
  legacy_onep_param_names: Record<string, string[]>;
  // Per-statistic real suite/set coverage, keyed by the exact name in
  // `statistics` - see RealizationFields/SingleRealizationFields's own
  // allowedSuites/allowedSets props. A statistic missing from either map
  // has no real restriction narrower than "every suite"/"every set".
  statistic_suites: Record<string, string[]>;
  statistic_sets: Record<string, string[]>;
  // Real per-suite SET coverage (2026-08-08, issue #30) - for statistics
  // whose real set coverage genuinely differs BY SUITE (Spread Metric:
  // SIMBA has no real 1P here, Astrid does), which statistic_sets' one
  // flat list can't express. A statistic missing here has no such per-
  // suite variation. See SingleRealizationFields' own allowedSetsForSuite
  // prop, which reads this.
  statistic_sets_for_suite: Record<string, Record<string, string[]>>;
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

// Real LEGACY 1P folder-naming scheme (2026-08-08, issue #26) - a SEPARATE
// real convention from ONEP_VARIATION_SUFFIX/onepRealizationId above: no
// "p" prefix, 6 params (not 28), 11 variations -5..5 (not 5). Confirmed via
// direct fetches across both suites this scheme is real for (IllustrisTNG,
// SIMBA) - all 66 real param x variation folders exist for each, no gaps.
// Used by Halo Gas Profiles (this app's first real caller) and X-ray
// Halo Profiles (issue #51 - the same real flat-index formula, confirmed
// by comparing real max-halo-mass per index between both products) -
// AHF/Lyman-alpha would need the same scheme if ever wired for 1P (see
// backend.py's own PUBLIC_PROFILES_SETS comment), not built here.
//
// The 6 params' own real NAMES (Omega_m, sigma_8, then 4 suite-prefixed
// astrophysical feedback knobs) were identified 2026-08-08 (issue #51's
// own follow-up) via a real max-halo-mass spread test across all 6 -
// params 1-2 show a huge/moderate spread (cosmological: changes the DM
// halo mass function), params 3-6 show ~zero spread (astrophysical:
// can't) - cross-checked against the modern scheme's own Parameters file
// column order and Lau et al. 2025 (arXiv:2412.04559, Table 1)'s real "2
// cosmological + 4 astrophysical" convention. See catalog.legacy_onep_
// param_names (backend.py's own LEGACY_ONEP_PARAM_NAMES).
export const LEGACY_ONEP_VARIATIONS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
export const LEGACY_ONEP_PARAM_COUNT = 6;

export function legacyOnepRealizationId(paramIndex: number, variation: number): string {
  return `${paramIndex}_${variation < 0 ? `n${-variation}` : variation}`;
}

/** Parses a legacy 1P realization id (e.g. "3_n2") back into {paramIndex,
 * variation} - same reasoning as parseOnepRealizationId. Returns `null`
 * for anything that isn't a real legacy 1P id (no "p" prefix here, unlike
 * the modern scheme, so this only ever matches legacy ids). */
export function parseLegacyOnepRealizationId(id: string): { paramIndex: number; variation: number } | null {
  const m = /^(\d+)_(n?\d+)$/.exec(id);
  if (!m) return null;
  const variation = m[2].startsWith('n') ? -Number(m[2].slice(1)) : Number(m[2]);
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
