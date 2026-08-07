import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Button } from '../Button/Button';
import '../NumberStepper/NumberStepper.css';

export type CamelsSamParams = {
  realization: number;
};

export type CamelsSamSidebarProps = {
  params: CamelsSamParams;
  onChange: (params: CamelsSamParams) => void;
  onRemove: () => void;
};

/** CAMELS-SAM's real per-tile sidebar, from `app.py`'s own "CAMELS-SAM" tab
 * (added 2026-08-07, direct user request to wire this statistic in). The
 * simplest sidebar in this app - just Realization. Unlike every other
 * statistic, CAMELS-SAM has no Suite/Set concept at all (`backend.py`'s
 * `get_sam_catalog` is hardcoded to the LH set, no suite parameter exists),
 * so this doesn't reuse `SingleRealizationFields` - there's nothing for
 * that component's Suite/Set dropdowns to select. See CamelsSamSidebar.mdx. */
export function CamelsSamSidebar({ params, onChange, onRemove }: CamelsSamSidebarProps) {
  return (
    <ParamsSidebar title="CAMELS-SAM" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <NumberStepper
        label="Realization (LH)"
        value={params.realization}
        onChange={(realization) => onChange({ realization })}
        caption="0–999"
      />
    </ParamsSidebar>
  );
}
