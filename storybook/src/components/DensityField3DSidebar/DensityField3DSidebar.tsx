import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Slider } from '../Slider/Slider';
import { Checkbox } from '../Checkbox/Checkbox';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';
import '../ParamsSidebar/ParamsSidebar.css';

export type DensityField3DParams = {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  field: string;
  grid: number;
  isoSurfaces: number;
  opacity: number;
  showVoids: boolean;
};

export type DensityField3DSidebarProps = {
  params: DensityField3DParams;
  onChange: (params: DensityField3DParams) => void;
  onRemove: () => void;
};

const FALLBACK_N_SNAPSHOTS = 34;
const FALLBACK_FIELDS = [{ key: 'Mtot', label: 'Total matter density' }];

/** 3D Density Field's real per-tile sidebar, from app.py's own "3D Density
 * Field" block. See DensityField3DSidebar.mdx. */
export function DensityField3DSidebar({ params, onChange, onRemove }: DensityField3DSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;
  const fields = catalog?.cmd_fields ?? FALLBACK_FIELDS;
  const fieldLabels = fields.map((f) => `${f.key} - ${f.label}`);
  const currentField = fields.find((f) => f.key === params.field);

  return (
    <ParamsSidebar title="3D Density Field" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['3D Density Field']}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <SelectField
        label="Field"
        value={currentField ? `${currentField.key} - ${currentField.label}` : params.field}
        options={fieldLabels}
        onChange={(label) => onChange({ ...params, field: label.split(' - ')[0] })}
      />
      <OptionSlider
        label="Grid resolution"
        options={[16, 32, 64, 128]}
        value={params.grid}
        onChange={(grid) => onChange({ ...params, grid })}
      />
      <Slider
        label="Iso-surfaces"
        min={4}
        max={25}
        value={params.isoSurfaces}
        onChange={(isoSurfaces) => onChange({ ...params, isoSurfaces })}
      />
      <Slider
        label="Opacity"
        min={0.02}
        max={0.3}
        step={0.01}
        value={params.opacity}
        onChange={(opacity) => onChange({ ...params, opacity })}
        formatValue={(v) => v.toFixed(2)}
      />

      <div className="params-sidebar__divider" />

      <Checkbox
        label="Overlay VIDE void catalog"
        checked={params.showVoids}
        onChange={(showVoids) => onChange({ ...params, showVoids })}
      />
    </ParamsSidebar>
  );
}
