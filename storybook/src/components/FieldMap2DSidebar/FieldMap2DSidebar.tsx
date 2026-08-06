import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { FieldMapGroupControl } from '../FieldMapGroupControl/FieldMapGroupControl';
import type { GridSize } from '../GridSizePicker/GridSizePicker';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type FieldMap2DParams = {
  suite: string;
  setName: string;
  realization: number | string;
  field: string;
  /** Real (ticket #12, added 2026-08-06) - `null`/omitted = today's
   * unchanged single-map behavior. Only ever set when `realization` is a
   * plain number - see FieldMapGroupControl's own docs for why 1P (a
   * compound string id) has no real "next realization" to sequentially
   * fill a grid with. */
  groupSize?: GridSize | null;
};

export type FieldMap2DSidebarProps = {
  params: FieldMap2DParams;
  onChange: (params: FieldMap2DParams) => void;
  onRemove: () => void;
};

const FALLBACK_FIELDS = [{ key: 'Mtot', label: 'Total matter density' }];

/** 2D Field Map's real per-tile sidebar, from app.py's own "2D Field Map"
 * block - Field picker + (real addition, 2026-08-06, ticket #12) a
 * "Group view" control. No Snapshot control: CMD only publishes z=0.00
 * for 2D maps (unlike the 3D grids, which have 5 real redshifts), per
 * backend.py's own get_field_map_2d docstring - matches
 * XrayHaloProfilesSidebar's same reasoning for omitting a control with
 * nothing real to control. See FieldMap2DSidebar.mdx. */
export function FieldMap2DSidebar({ params, onChange, onRemove }: FieldMap2DSidebarProps) {
  const catalog = useCatalogMetadata();
  const fields = catalog?.cmd_fields ?? FALLBACK_FIELDS;
  const fieldLabels = fields.map((f) => `${f.key} - ${f.label}`);
  const currentField = fields.find((f) => f.key === params.field);
  const isOnep = params.setName === '1P';

  return (
    <ParamsSidebar title="2D Field Map" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange(isOnep || v.setName === '1P' ? { ...params, ...v, groupSize: null } : { ...params, ...v })}
      />
      <SelectField
        label="Field"
        value={currentField ? `${currentField.key} - ${currentField.label}` : params.field}
        options={fieldLabels}
        onChange={(label) => onChange({ ...params, field: label.split(' - ')[0] })}
      />
      {!isOnep && (
        <FieldMapGroupControl
          value={params.groupSize ?? null}
          onChange={(groupSize) => onChange({ ...params, groupSize })}
          startRealization={Number(params.realization)}
        />
      )}
    </ParamsSidebar>
  );
}
