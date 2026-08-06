import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Slider } from '../Slider/Slider';
import { Radio } from '../Radio/Radio';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type ColorMassDiagramParams = {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  spsModel: string;
  spectraType: string;
  filterFamily: string;
  band1: string;
  band2: string;
};

export type ColorMassDiagramSidebarProps = {
  params: ColorMassDiagramParams;
  onChange: (params: ColorMassDiagramParams) => void;
  onRemove: () => void;
};

// Real fallbacks (backend.py's PHOTOMETRY_* / N_SNAPSHOTS) - used only
// until GET /api/metadata loads.
const FALLBACK_N_SNAPSHOTS = 34;
const FALLBACK_SPS_MODELS = ['BC03', 'BPASS'];
const FALLBACK_SPECTRA_TYPES = ['attenuated', 'intrinsic'];
const FALLBACK_FILTER_GROUPS: Record<string, string[]> = {
  SLOAN: ['SDSS.u', 'SDSS.g', 'SDSS.r', 'SDSS.i', 'SDSS.z'],
};

/** Color-Mass Diagram's real per-tile sidebar, from app.py's own "Color-
 * Mass Diagram" block. Real-data only, no synthetic fallback - see
 * ColorMassDiagramSidebar.mdx. */
export function ColorMassDiagramSidebar({ params, onChange, onRemove }: ColorMassDiagramSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;
  const spsModels = catalog?.photometry.sps_models ?? FALLBACK_SPS_MODELS;
  const spectraTypes = catalog?.photometry.spectra_types ?? FALLBACK_SPECTRA_TYPES;
  const filterGroups = catalog?.photometry.filter_groups ?? FALLBACK_FILTER_GROUPS;
  const familyBands = filterGroups[params.filterFamily] ?? Object.values(filterGroups)[0] ?? [];

  return (
    <ParamsSidebar title="Color-Mass Diagram" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <SelectField
        label="SPS model"
        value={params.spsModel}
        options={spsModels}
        onChange={(spsModel) => onChange({ ...params, spsModel })}
      />
      <Radio
        label="Spectra"
        value={params.spectraType}
        options={spectraTypes}
        onChange={(spectraType) => onChange({ ...params, spectraType })}
      />
      <SelectField
        label="Filter family"
        value={params.filterFamily}
        options={Object.keys(filterGroups)}
        onChange={(filterFamily) => {
          const bands = filterGroups[filterFamily] ?? [];
          onChange({ ...params, filterFamily, band1: bands[0] ?? '', band2: bands[Math.min(2, bands.length - 1)] ?? '' });
        }}
      />
      <SelectField
        label="Band 1"
        value={params.band1}
        options={familyBands}
        onChange={(band1) => onChange({ ...params, band1 })}
      />
      <SelectField
        label="Band 2"
        value={params.band2}
        options={familyBands}
        onChange={(band2) => onChange({ ...params, band2 })}
      />
    </ParamsSidebar>
  );
}
