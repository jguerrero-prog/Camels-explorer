import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { SingleRealizationFieldsValue } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type SpreadMetricParams = SingleRealizationFieldsValue;

export type SpreadMetricSidebarProps = {
  params: SpreadMetricParams;
  onChange: (params: SpreadMetricParams) => void;
  onRemove: () => void;
};

/** Spread Metric's real per-tile sidebar (2026-08-08, issue #30) - a
 * genuinely new statistic (app.py has no precedent either way), same
 * simple shape as XrayHaloProfilesSidebar (Suite/Set/Realization only,
 * no Compare mode). Set coverage is real but genuinely different PER
 * SUITE (SIMBA: LH/CV; Astrid: LH/CV/1P) - `allowedSetsForSuite` (not the
 * flat `allowedSets` every other statistic uses) expresses this.
 * `onepScheme="legacy"` for Astrid's real 1P folders (no "p", 6 params,
 * 11 variations - same convention as Halo Gas Profiles, issue #26).
 * IllustrisTNG has no real LH/CV here at all (genuinely empty by design,
 * confirmed against the paper's own methods) and its real SB28 coverage
 * is deliberately deferred (see backend.py's own module comment) - both
 * are why IllustrisTNG isn't offered as a Suite option at all, not a
 * silently-empty tile. */
export function SpreadMetricSidebar({ params, onChange, onRemove }: SpreadMetricSidebarProps) {
  const catalog = useCatalogMetadata();

  return (
    <ParamsSidebar title="Spread Metric" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={onChange}
        allowedSuites={catalog?.statistic_suites['Spread Metric']}
        allowedSetsForSuite={catalog?.statistic_sets_for_suite['Spread Metric']}
        onepScheme="legacy"
      />
    </ParamsSidebar>
  );
}
