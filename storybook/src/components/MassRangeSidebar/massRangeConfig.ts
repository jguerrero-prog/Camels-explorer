/** Config table for the three statistics that share one real backend shape:
 * suite/set/realization/snapnum + a log-spaced mass range + bins, returning
 * backend.py's Result dataclass (see get_stellar_mass_function/
 * get_halo_mass_function/get_baryon_fraction's near-identical signatures).
 * A fourth field (`min`/`max`/`bins`) is a genuine parameterization of one
 * shape, not a config system trying to also cover Power Spectrum's grid/
 * MAS/threads/ptype or SFR History's z-range + symbolic-fit overlay - those
 * have real, different control surfaces and get their own components. */

export type MassRangeStatistic = 'Stellar Mass Function' | 'Halo Mass Function' | 'Baryon Fraction';

export type MassRangeConfig = {
  statistic: MassRangeStatistic;
  /** Matches backend.py's real API path exactly (see api/routers/statistics.py). */
  endpoint: string;
  /** Real backend.py query param names - SMmin/SMmax for Stellar Mass
   * Function, RMmin/RMmax (shared) for Halo Mass Function/Baryon Fraction. */
  minParam: 'SMmin' | 'RMmin';
  maxParam: 'SMmax' | 'RMmax';
  minLabel: string;
  maxLabel: string;
  defaultMin: number;
  defaultMax: number;
  minStep: number;
  maxStep: number;
  binsMin: number;
  binsMax: number;
  defaultBins: number;
  /** Result.log_y's real default for each statistic (app.py never sets
   * this to false for HMF/SMF, but Baryon Fraction's own get_baryon_fraction
   * explicitly passes log_y=False - a linear, not log, y-axis). */
  logY: boolean;
};

// Real defaults read directly from app.py's own per-statistic sidebar block
// (elif statistic == "..."), not invented.
export const MASS_RANGE_CONFIGS: Record<MassRangeStatistic, MassRangeConfig> = {
  'Stellar Mass Function': {
    statistic: 'Stellar Mass Function',
    endpoint: 'stellar-mass-function',
    minParam: 'SMmin',
    maxParam: 'SMmax',
    minLabel: 'Min stellar mass [Msun/h]',
    maxLabel: 'Max stellar mass [Msun/h]',
    defaultMin: 1e9,
    defaultMax: 5e11,
    minStep: 1e8,
    maxStep: 1e10,
    binsMin: 5,
    binsMax: 60,
    defaultBins: 10,
    logY: true,
  },
  'Halo Mass Function': {
    statistic: 'Halo Mass Function',
    endpoint: 'halo-mass-function',
    minParam: 'RMmin',
    maxParam: 'RMmax',
    minLabel: 'Min reduced mass [Msun/h]',
    maxLabel: 'Max reduced mass [Msun/h]',
    defaultMin: 1e10,
    defaultMax: 1e14,
    minStep: 1e9,
    maxStep: 1e13,
    binsMin: 5,
    binsMax: 60,
    defaultBins: 30,
    logY: true,
  },
  'Baryon Fraction': {
    statistic: 'Baryon Fraction',
    endpoint: 'baryon-fraction',
    minParam: 'RMmin',
    maxParam: 'RMmax',
    minLabel: 'Min reduced mass [Msun/h]',
    maxLabel: 'Max reduced mass [Msun/h]',
    defaultMin: 1e10,
    defaultMax: 1e14,
    minStep: 1e9,
    maxStep: 1e13,
    binsMin: 5,
    binsMax: 30,
    defaultBins: 15,
    logY: false,
  },
};

export const MASS_RANGE_STATISTICS = Object.keys(MASS_RANGE_CONFIGS) as MassRangeStatistic[];

export function isMassRangeStatistic(statistic: string): statistic is MassRangeStatistic {
  return statistic in MASS_RANGE_CONFIGS;
}
