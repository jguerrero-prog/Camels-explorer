import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NumberStepper } from './NumberStepper';

const meta: Meta<typeof NumberStepper> = {
  title: 'Controls/NumberStepper',
  component: NumberStepper,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '240px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof NumberStepper>;

function Interactive() {
  const [value, setValue] = useState(10.0);
  // Generic label, not the real Figma copy ("z max") - see NumberStepper.mdx
  // Spec: that field is itself an unresolved placeholder, so rendering "z
  // max" here would look like a confirmed field name.
  return <NumberStepper label="Number label" value={value} step={0.1} onChange={setValue} formatValue={(v) => v.toFixed(1)} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
