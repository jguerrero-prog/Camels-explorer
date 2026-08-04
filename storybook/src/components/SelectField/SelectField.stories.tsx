import type { Meta, StoryObj } from '@storybook/react';
import { SelectField } from './SelectField';

const meta: Meta<typeof SelectField> = {
  title: 'Controls/SelectField',
  component: SelectField,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
  // Generic, not the real Figma copy ("Set" / "LH — Latin Hypercube") -
  // see SelectField.mdx Spec.
  args: {
    label: 'Select label',
    value: 'Selected value',
    onClick: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof SelectField>;

export const Playground: Story = {};
