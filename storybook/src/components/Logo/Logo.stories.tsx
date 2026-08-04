import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'Brand/Logo',
  component: Logo,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'radio', options: ['icon', 'wordmark'] },
    height: { control: { type: 'range', min: 16, max: 200, step: 4 } },
  },
};
export default meta;

type Story = StoryObj<typeof Logo>;

export const Playground: Story = {
  args: { variant: 'wordmark', height: 64 },
};

export const Icon: Story = {
  args: { variant: 'icon', height: 96 },
};

export const Wordmark: Story = {
  args: { variant: 'wordmark', height: 64 },
};
