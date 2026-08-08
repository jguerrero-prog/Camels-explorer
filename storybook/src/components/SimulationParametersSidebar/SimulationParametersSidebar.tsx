import { useEffect } from 'react';
import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Button } from '../Button/Button';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type SimulationParametersParams = {
  suite: string;
  setName: string;
};

export type SimulationParametersSidebarProps = {
  params: SimulationParametersParams;
  onChange: (params: SimulationParametersParams) => void;
  onRemove: () => void;
};

// Real (backend.py's PUBLIC_PARAMETERS_SUITES) - the 4 hydro suites with a
// real Parameters/{suite}/CosmoAstroSeed_*.txt file, confirmed directly.
const PARAMETERS_SUITES = ['IllustrisTNG', 'SIMBA', 'Astrid', 'Swift-EAGLE'];

/** Simulation Parameters' real per-tile sidebar (added 2026-08-07, direct
 * user request, issue #14) - structurally like FieldPDFSidebar: no
 * Realization field at all, since one real file already covers every
 * realization of a suite/set at once. Unlike FieldPDFSidebar, Set still
 * applies here (the file is per-set, not shared across every set the way
 * PDF's LH-only file is) - so this is Suite + Set, nothing else. */
export function SimulationParametersSidebar({ params, onChange, onRemove }: SimulationParametersSidebarProps) {
  const catalog = useCatalogMetadata();
  const sets = catalog?.sets ?? [];

  // Auto-correct: only relevant if CuratedTab ever seeds a setName that
  // isn't in the real catalog yet (metadata still loading) - same pattern
  // FieldPDFSidebar/SingleRealizationFields already use for suite.
  useEffect(() => {
    if (sets.length > 0 && !sets.some((s) => s.name === params.setName)) {
      onChange({ ...params, setName: sets[0].name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets.length, params.setName]);

  return (
    <ParamsSidebar title="Simulation Parameters" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SelectField
        label="Suite"
        value={params.suite}
        options={PARAMETERS_SUITES}
        onChange={(suite) => onChange({ ...params, suite })}
      />
      <SelectField
        label="Set"
        value={sets.find((s) => s.name === params.setName)?.label ?? params.setName}
        options={sets.map((s) => s.label)}
        onChange={(label) => {
          const found = sets.find((s) => s.label === label);
          if (found) onChange({ ...params, setName: found.name });
        }}
      />
    </ParamsSidebar>
  );
}
