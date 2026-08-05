import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SelectField } from './SelectField';

const meta: Meta<typeof SelectField> = {
  title: 'Fields/SelectField',
  component: SelectField,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
  // Generic, not the real Figma copy ("Set" / "LH — Latin Hypercube") -
  // see SelectField.mdx Spec.
  args: {
    label: 'Select label',
    value: 'Selected value',
    options: ['Selected value', 'Option B', 'Option C'],
  },
};
export default meta;

type Story = StoryObj<typeof SelectField>;

function Interactive(args: ComponentProps<typeof SelectField>) {
  const [value, setValue] = useState(args.value);
  return <SelectField {...args} value={value} onChange={setValue} />;
}

export const Playground: Story = {
  render: (args) => <Interactive {...args} />,
};
