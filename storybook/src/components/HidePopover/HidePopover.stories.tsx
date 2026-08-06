import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HidePopover } from './HidePopover';
import type { HideCategory, HideScope, HideValues } from './HidePopover';

const meta: Meta<typeof HidePopover> = {
  title: 'Overlays/HidePopover',
  component: HidePopover,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-content)', padding: '64px 48px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof HidePopover>;

const EMPTY_VALUES: HideValues = { annotations: false, arrows: false, notes: false, readouts: false };

function Interactive({ initialScope, initialValues, panelDisabled }: { initialScope: HideScope; initialValues: HideValues; panelDisabled?: boolean }) {
  const [scope, setScope] = useState(initialScope);
  const [values, setValues] = useState(initialValues);
  return (
    <HidePopover
      scope={scope}
      onScopeChange={setScope}
      values={values}
      onToggle={(category: HideCategory, value: boolean) => setValues((v) => ({ ...v, [category]: value }))}
      panelDisabled={panelDisabled}
      onClose={() => {}}
    />
  );
}

/** Real usage: default state, no tile focused yet, scope defaults to "All
 * panels" (which never needs a focused tile). */
export const Default: Story = {
  render: () => <Interactive initialScope="all" initialValues={EMPTY_VALUES} />,
};

/** Real usage: some categories already hidden at the "All panels" scope -
 * matches the checkbox reflecting App.tsx's `hideAllPanels` state. */
export const SomeHiddenAllPanels: Story = {
  render: () => <Interactive initialScope="all" initialValues={{ ...EMPTY_VALUES, annotations: true, readouts: true }} />,
};

/** Real, honest gap: scope switched to "This panel" with no tile focused -
 * checkboxes disable and a caption explains why, rather than silently
 * doing nothing on a click (matches CopyAsCodePopover's own "click a tile
 * first" pattern). */
export const PanelScopeNoTileFocused: Story = {
  render: () => <Interactive initialScope="panel" initialValues={EMPTY_VALUES} panelDisabled />,
};

/** Real usage: "This panel" scope with a tile focused - reflects that
 * tile's own per-panel hide state (App.tsx's `hidePerPanel[focusedTileId]`),
 * independent of the "All panels" state shown in the story above. */
export const PanelScopeWithTileFocused: Story = {
  render: () => <Interactive initialScope="panel" initialValues={{ ...EMPTY_VALUES, arrows: true }} />,
};
