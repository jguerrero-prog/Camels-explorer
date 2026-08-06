import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RangeFilterControl } from './RangeFilterControl';
import type { RangeFilterValue } from './RangeFilterControl';

const meta: Meta<typeof RangeFilterControl> = {
  title: 'Primitives/RangeFilterControl',
  component: RangeFilterControl,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof RangeFilterControl>;

function Interactive() {
  const [value, setValue] = useState<RangeFilterValue>({ min: 0.2, max: 0.8 });
  return (
    <RangeFilterControl
      label="Ωm"
      min={0.1}
      max={0.5}
      value={value}
      onChange={setValue}
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};

function LargeMagnitudeExample() {
  // Real field shape: Group_M_Crit200 spans ~1e10-1e15, the case that
  // motivated the exponential-formatting threshold in defaultFormatValue.
  const [value, setValue] = useState<RangeFilterValue>({ min: 2e11, max: 8e13 });
  return (
    <RangeFilterControl
      label="M_200,crit [10^10 Msun/h]"
      min={1e10}
      max={1e15}
      value={value}
      onChange={setValue}
    />
  );
}

export const LargeMagnitudeField: Story = {
  render: () => <LargeMagnitudeExample />,
};
