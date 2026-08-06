import { useEffect } from 'react';
import { ParamsSidebar } from '../ParamsSidebar/ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { OptionSlider } from '../OptionSlider/OptionSlider';
import { Button } from '../Button/Button';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

export type FieldPDFParams = {
  suite: string;
  field: string;
  grid: number;
  redshift: number;
};

export type FieldPDFSidebarProps = {
  params: FieldPDFParams;
  onChange: (params: FieldPDFParams) => void;
  onRemove: () => void;
};

// Real fallbacks (backend.py's CMD_FIELDS/PUBLIC_PDF_GRIDS/
// PUBLIC_PDF_REDSHIFTS) - used only until GET /api/metadata loads.
const FALLBACK_FIELDS = [{ key: 'Mtot', label: 'Total matter density' }];
const FALLBACK_GRIDS = [128, 256];
const FALLBACK_REDSHIFTS = [0.0, 0.5, 1.0, 1.5, 2.0];

/** Field PDF's real per-tile sidebar, from app.py's own "Field PDF" block
 * - structurally unique among every sidebar in this app: it has no
 * Set/Realization fields at all (not even SingleRealizationFields), since
 * this statistic's own single small file already covers the mean+/-std
 * shape across all 1000 LH realizations at once - only Suite still
 * applies. See FieldPDFSidebar.mdx. */
export function FieldPDFSidebar({ params, onChange, onRemove }: FieldPDFSidebarProps) {
  const catalog = useCatalogMetadata();
  const fields = catalog?.cmd_fields ?? FALLBACK_FIELDS;
  const grids = catalog?.pdf_grids ?? FALLBACK_GRIDS;
  const redshifts = catalog?.pdf_redshifts ?? FALLBACK_REDSHIFTS;
  const fieldLabels = fields.map((f) => `${f.key} - ${f.label}`);
  const currentFieldLabel = fields.find((f) => f.key === params.field);
  const allowedSuites = catalog?.statistic_suites['Field PDF'];
  const suiteOptions = (catalog?.suites ?? [params.suite]).filter((s) => !allowedSuites || allowedSuites.includes(s));

  // Auto-correct: only relevant if CuratedTab ever seeds an initial suite
  // that isn't real for Field PDF specifically - see RealizationFields'
  // own comment for the full reasoning.
  useEffect(() => {
    if (allowedSuites && suiteOptions.length > 0 && !suiteOptions.includes(params.suite)) {
      onChange({ ...params, suite: suiteOptions[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedSuites, params.suite]);

  return (
    <ParamsSidebar title="Field PDF" footer={<Button variant="secondary" onClick={onRemove}>Remove plot</Button>}>
      <SelectField
        label="Suite"
        value={params.suite}
        options={suiteOptions}
        onChange={(suite) => onChange({ ...params, suite })}
      />
      <SelectField
        label="Field"
        value={currentFieldLabel ? `${currentFieldLabel.key} - ${currentFieldLabel.label}` : params.field}
        options={fieldLabels}
        onChange={(label) => onChange({ ...params, field: label.split(' - ')[0] })}
      />
      <OptionSlider
        label="Grid resolution"
        options={grids}
        value={params.grid}
        onChange={(grid) => onChange({ ...params, grid })}
      />
      <OptionSlider
        label="Redshift"
        options={redshifts}
        value={params.redshift}
        onChange={(redshift) => onChange({ ...params, redshift })}
        formatValue={(z) => z.toFixed(2)}
      />
    </ParamsSidebar>
  );
}
