import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  title: 'Controls/TextField',
  component: TextField,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
  args: {
    label: 'Number label',
    value: '42',
    type: 'number',
  },
};
export default meta;

type Story = StoryObj<typeof TextField>;

function Interactive(args: ComponentProps<typeof TextField>) {
  const [value, setValue] = useState(args.value);
  return <TextField {...args} value={value} onChange={setValue} />;
}

export const Playground: Story = {
  render: (args) => <Interactive {...args} />,
};

export const WithCaption: Story = {
  args: { caption: '0–999' },
  render: (args) => <Interactive {...args} />,
};
