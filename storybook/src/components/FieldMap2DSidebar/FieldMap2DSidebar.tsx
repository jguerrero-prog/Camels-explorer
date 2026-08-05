import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type FieldMap2DParams = {
  suite: string;
  setName: string;
  realization: number;
  field: string;
};

export type FieldMap2DSidebarProps = {
  params: FieldMap2DParams;
  onChange: (params: FieldMap2DParams) => void;
  onRemove: () => void;
};

const FALLBACK_FIELDS = [{ key: 'Mtot', label: 'Total matter density' }];

/** 2D Field Map's real per-tile sidebar, from app.py's own "2D Field Map"
 * block - just a Field picker. No Snapshot control: CMD only publishes
 * z=0.00 for 2D maps (unlike the 3D grids, which have 5 real redshifts),
 * per backend.py's own get_field_map_2d docstring - matches
 * XrayHaloProfilesSidebar's same reasoning for omitting a control with
 * nothing real to control. See FieldMap2DSidebar.mdx. */
export function FieldMap2DSidebar({ params, onChange, onRemove }: FieldMap2DSidebarProps) {
  const catalog = useCatalogMetadata();
  const fields = catalog?.cmd_fields ?? FALLBACK_FIELDS;
  const fieldLabels = fields.map((f) => `${f.key} - ${f.label}`);
  const currentField = fields.find((f) => f.key === params.field);

  return (
    <ParamsSidebar title="2D Field Map">
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
      />
      <SelectField
        label="Field"
        value={currentField ? `${currentField.key} - ${currentField.label}` : params.field}
        options={fieldLabels}
        onChange={(label) => onChange({ ...params, field: label.split(' - ')[0] })}
      />
      <Button variant="secondary" onClick={onRemove}>Remove plot</Button>
    </ParamsSidebar>
  );
}
