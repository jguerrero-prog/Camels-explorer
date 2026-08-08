import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { SingleRealizationFieldsValue } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type GroupMatchingParams = SingleRealizationFieldsValue;

export type GroupMatchingSidebarProps = {
  params: GroupMatchingParams;
  onChange: (params: GroupMatchingParams) => void;
  onRemove: () => void;
};

/** Group Matching's real per-tile sidebar (2026-08-08, issue #29) - a
 * genuinely new statistic (app.py has no precedent either way), same
 * simple shape as BlackholeMergersSidebar/XrayHaloProfilesSidebar (Suite/
 * Set/Realization only, no Compare mode). Suite restricted to
 * `catalog.statistic_suites['Group Matching']` (IllustrisTNG/SIMBA/Astrid -
 * real, confirmed via a direct directory listing that Swift-EAGLE has no
 * Group_matching data at all). Set restricted to `catalog.statistic_sets`'s
 * own LH-only entry for this statistic - CV (cross-suite, same ICs at a
 * fixed realization) and 1P (its own real folder-naming shim) are real but
 * deliberately deferred, see backend.py's own module comment. */
export function GroupMatchingSidebar({ params, onChange, onRemove }: GroupMatchingSidebarProps) {
  const catalog = useCatalogMetadata();

  return (
    <ParamsSidebar title="Group Matching" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={onChange}
        allowedSuites={catalog?.statistic_suites['Group Matching']}
        allowedSets={catalog?.statistic_sets['Group Matching']}
      />
    </ParamsSidebar>
  );
}
