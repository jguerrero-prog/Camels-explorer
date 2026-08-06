import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { Slider } from '../Slider/Slider';
import { Button } from '../Button/Button';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type LymanAlphaSpectrumParams = {
  suite: string;
  setName: string;
  realization: number | string;
  snapnum: number;
  sightline: number;
};

export type LymanAlphaSpectrumSidebarProps = {
  params: LymanAlphaSpectrumParams;
  onChange: (params: LymanAlphaSpectrumParams) => void;
  onRemove: () => void;
};

// Real fallbacks (backend.py's N_SNAPSHOTS/LYA_N_SIGHTLINES) - used only
// until GET /api/metadata loads.
const FALLBACK_N_SNAPSHOTS = 34;
const FALLBACK_N_SIGHTLINES = 5000;

/** Lyman-alpha Spectrum's real per-tile sidebar, from app.py's own
 * "Lyman-alpha Spectrum" block. Real-data only, no synthetic fallback -
 * see LymanAlphaSpectrumSidebar.mdx. */
export function LymanAlphaSpectrumSidebar({ params, onChange, onRemove }: LymanAlphaSpectrumSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;
  const nSightlines = catalog?.lya_n_sightlines ?? FALLBACK_N_SIGHTLINES;

  return (
    <ParamsSidebar title="Lyman-alpha Spectrum" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SingleRealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['Lyman-alpha Spectrum']}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <Slider
        label="Sightline"
        min={0}
        max={nSightlines - 1}
        value={params.sightline}
        onChange={(sightline) => onChange({ ...params, sightline })}
      />
    </ParamsSidebar>
  );
}
