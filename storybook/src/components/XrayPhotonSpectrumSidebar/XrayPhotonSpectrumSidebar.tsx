import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { SingleRealizationFieldsValue } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type XrayPhotonSpectrumParams = SingleRealizationFieldsValue;

export type XrayPhotonSpectrumSidebarProps = {
  params: XrayPhotonSpectrumParams;
  onChange: (params: XrayPhotonSpectrumParams) => void;
  onRemove: () => void;
};

/** X-ray Photon Spectrum's real per-tile sidebar (2026-08-07, issue #18) -
 * same shape as XrayHaloProfilesSidebar (Suite/Set/Realization only, no
 * Compare mode). This is a genuinely new statistic (app.py has no
 * precedent either way) reading the full raw SIMPUT photon-list product
 * directly, distinct from the small reduced CAMELS.Xray.hdf5 file X-ray
 * Halo Profiles reads. Set is restricted to LH/CV/EX
 * (`catalog.statistic_sets`) - 1P's real folder here uses legacy naming
 * this app doesn't resolve yet (see backend.py's own
 * PUBLIC_XRAY_SIMPUT_SETS comment). No halo picker yet - always shows the
 * most massive real halo in the realization, a real, deliberately
 * deferred follow-up (see issue #18). */
export function XrayPhotonSpectrumSidebar({ params, onChange, onRemove }: XrayPhotonSpectrumSidebarProps) {
  const catalog = useCatalogMetadata();

  return (
    <ParamsSidebar title="X-ray Photon Spectrum" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={onChange}
        allowedSuites={catalog?.statistic_suites['X-ray Photon Spectrum']}
        allowedSets={catalog?.statistic_sets['X-ray Photon Spectrum']}
      />
    </ParamsSidebar>
  );
}
