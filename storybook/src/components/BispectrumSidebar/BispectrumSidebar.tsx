import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Button } from '../Button/Button';
import { RealizationFields } from '../RealizationFields/RealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type BispectrumParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: (number | string)[];
  field: string;
  /** Index into GET /api/metadata's bispectrum.mu_values - matches
   * get_bispectrum's own real `mu_index` param directly (not the mu value
   * itself), so this never needs a lossy value->index round-trip. */
  muIndex: number;
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
      <OptionSlider
        label="Triangle shape (mu = cos angle between k1, k2)"
        options={muValues}
        value={currentMu}
        onChange={(mu) => onChange({ ...params, muIndex: muValues.indexOf(mu) })}
        formatValue={(mu) =>
          `${mu > 0 ? '+' : ''}${mu.toFixed(1)}${muValues.indexOf(mu) === equilateralIndex ? ' (equilateral)' : ''}`
        }
      />
    </ParamsSidebar>
  );
}
