import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Slider } from '../Slider/Slider';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type HaloGasProfilesParams = {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  field: string;
  /** 1-based rank by mass (1 = most massive) of the one halo drawn with
   * real Poisson error bars - matches app.py's own real
   * "Highlight halo (by mass rank, 1 = most massive)" slider. */
  highlightRank: number;
};

export type HaloGasProfilesSidebarProps = {
  params: HaloGasProfilesParams;
  onChange: (params: HaloGasProfilesParams) => void;
  onRemove: () => void;
  /** Real halo count in the currently-loaded tile - bounds the Highlight
   * halo slider (app.py's own `1, len(order), 1`). Data-dependent, not a
   * fixed config value, so the caller supplies it from the tile's own
   * fetched result (1 while still loading). */
  maxHighlightRank: number;
};

// Real fallback (backend.py's N_SNAPSHOTS) - used only until GET
// /api/metadata's own n_snapshots loads.
const FALLBACK_N_SNAPSHOTS = 34;
const FALLBACK_FIELDS = ['Gas Density', 'Thermal Pressure', 'Metallicity', 'Temperature'];

/** Halo Gas Profiles' real per-tile sidebar, from app.py's own "Halo Gas
 * Profiles" block. Reuses the shared Snapshot control (34-snapshot Pk/
 * SFRH schedule) since this product varies with it, unlike X-ray Halo
 * Profiles (fixed to one published snapshot). See
 * HaloGasProfilesSidebar.mdx. */
export function HaloGasProfilesSidebar({ params, onChange, onRemove, maxHighlightRank }: HaloGasProfilesSidebarProps) {
  const catalog = useCatalogMetadata();
  const fields = catalog?.profiles_fields ?? FALLBACK_FIELDS;
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;

  return (
    <ParamsSidebar title="Halo Gas Profiles" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['Halo Gas Profiles']}
        allowedSets={catalog?.statistic_sets['Halo Gas Profiles']}
      />
      <SelectField
        label="Field"
        value={params.field}
        options={fields}
        onChange={(field) => onChange({ ...params, field })}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <Slider
        label="Highlight halo (by mass rank, 1 = most massive)"
        min={1}
        max={Math.max(1, maxHighlightRank)}
        value={Math.min(params.highlightRank, Math.max(1, maxHighlightRank))}
        onChange={(highlightRank) => onChange({ ...params, highlightRank })}
      />
    </ParamsSidebar>
  );
}
