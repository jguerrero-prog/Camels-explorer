import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { SingleRealizationFieldsValue } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type XrayHaloProfilesParams = SingleRealizationFieldsValue;

export type XrayHaloProfilesSidebarProps = {
  params: XrayHaloProfilesParams;
  onChange: (params: XrayHaloProfilesParams) => void;
  onRemove: () => void;
};

/** X-ray Halo Profiles' real per-tile sidebar - the simplest in this app.
 * app.py's own "X-ray Halo Profiles" block has no dedicated sidebar
 * params at all beyond the shared Suite/Set/Realization (one of
 * SINGLE_REALIZATION_STATISTICS, so no Compare mode either). Real-data
 * only, no synthetic fallback - get_xray_profiles returns None outright
 * for suites/sets without this product (IllustrisTNG/SIMBA only). */
export function XrayHaloProfilesSidebar({ params, onChange, onRemove }: XrayHaloProfilesSidebarProps) {
  const catalog = useCatalogMetadata();

  return (
    <ParamsSidebar title="X-ray Halo Profiles">
      <SingleRealizationFields catalog={catalog} value={params} onChange={onChange} />
      <Button variant="secondary" onClick={onRemove}>Remove plot</Button>
    </ParamsSidebar>
  );
}
