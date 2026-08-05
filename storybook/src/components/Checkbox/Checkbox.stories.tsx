import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

function Interactive({ initial, label }: { initial: boolean; label: string }) {
  const [checked, setChecked] = useState(initial);
  return <Checkbox label={label} checked={checked} onChange={setChecked} />;
}

// Labels are generic ("Checkbox label"), not the real Figma copy ("Compare
// mode", "Show symbolic-regression fit overlay") - see Checkbox.mdx Spec.

export const Unchecked: Story = {
  render: () => <Interactive initial={false} label="Checkbox label" />,
};

export const Checked: Story = {
  render: () => <Interactive initial label="Checkbox label" />,
};
