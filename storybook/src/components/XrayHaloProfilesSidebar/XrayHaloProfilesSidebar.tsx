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

/** X-ray Halo Profiles' real per-tile sidebar. app.py's own "X-ray Halo
 * Profiles" block has no dedicated sidebar params at all beyond the shared
 * Suite/Set/Realization (one of SINGLE_REALIZATION_STATISTICS, so no
 * Compare mode either). Real-data only, no synthetic fallback -
 * get_xray_profiles returns None outright for suites/sets without this
 * product (IllustrisTNG/SIMBA only).
 *
 * 1P and EX joined LH/CV 2026-08-08 (issue #51) - the real collated file
 * backing this product has its own flat "1P_0".."1P_65"/"EX_0".."EX_3"
 * keys (confirmed via a direct listing), a different real convention from
 * every other 1P-aware statistic's param+variation folder naming, and
 * with no independently-confirmed mapping back to a specific parameter or
 * variation - `onepScheme="flat"` shows the real flat index as a plain
 * Realization number instead of guessing a param+variation split.
 * `allowedSetsForSuite` reflects a real, suite-specific asymmetry: SIMBA's
 * own file has zero real EX entries (not a fetch gap - see backend.py's
 * own PUBLIC_XRAY_PROFILES_SETS comment). */
export function XrayHaloProfilesSidebar({ params, onChange, onRemove }: XrayHaloProfilesSidebarProps) {
  const catalog = useCatalogMetadata();

  return (
    <ParamsSidebar title="X-ray Halo Profiles" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={onChange}
        allowedSuites={catalog?.statistic_suites['X-ray Halo Profiles']}
        allowedSetsForSuite={catalog?.statistic_sets_for_suite['X-ray Halo Profiles']}
        onepScheme="flat"
      />
    </ParamsSidebar>
  );
}
