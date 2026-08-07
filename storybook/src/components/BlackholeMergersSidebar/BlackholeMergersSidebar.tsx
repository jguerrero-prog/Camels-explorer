import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { SingleRealizationFieldsValue } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type BlackholeMergersParams = SingleRealizationFieldsValue;

export type BlackholeMergersSidebarProps = {
  params: BlackholeMergersParams;
  onChange: (params: BlackholeMergersParams) => void;
  onRemove: () => void;
};

/** Black Hole Mergers' real per-tile sidebar (added 2026-08-07, direct user
 * request) - the simplest real control surface in this app, same shape as
 * X-ray Halo Profiles'. Real-data only, no synthetic fallback -
 * get_blackhole_mergers() returns None outright when unavailable. Suite
 * hardcoded to IllustrisTNG-only, matching PowerSpectrumSidebar's own
 * PTYPE_OPTIONS precedent (a small, stable, real-confirmed set mirrored
 * directly rather than round-tripped through GET /api/metadata, which
 * doesn't know about this statistic at all - see AddPlotModal/CuratedTab.tsx). */
export function BlackholeMergersSidebar({ params, onChange, onRemove }: BlackholeMergersSidebarProps) {
  const catalog = useCatalogMetadata();
  return (
    <ParamsSidebar title="Black Hole Mergers" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={onChange}
        allowedSuites={['IllustrisTNG']}
      />
    </ParamsSidebar>
  );
}
