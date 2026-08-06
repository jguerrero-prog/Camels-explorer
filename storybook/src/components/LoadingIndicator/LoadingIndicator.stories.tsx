import type { Meta, StoryObj } from '@storybook/react';
import { LoadingIndicator } from './LoadingIndicator';

const meta: Meta<typeof LoadingIndicator> = {
  title: 'Primitives/LoadingIndicator',
  component: LoadingIndicator,
  parameters: { layout: 'centered' },
  args: {
    onStop: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof LoadingIndicator>;

export const Playground: Story = {};
