import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Slider } from '../Slider/Slider';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type ParticleCloud3DParams = {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  maxParticles: number;
};

export type ParticleCloud3DSidebarProps = {
  params: ParticleCloud3DParams;
  onChange: (params: ParticleCloud3DParams) => void;
  onRemove: () => void;
};

const FALLBACK_N_SNAPSHOTS = 34;

/** 3D Particle Cloud's real per-tile sidebar, from app.py's own "3D
 * Particle Cloud" block - the simplest of the 3D sidebars, just a real
 * particle-count picker. See ParticleCloud3DSidebar.mdx. */
export function ParticleCloud3DSidebar({ params, onChange, onRemove }: ParticleCloud3DSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;

  return (
    <ParamsSidebar title="3D Particle Cloud" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['3D Particle Cloud']}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <OptionSlider
        label="Particles to show"
        options={[5_000, 20_000, 50_000, 100_000, 200_000]}
        value={params.maxParticles}
        onChange={(maxParticles) => onChange({ ...params, maxParticles })}
        formatValue={(v) => v.toLocaleString()}
      />
    </ParamsSidebar>
  );
}
