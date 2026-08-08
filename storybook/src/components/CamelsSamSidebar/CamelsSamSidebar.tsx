import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Radio } from '../Radio/Radio';
import { Button } from '../Button/Button';
import { SAM_SETS, SAM_SET_REALIZATIONS } from '../../lib/api';
import '../NumberStepper/NumberStepper.css';

export type CamelsSamParams = {
  setName: string;
  realization: number;
};

export type CamelsSamSidebarProps = {
  params: CamelsSamParams;
  onChange: (params: CamelsSamParams) => void;
  onRemove: () => void;
};

/** CAMELS-SAM's real per-tile sidebar, from `app.py`'s own "CAMELS-SAM" tab
 * (added 2026-08-07, direct user request to wire this statistic in; Set
 * added 2026-08-08, issue #24). Unlike every other statistic, CAMELS-SAM
 * has no Suite concept at all (`backend.py`'s `get_sam_catalog` has no
 * suite parameter), so this doesn't reuse `SingleRealizationFields` -
 * there's nothing for that component's Suite dropdown to select. Set is a
 * plain `Radio` instead (only 2 real options, LH/CV - 1P stays
 * unsupported, see backend.py's own `PUBLIC_SAM_SETS` comment). Changing
 * Set clamps the realization into the new set's real range (CV only has
 * 5 real realizations, not 1000) rather than leaving it out of bounds.
 * See CamelsSamSidebar.mdx. */
export function CamelsSamSidebar({ params, onChange, onRemove }: CamelsSamSidebarProps) {
  const maxRealization = SAM_SET_REALIZATIONS[params.setName] - 1;
  return (
    <ParamsSidebar title="CAMELS-SAM" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <Radio
        label="Set"
        value={params.setName}
        options={SAM_SETS}
        onChange={(setName) => onChange({ setName, realization: Math.min(params.realization, SAM_SET_REALIZATIONS[setName] - 1) })}
      />
      <NumberStepper
        label={`Realization (${params.setName})`}
        value={params.realization}
        onChange={(realization) => onChange({ ...params, realization })}
        caption={`0–${maxRealization}`}
      />
    </ParamsSidebar>
  );
}
