import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type ICParticlesParams = {
  suite: string;
  setName: string;
  realization: number | string;
  maxParticles: number;
};

export type ICParticlesSidebarProps = {
  params: ICParticlesParams;
  onChange: (params: ICParticlesParams) => void;
  onRemove: () => void;
};

// Real (backend.py's PUBLIC_SIMS_SUITES) - the 3 hydro suites whose ICs are
// real Gadget Format I (confirmed via camels.readthedocs.io's own
// snapshots page) - Swift-EAGLE's ICs use a different native format, same
// reason its raw snapshots are excluded elsewhere in this app.
const IC_SUITES = ['IllustrisTNG', 'SIMBA', 'Astrid'];

// N_IC_FILES real per-realization files (see App.tsx's loadICParticlesTile/
// streamRemainingICFiles) - "Particles to show" is a TOTAL budget split
// evenly across all of them, not a per-file cap.

/** Initial Conditions' real per-tile sidebar (added 2026-08-07, direct
 * user request) - no Snapshot slider, unlike every other 3D statistic:
 * ICs are always z=127 by definition (the redshift 2LPT generates them
 * at), not a function of the sidebar's own snapshot schedule. See
 * ICParticlesSidebar.mdx. */
export function ICParticlesSidebar({ params, onChange, onRemove }: ICParticlesSidebarProps) {
  const catalog = useCatalogMetadata();

  return (
    <ParamsSidebar title="Initial Conditions" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={IC_SUITES}
      />
      <OptionSlider
        label="Particles to show (total, across all 47 files)"
        options={[5_000, 20_000, 50_000, 100_000]}
        value={params.maxParticles}
        onChange={(maxParticles) => onChange({ ...params, maxParticles })}
        formatValue={(v) => v.toLocaleString()}
      />
    </ParamsSidebar>
  );
}
