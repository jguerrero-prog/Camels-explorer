import './CustomTab.css';

type TreeNode = {
  label: string;
  required?: boolean;
  count?: string;
  collapsed?: boolean;
  children?: TreeNode[];
};

// Real field names transcribed directly from Figma node 975:154's "Filters"
// section - not invented. This whole tab is a placeholder (see CustomTab
// docs in AddPlotModal.mdx): the tree is static, "+ Add" does nothing, and
// nothing here is wired to a real backend capability yet.
const FIELD_TREE: TreeNode[] = [
  { label: 'simulation_suite', required: true },
  { label: 'simulation_set', required: true },
  { label: 'type', required: true },
  {
    label: 'params',
    count: '8 fields',
    children: [
      { label: 'Omega_m' },
      { label: 'sigma_8' },
      { label: 'A_SN1' },
      { label: 'A_AGN1' },
      { label: 'A_SN2' },
      { label: 'A_AGN2' },
      { label: 'snap' },
      { label: 'z' },
    ],
  },
  {
    label: 'Group — FoF Halos',
    children: [
      { label: 'BHMass' },
      { label: 'GasMetallicity' },
      { label: 'SFR' },
      { label: 'Nsubs' },
      {
        label: 'MassType',
        count: '6 types',
        children: [
          { label: 'gas' },
          { label: 'dm' },
          { label: 'stars' },
          { label: 'bh' },
          { label: 'tracers' },
          { label: 'unused' },
        ],
      },
      { label: 'CM', count: '3 fields', collapsed: true },
    ],
  },
  { label: 'Subhalo — Subfind Subhalos', count: '~90 fields', collapsed: true },
];

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const isGroup = !!node.children || node.count !== undefined;
  return (
    <>
      <div className="custom-tab__tree-row" style={{ paddingLeft: 8 + depth * 20 }}>
        <div className="custom-tab__tree-left">
          {isGroup && (
            <span className={`custom-tab__tree-chevron ${node.collapsed ? '' : 'custom-tab__tree-chevron--open'}`}>▸</span>
          )}
          <span className={isGroup ? 'custom-tab__tree-label--group' : 'custom-tab__tree-label'}>{node.label}</span>
          {node.count && <span className="custom-tab__tree-count">{node.count}</span>}
        </div>
        {node.required && <span className="custom-tab__badge-required">Required</span>}
        {!isGroup && !node.required && <button type="button" className="custom-tab__btn-add">+ Add</button>}
      </div>
      {!node.collapsed && node.children?.map((child) => <TreeRow key={child.label} node={child} depth={depth + 1} />)}
    </>
  );
}

/** Visual match of Figma node 974:168 ("Add Plot — Custom tab") - every
 * field is a real, deliberate placeholder, not wired to any backend
 * capability. `backend.py` has no arbitrary-field/chart-type plotting yet
 * (the Streamlit prototype never fleshed this out either), so nothing here
 * has an onChange - see AddPlotModal.mdx's Usecase. */
export function CustomTab() {
  return (
    <div className="custom-tab">
      <div className="custom-tab__field">
        <p className="custom-tab__label">Suite</p>
        <div className="custom-tab__static-input">
          <span>IllustrisTNG</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Set</p>
        <div className="custom-tab__static-input">
          <span>LH · Latin Hypercube</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
        <p className="custom-tab__caption">1,000 realizations, varied cosmology + astrophysics</p>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Realization</p>
        <div className="custom-tab__static-input">
          <span>42</span>
          <span className="custom-tab__static-stepper">
            <span className="custom-tab__static-stepper-btn">⌃</span>
            <span className="custom-tab__static-stepper-btn">⌄</span>
          </span>
        </div>
        <p className="custom-tab__caption">0–999</p>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Catalog</p>
        <div className="custom-tab__static-input">
          <span>Subfind</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Chart type</p>
        <div className="custom-tab__static-input">
          <span>Scatter</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">X field</p>
        <div className="custom-tab__static-input">
          <span>Stellar Mass [Msun/h]</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
        <p className="custom-tab__caption">Curated fields shown first · 72 more in Raw</p>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Y field</p>
        <div className="custom-tab__static-input">
          <span>Halo Mass [Msun/h]</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Color field (optional)</p>
        <div className="custom-tab__static-input">
          <span>None</span>
          <span className="custom-tab__chevron">⌄</span>
        </div>
      </div>
      <div className="custom-tab__field">
        <p className="custom-tab__label">Filters</p>
        <p className="custom-tab__caption">Add fields as live filters on the rendered plot. Nothing is pre-selected.</p>
        <div className="custom-tab__tree">
          {FIELD_TREE.map((node) => (
            <TreeRow key={node.label} node={node} depth={0} />
          ))}
        </div>
      </div>
    </div>
  );
}
