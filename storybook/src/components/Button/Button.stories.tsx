import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import plusIcon from './assets/plus.svg';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--color-surface-chrome)', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Button>;

/** The most common configuration: a primary action with its icon. */
export const Default: Story = {
  args: {
    variant: 'primary',
    icon: <img src={plusIcon} alt="" />,
    children: 'Add Plot',
    onClick: () => {},
  },
};

/** Every control exposed. */
export const Playground: Story = {
  args: {
    variant: 'primary',
    icon: <img src={plusIcon} alt="" />,
    children: 'Add Plot',
    onClick: () => {},
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    icon: <img src={plusIcon} alt="" />,
    children: 'Add Plot',
    onClick: () => {},
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Remove plot',
    onClick: () => {},
  },
};

/** Primary without an icon. Both variants render label-only. */
export const NoIcon: Story = {
  args: {
    variant: 'primary',
    children: 'Add Plot',
    onClick: () => {},
  },
};

/** The longest label in use, proving the button grows rather than truncating. */
export const LongContent: Story = {
  args: {
    variant: 'secondary',
    children: 'Remove plot and clear its filters',
    onClick: () => {},
  },
};
