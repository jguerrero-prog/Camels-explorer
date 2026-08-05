import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './Slider';

const meta: Meta<typeof Slider> = {
  title: 'Primitives/Slider',
  component: Slider,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Slider>;

// Generic label, not the real Figma copy ("Realization") - see Slider.mdx Spec.
function Interactive() {
  const [value, setValue] = useState(278);
  return <Slider label="Slider label" min={0} max={999} value={value} onChange={setValue} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
