import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Slider } from '../Slider/Slider';
import { Radio } from '../Radio/Radio';
import { Checkbox } from '../Checkbox/Checkbox';
import { Button } from '../Button/Button';
import { RealizationFields } from '../RealizationFields/RealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

// Real, fixed mapping (app.py's own `ptype_label` -> `ptype` dict, not
// expected to drift - a UI-label convenience, not backend.py state).
export const PTYPE_OPTIONS: Record<string, number[]> = {
  'Gas [0]': [0],
  'DM [1]': [1],
  'Stars [4]': [4],
  'Black holes [5]': [5],
  'Total [0,1,4]': [0, 1, 4],
};
const PTYPE_LABELS = Object.keys(PTYPE_OPTIONS);
const MAS_OPTIONS = ['NGP', 'CIC', 'TSC', 'PCS'];
const K_RANGE_LABELS = {
  standard: 'Standard (k ≤ ~25 h/Mpc)',
  allk: 'All-k (HIPSTER, up to k~1000 h/Mpc)',
} as const;
export const RSD_LABELS = ['Real space (none)', 'Axis 0', 'Axis 1', 'Axis 2'];

// Real fallback (backend.py's N_SNAPSHOTS) - used only until GET
// /api/metadata loads.
const FALLBACK_N_SNAPSHOTS = 34;

/** Derives get_power_spectrum's real `rsd_axis` param (`null` or `0|1|2`)
 * from the sidebar's own label - shared with App.tsx so the request-
 * building logic lives in exactly one place. */
export function rsdAxisFromLabel(label: string): number | null {
  const i = RSD_LABELS.indexOf(label);
  return i > 0 ? i - 1 : null;
}

export type PowerSpectrumParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: (number | string)[];
  compareAxis?: 'realization' | 'suite';
  compareSuites?: string[];
  snapnum: number;
  grid: number;
  MAS: string;
  threads: number;
  ptypeLabel: string;
  kRange: 'standard' | 'allk';
  rsdLabel: string;
  multipole: 'P0' | 'P2' | 'P4';
  showLinearPk: boolean;
};

export type PowerSpectrumSidebarProps = {
  params: PowerSpectrumParams;
  onChange: (params: PowerSpectrumParams) => void;
  onRemove: () => void;
};

/** Power Spectrum's real per-tile sidebar - the most complex control
 * surface of any statistic in this app, from app.py's own "Power Spectrum"
 * block (the only one with two conditionally-revealed sub-sections: the
 * All-k RSD axis picker, and that picker's own Multipole radio nested one
 * level deeper). `allowedSuites` (added 2026-08-07, issue #15) widens past
 * the default 4 suites - a matter power spectrum is real and physically
 * meaningful for the 4 DM-only "_DM" suites too, unlike the baryon-
 * dependent statistics that stay at 4 (see MassRangeSidebar's own note).
 * See PowerSpectrumSidebar.mdx. */
export function PowerSpectrumSidebar({ params, onChange, onRemove }: PowerSpectrumSidebarProps) {
  const catalog = useCatalogMetadata();
  const nSnapshots = catalog?.n_snapshots ?? FALLBACK_N_SNAPSHOTS;
  const rsdAxis = rsdAxisFromLabel(params.rsdLabel);

  return (
    <ParamsSidebar title="Power Spectrum" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <RealizationFields
        catalog={catalog}
        value={params}
        onChange={(v) => onChange({ ...params, ...v })}
        allowedSuites={catalog?.statistic_suites['Power Spectrum']}
      />
      <Slider
        label="Snapshot"
        min={0}
        max={nSnapshots - 1}
        value={params.snapnum}
        onChange={(snapnum) => onChange({ ...params, snapnum })}
      />
      <OptionSlider
        label="Grid size"
        options={[128, 256, 512, 1024]}
        value={params.grid}
        onChange={(grid) => onChange({ ...params, grid })}
      />
      <SelectField
        label="Mass Assignment Scheme"
        value={params.MAS}
        options={MAS_OPTIONS}
        onChange={(MAS) => onChange({ ...params, MAS })}
        caption="Not wired yet - only affects computing Pk from a raw snapshot locally (not implemented); the public precomputed Pk this app fetches doesn't vary by MAS."
      />
      <Slider
        label="Threads"
        min={1}
        max={16}
        value={params.threads}
        onChange={(threads) => onChange({ ...params, threads })}
      />
      <SelectField
        label="Particle type"
        value={params.ptypeLabel}
        options={PTYPE_LABELS}
        onChange={(ptypeLabel) => onChange({ ...params, ptypeLabel })}
      />
      <Radio
        label="k range"
        value={K_RANGE_LABELS[params.kRange]}
        options={[K_RANGE_LABELS.standard, K_RANGE_LABELS.allk]}
        onChange={(label) =>
          onChange({ ...params, kRange: label === K_RANGE_LABELS.allk ? 'allk' : 'standard' })
        }
      />
      {params.kRange === 'allk' && (
        <>
          <SelectField
            label="Redshift-space distortion"
            value={params.rsdLabel}
            options={RSD_LABELS}
            onChange={(rsdLabel) => onChange({ ...params, rsdLabel })}
          />
          {rsdAxis !== null && (
            <Radio
              label="Multipole"
              value={params.multipole}
              options={['P0', 'P2', 'P4']}
              onChange={(multipole) => onChange({ ...params, multipole: multipole as 'P0' | 'P2' | 'P4' })}
            />
          )}
        </>
      )}
      <Checkbox
        label="Overlay linear-theory Pk (z=0, from ICs)"
        checked={params.showLinearPk}
        onChange={(showLinearPk) => onChange({ ...params, showLinearPk })}
      />
    </ParamsSidebar>
  );
}
