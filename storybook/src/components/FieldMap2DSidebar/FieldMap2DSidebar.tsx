import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Button } from '../Button/Button';
import { Radio } from '../Radio/Radio';
import { MultiSelect } from '../MultiSelect/MultiSelect';
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
  /** Real (issue #56 follow-up) - the mosaic's second, additive axis: one
   * cell per suite instead of per consecutive realization, fixing
   * realization/set/field the same way Compare mode's own suite axis does.
   * `null`/omitted/empty = today's unchanged behavior. Mutually exclusive
   * with `groupSize` in practice - the sidebar's own "Group by" toggle
   * clears the other when switching, and `loadFieldMap2DTile` checks this
   * first. */
  suiteGroup?: string[] | null;
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
  const suiteGroup = params.suiteGroup ?? [];
  const groupBySuite = suiteGroup.length > 0;
  const suiteOptions = catalog?.suites ?? [params.suite];

  return (
    <ParamsSidebar title="2D Field Map" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange(isOnep || v.setName === '1P' ? { ...params, ...v, groupSize: null, suiteGroup: null } : { ...params, ...v })}
      />
      <SelectField
        label="Field"
        value={currentField ? `${currentField.key} - ${currentField.label}` : params.field}
        options={fieldLabels}
        onChange={(label) => onChange({ ...params, field: label.split(' - ')[0] })}
      />
      {!isOnep && (
        <>
          <Radio
            label="Group by"
            value={groupBySuite ? 'Suites' : 'Realizations'}
            options={['Realizations', 'Suites']}
            onChange={(label) => {
              if (label === 'Suites') {
                onChange({
                  ...params,
                  groupSize: null,
                  suiteGroup: suiteGroup.length > 0 ? suiteGroup : [params.suite],
                });
              } else {
                onChange({ ...params, suiteGroup: null });
              }
            }}
          />
          {groupBySuite ? (
            <MultiSelect
              label="Suites to compare"
              values={suiteGroup}
              onAdd={(v) => {
                if (suiteOptions.includes(v) && !suiteGroup.includes(v)) {
                  onChange({ ...params, suiteGroup: [...suiteGroup, v] });
                }
              }}
              onRemove={(v) => {
                const remaining = suiteGroup.filter((s) => s !== v);
                if (remaining.length > 0) onChange({ ...params, suiteGroup: remaining });
              }}
              placeholder="Add suite…"
              options={suiteOptions}
            />
          ) : (
            <FieldMapGroupControl
              value={params.groupSize ?? null}
              onChange={(groupSize) => onChange({ ...params, groupSize })}
              startRealization={Number(params.realization)}
            />
          )}
        </>
      )}
    </ParamsSidebar>
  );
}
