import { useState } from 'react';
import chevron from '../SelectField/assets/chevron.svg';
import type { CustomFieldTreeNode } from '../../lib/api';
import { labelFromTitleUnits, stripLatexDelims } from '../../lib/customFieldFormat';
import './CustomTab.css';

export type CustomFilterTreeProps = {
  nodes: CustomFieldTreeNode[];
  activeFields: string[];
  onToggle: (fieldName: string) => void;
};

/** Real, live, browsable Filters tree (GET /api/custom/field-tree) -
 * recovers the original static placeholder's own layout/intent ("Add
 * fields as live filters on the rendered plot. Nothing is pre-selected.")
 * with real data: every leaf field gets a "+ Add"/"Remove" toggle only -
 * there is deliberately NO value/range editing here (see
 * CustomFilterValues, sidebar-only). Group headers (params/Group/Subhalo
 * and nested groups like Group_CM/Group_MassType) only expand/collapse -
 * no add button, matching the original mock's own "group headers just
 * expand/collapse" rule.
 *
 * Real fix (2026-08-05, direct user feedback): nested groups now render as
 * an actual indented tree - each group's children live inside a
 * `.custom-tab__tree-children` wrapper with its own left guide-line/
 * margin, rather than every row computing its own one-off `paddingLeft`
 * from `depth`. Group-header rows get a tinted background (bolder,
 * separated from siblings); leaf rows get a hover state and, while not yet
 * added, a one-line real `descr` caption under the field name (FlatHUB's
 * own real per-field description, GET-ed live - see api.ts's
 * CustomFieldTreeNode) - "like the way FlatHUB does it", per the user.
 * That caption is intentionally dropped the moment a field is added
 * (`active`): CustomFilterValues (the post-add value-editing UI) is the
 * one place a definition must NOT reappear, per the same feedback. */
export function CustomFilterTree({ nodes, activeFields, onToggle }: CustomFilterTreeProps) {
  return (
    <div className="custom-tab__tree">
      {nodes.map((node) => (
        <TreeRow key={node.name} node={node} depth={0} activeFields={activeFields} onToggle={onToggle} />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  activeFields,
  onToggle,
}: {
  node: CustomFieldTreeNode;
  depth: number;
  activeFields: string[];
  onToggle: (name: string) => void;
}) {
  const isGroup = !!node.sub && node.sub.length > 0;
  // Depth-0 branches (params/Group/Subhalo) are the whole tree shown here,
  // so they start open; every deeper group (CM, MassType, Pos, Vel, ...)
  // starts collapsed - the same "CM collapsed" discipline the original
  // static mock used, now applied generically to whichever real nested
  // groups the live schema happens to have.
  const [open, setOpen] = useState(depth === 0);
  const active = activeFields.includes(node.name);

  // "Group — FoF Halos" / "Subhalo — Subfind Subhalos" - the live schema's
  // own real `descr` for these two top-level branches reads as a natural
  // human-facing suffix; `params`' own descr ("Simulation parameter:") is
  // a per-field prefix, not a group-level label, so it's deliberately left
  // out rather than producing "params — Simulation parameter:".
  const groupSuffix =
    depth === 0 && (node.name === 'Group' || node.name === 'Subhalo') && node.descr ? ` — ${node.descr}` : '';
  const label = isGroup ? `${stripLatexDelims(node.title)}${groupSuffix}` : labelFromTitleUnits(node.title, node.units);

  return (
    <div className="custom-tab__tree-node">
      <div className={`custom-tab__tree-row ${isGroup ? 'custom-tab__tree-row--group' : 'custom-tab__tree-row--leaf'}`}>
        <div className="custom-tab__tree-left">
          {isGroup ? (
            <button
              type="button"
              className="custom-tab__tree-toggle"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              <img
                className={`custom-tab__tree-chevron ${open ? 'custom-tab__tree-chevron--open' : ''}`}
                src={chevron}
                alt=""
              />
              <span className="custom-tab__tree-label--group" title={label}>{label}</span>
            </button>
          ) : (
            <div className="custom-tab__tree-leaf-info">
              <span className="custom-tab__tree-label" title={label}>{label}</span>
              {/* Real per-field description, only before it's added - once
                  `active`, CustomFilterValues owns showing this field, and
                  per direct user feedback a definition must never reappear
                  there. */}
              {!active && node.descr && (
                <span className="custom-tab__tree-descr" title={stripLatexDelims(node.descr)}>
                  {stripLatexDelims(node.descr)}
                </span>
              )}
            </div>
          )}
          {isGroup && (
            <span className="custom-tab__tree-count">
              {node.sub!.length} field{node.sub!.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {!isGroup && (
          <button
            type="button"
            className={`custom-tab__btn-add ${active ? 'custom-tab__btn-add--active' : ''}`}
            onClick={() => onToggle(node.name)}
          >
            {active ? '✓ Remove' : '+ Add'}
          </button>
        )}
      </div>
      {isGroup && open && (
        <div className="custom-tab__tree-children">
          {node.sub!.map((child) => (
            <TreeRow key={child.name} node={child} depth={depth + 1} activeFields={activeFields} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
