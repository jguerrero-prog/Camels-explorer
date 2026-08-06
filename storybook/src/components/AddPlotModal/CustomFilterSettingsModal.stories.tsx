import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CustomFilterSettingsModal } from './CustomFilterSettingsModal';
import { EMPTY_CUSTOM_SELECTION } from './CustomFieldsForm';
import type { CustomSelection } from './CustomFieldsForm';
import type { CustomFieldTreeNode } from '../../lib/api';

const meta: Meta<typeof CustomFilterSettingsModal> = {
  title: 'Flows/CustomFilterSettingsModal',
  component: CustomFilterSettingsModal,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CustomFilterSettingsModal>;

// Shaped like the real GET /api/custom/field-tree response (see
// lib/api.ts's CustomFieldTreeNode docs) - real field/group names from
// FlatHUB's own schema, trimmed to a handful per group for a readable
// fixture rather than all ~241 fields.
const FIXTURE_TREE: CustomFieldTreeNode[] = [
  {
    name: 'params',
    title: 'Simulation parameters',
    sub: [
      { name: 'params_Omega_m', title: 'Omega_m', descr: 'Simulation parameter: matter density', stats: { min: 0.1, max: 0.5 } },
      { name: 'params_sigma_8', title: 'sigma_8', descr: 'Simulation parameter: power spectrum normalization', stats: { min: 0.6, max: 1.0 } },
      { name: 'params_A_SN1', title: 'A_SN1', descr: 'Simulation parameter: SN feedback strength', stats: { min: 0.25, max: 4 } },
    ],
  },
  {
    name: 'Group',
    title: 'FoF Group',
    descr: 'FoF Halos',
    sub: [
      { name: 'Group_M_Crit200', title: 'Group_M_Crit200', descr: 'Mass within R_Crit200', units: 'Msun/h' },
      {
        name: 'Group_CM',
        title: 'Group_CM',
        sub: [
          { name: 'Group_CM_x', title: 'Group_CM_x', units: 'kpc/h' },
          { name: 'Group_CM_y', title: 'Group_CM_y', units: 'kpc/h' },
          { name: 'Group_CM_z', title: 'Group_CM_z', units: 'kpc/h' },
        ],
      },
    ],
  },
];

function Interactive({ initialSelection }: { initialSelection: CustomSelection }) {
  const [selection, setSelection] = useState(initialSelection);
  const [open, setOpen] = useState(true);
  return open ? (
    <CustomFilterSettingsModal
      tree={FIXTURE_TREE}
      selection={selection}
      onChange={setSelection}
      onClose={() => setOpen(false)}
    />
  ) : (
    <p style={{ padding: 24, fontFamily: 'var(--font-label)', color: 'var(--color-text-muted)' }}>
      Closed - reload the story to reopen.
    </p>
  );
}

/** Real usage: opened with a Type already chosen (FoF halo), so the tree is
 * filtered to `params` + `Group` (see `filterTreeForType`) and every leaf's
 * "+ Add"/"Remove" toggle is live. */
export const FoFHaloType: Story = {
  render: () => <Interactive initialSelection={{ ...EMPTY_CUSTOM_SELECTION, type: 'FoF halo' }} />,
};

/** Real usage: some fields already added via a prior visit - their buttons
 * render as "✓ Remove" instead of "+ Add", and their per-field description
 * is hidden (see CustomFilterTree's own docs on why). */
export const WithFieldsAlreadyAdded: Story = {
  render: () => (
    <Interactive
      initialSelection={{ ...EMPTY_CUSTOM_SELECTION, type: 'FoF halo', activeFilterFields: ['params_Omega_m', 'Group_M_Crit200'] }}
    />
  ),
};

/** Real, honest state: no Type picked yet in the underlying form - the
 * modal still opens (a user can reach "Filter settings…" before choosing a
 * Type) but shows a prompt instead of a tree, since `filterTreeForType`
 * has nothing to filter. */
export const NoTypeSelectedYet: Story = {
  render: () => <Interactive initialSelection={EMPTY_CUSTOM_SELECTION} />,
};

/** Real, honest failure mode: the field-tree fetch failed (API server not
 * running) - matches CustomTab's own inline error copy rather than hanging
 * on a spinner forever. */
export const TreeFetchError: Story = {
  args: {
    tree: null,
    treeError: true,
    selection: { ...EMPTY_CUSTOM_SELECTION, type: 'FoF halo' },
    onChange: () => {},
    onClose: () => {},
  },
};

/** Real loading state, shown briefly while `GET /api/custom/field-tree` is
 * in flight. */
export const TreeLoading: Story = {
  args: {
    tree: null,
    selection: { ...EMPTY_CUSTOM_SELECTION, type: 'FoF halo' },
    onChange: () => {},
    onClose: () => {},
  },
};
