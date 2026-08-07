import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Radio } from '../Radio/Radio';
import { Button } from '../Button/Button';
import { RealizationFields } from '../RealizationFields/RealizationFields';
import { RSD_LABELS } from '../PowerSpectrumSidebar/PowerSpectrumSidebar';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

// Real (added 2026-08-07, direct user request: wire in the HIPSTER-based
// high-k Bispectrum) - a genuinely separate product from the low-k FFT
// estimator, reporting Legendre multipoles instead of mu bins. Reuses
// PowerSpectrumSidebar's own RSD_LABELS/rsdAxisFromLabel rather than a
// second copy - same real "Real space (none)/Axis 0/1/2" choice, same
// backend.py rsd_axis param either statistic feeds it into.
const K_RANGE_LABELS = {
  lowk: 'Low-k (FFT-based)',
  highk: 'High-k (HIPSTER, Legendre multipoles)',
} as const;
const BK_HIGHK_ELLS = [0, 1, 2, 3, 4, 5];

export type BispectrumParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: (number | string)[];
  field: string;
  /** Index into GET /api/metadata's bispectrum.mu_values - matches
   * get_bispectrum's own real `mu_index` param directly (not the mu value
   * itself), so this never needs a lossy value->index round-trip. Only
   * meaningful when kRange is 'lowk' - the highk product has no mu axis
   * at all, it reports multipoles directly instead. */
  muIndex: number;
  kRange: 'lowk' | 'highk';
  rsdLabel: string;
  ell: number;
};

export type BispectrumSidebarProps = {
  params: BispectrumParams;
  onChange: (params: BispectrumParams) => void;
  onRemove: () => void;
};

// Real fallback values (BK_TYPES/BK_MU_VALUES/BK_EQUILATERAL_MU_INDEX in
// backend.py) - used only until GET /api/metadata's own bispectrum block
// loads, never a second source of truth once it has.
const FALLBACK_FIELDS = ['Total Matter', 'Gas', 'Dark Matter'];
const FALLBACK_MU_VALUES = [-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9];
const FALLBACK_EQUILATERAL_INDEX = 7;

/** Bispectrum's real per-tile sidebar, from app.py's own "Bispectrum" block
 * (elif statistic == "Bispectrum"). Real-data only - no synthetic
 * fallback (get_bispectrum returns None outright for suites/sets it
 * doesn't have, same as get_halo_catalog's own reasoning) - see
 * BispectrumSidebar.mdx. */
export function BispectrumSidebar({ params, onChange, onRemove }: BispectrumSidebarProps) {
  const catalog = useCatalogMetadata();
  const fields = catalog?.bispectrum.fields ?? FALLBACK_FIELDS;
  const muValues = catalog?.bispectrum.mu_values ?? FALLBACK_MU_VALUES;
  const equilateralIndex = catalog?.bispectrum.equilateral_mu_index ?? FALLBACK_EQUILATERAL_INDEX;
  const currentMu = muValues[params.muIndex] ?? muValues[equilateralIndex];

  return (
    <ParamsSidebar title="Bispectrum" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <RealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['Bispectrum']}
        allowedSets={catalog?.statistic_sets['Bispectrum']}
      />
      <SelectField
        label="Field"
        value={params.field}
        options={fields}
        onChange={(field) => onChange({ ...params, field })}
      />
      <Radio
        label="k range"
        value={K_RANGE_LABELS[params.kRange]}
        options={[K_RANGE_LABELS.lowk, K_RANGE_LABELS.highk]}
        onChange={(label) =>
          onChange({ ...params, kRange: label === K_RANGE_LABELS.highk ? 'highk' : 'lowk' })
        }
      />
      {params.kRange === 'lowk' ? (
        <OptionSlider
          label="Triangle shape (mu = cos angle between k1, k2)"
          options={muValues}
          value={currentMu}
          onChange={(mu) => onChange({ ...params, muIndex: muValues.indexOf(mu) })}
          formatValue={(mu) =>
            `${mu > 0 ? '+' : ''}${mu.toFixed(1)}${muValues.indexOf(mu) === equilateralIndex ? ' (equilateral)' : ''}`
          }
        />
      ) : (
        <>
          <SelectField
            label="Redshift-space distortion"
            value={params.rsdLabel}
            options={RSD_LABELS}
            onChange={(rsdLabel) => onChange({ ...params, rsdLabel })}
          />
          <Radio
            label="Legendre multipole (ell)"
            value={String(params.ell)}
            options={BK_HIGHK_ELLS.map(String)}
            onChange={(ell) => onChange({ ...params, ell: Number(ell) })}
          />
        </>
      )}
    </ParamsSidebar>
  );
}
