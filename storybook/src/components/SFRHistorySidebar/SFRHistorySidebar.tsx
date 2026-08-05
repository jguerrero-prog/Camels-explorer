import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Slider } from '../Slider/Slider';
import { Checkbox } from '../Checkbox/Checkbox';
import { Button } from '../Button/Button';
import { RealizationFields } from '../RealizationFields/RealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';
import '../ParamsSidebar/ParamsSidebar.css';

export type SFRHistoryParams = {
  suite: string;
  setName: string;
  compareMode: boolean;
  realizations: number[];
  zMin: number;
  zMax: number;
  bins: number;
  showSymbolicFit: boolean;
  Om: number;
  s8: number;
  A1: number;
  A3: number;
};

export type SFRHistorySidebarProps = {
  params: SFRHistoryParams;
  onChange: (params: SFRHistoryParams) => void;
  onRemove: () => void;
};

// Real fallback range/fiducial values (SFRHSymbolicModel in backend.py) -
// used only until GET /api/metadata's own sfrh_symbolic_model block loads.
const FALLBACK_OM_RANGE: [number, number] = [0.1, 0.5];
const FALLBACK_S8_RANGE: [number, number] = [0.6, 1.0];
const FALLBACK_A1_RANGE: [number, number] = [0.25, 4.0];
const FALLBACK_A3_RANGE: [number, number] = [0.25, 4.0];

/** SFR History's real per-tile sidebar, from app.py's own "SFR History"
 * block. The only statistic whose sidebar includes a second, independent
 * model - the real symbolic-regression fit (SFRHSymbolicModel), overlaid on
 * the fetched curve rather than replacing it - see SFRHistorySidebar.mdx. */
export function SFRHistorySidebar({ params, onChange, onRemove }: SFRHistorySidebarProps) {
  const catalog = useCatalogMetadata();
  const model = catalog?.sfrh_symbolic_model;
  const omRange = model?.om_range ?? FALLBACK_OM_RANGE;
  const s8Range = model?.s8_range ?? FALLBACK_S8_RANGE;
  const a1Range = model?.a1_range ?? FALLBACK_A1_RANGE;
  const a3Range = model?.a3_range ?? FALLBACK_A3_RANGE;

  return (
    <ParamsSidebar title="SFR History">
      <RealizationFields catalog={catalog} value={params} onChange={(v) => onChange({ ...params, ...v })} />
      <NumberStepper
        label="z min"
        value={params.zMin}
        step={0.5}
        formatValue={(v) => v.toFixed(1)}
        onChange={(zMin) => onChange({ ...params, zMin })}
      />
      <NumberStepper
        label="z max"
        value={params.zMax}
        step={0.5}
        formatValue={(v) => v.toFixed(1)}
        onChange={(zMax) => onChange({ ...params, zMax })}
      />
      <Slider
        label="Bins"
        min={100}
        max={2000}
        value={params.bins}
        onChange={(bins) => onChange({ ...params, bins })}
      />

      <div className="params-sidebar__divider" />

      <Checkbox
        label="Overlay symbolic-regression fit (real, IllustrisTNG-trained)"
        checked={params.showSymbolicFit}
        onChange={(showSymbolicFit) => onChange({ ...params, showSymbolicFit })}
      />
      {params.showSymbolicFit && (
        <>
          <Slider
            label="Ωm"
            min={omRange[0]}
            max={omRange[1]}
            value={params.Om}
            onChange={(Om) => onChange({ ...params, Om })}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="σ8"
            min={s8Range[0]}
            max={s8Range[1]}
            value={params.s8}
            onChange={(s8) => onChange({ ...params, s8 })}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="A_SN1 (galactic wind energy)"
            min={a1Range[0]}
            max={a1Range[1]}
            value={params.A1}
            onChange={(A1) => onChange({ ...params, A1 })}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="A_AGN1 (BH feedback energy)"
            min={a3Range[0]}
            max={a3Range[1]}
            value={params.A3}
            onChange={(A3) => onChange({ ...params, A3 })}
            formatValue={(v) => v.toFixed(2)}
          />
        </>
      )}

      <Button variant="secondary" onClick={onRemove}>Remove plot</Button>
    </ParamsSidebar>
  );
}
