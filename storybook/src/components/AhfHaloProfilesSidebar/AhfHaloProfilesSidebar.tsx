import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Slider } from '../Slider/Slider';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { SingleRealizationFieldsValue } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type AhfHaloProfilesParams = SingleRealizationFieldsValue & {
  snapnum: number;
  /** 1-based rank by Mvir (1 = most massive) - the ONE halo whose real
   * radial profile is fetched/plotted. Unlike Halo Gas Profiles' own
   * `highlightRank` (a highlight drawn on top of every halo's profile),
   * AHF's real `.AHF_profiles` file has no shared radial grid across
   * halos - each halo's own real bin count varies - so there is no
   * "every halo, faintly" layer here at all, just this one halo. */
  haloRank: number;
};

export type AhfHaloProfilesSidebarProps = {
  params: AhfHaloProfilesParams;
  onChange: (params: AhfHaloProfilesParams) => void;
  onRemove: () => void;
  /** Real halo count in the currently-loaded tile - bounds the halo-rank
   * slider (1 while still loading), same data-dependent-prop pattern as
   * HaloGasProfilesSidebar's own `maxHighlightRank`. */
  maxHaloRank: number;
};

const FALLBACK_N_SNAPSHOTS = 34;

/** AHF Radial Profiles' real per-tile sidebar (2026-08-08, issue #25) - a
 * genuinely new statistic (app.py has no precedent either way), reading
 * AHF's own `.AHF_profiles` file (real DR1 paper Sec 3.2.2 product,
 * distinct from the illstack-based Halo Gas Profiles). Suite restricted to
 * `catalog.statistic_suites['AHF Radial Profiles']` (IllustrisTNG/SIMBA -
 * AHF's own already-established real coverage). Set restricted to LH only
 * for now - only LH_0 has been directly verified against the real
 * AHF_halos/AHF_profiles nbins join, see backend.py's own module comment. */
export function AhfHaloProfilesSidebar({ params, onChange, onRemove, maxHaloRank }: AhfHaloProfilesSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;

  return (
    <ParamsSidebar title="AHF Radial Profiles" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['AHF Radial Profiles']}
        allowedSets={catalog?.statistic_sets['AHF Radial Profiles']}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <Slider
        label="Halo (by Mvir rank, 1 = most massive)"
        min={1}
        max={Math.max(1, maxHaloRank)}
        value={Math.min(params.haloRank, Math.max(1, maxHaloRank))}
        onChange={(haloRank) => onChange({ ...params, haloRank })}
      />
    </ParamsSidebar>
  );
}
