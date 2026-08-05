import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import plusIcon from './assets/plus.svg';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Button>;

// Labels are generic ("Button label"), not the real Figma copy ("Add Plot",
// "Remove plot") - see Button.mdx Spec. The real names are documented in
// prose there; this story demonstrates the control, not confirmed copy.

export const Primary: Story = {
  args: {
    variant: 'primary',
    icon: <img src={plusIcon} alt="" />,
    children: 'Button label',
    onClick: () => {},
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button label',
    onClick: () => {},
  },
};
