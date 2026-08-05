import type { Meta, StoryObj } from '@storybook/react';
import { CanvasStatsRow } from './CanvasStatsRow';

const meta: Meta<typeof CanvasStatsRow> = {
  title: 'Sections/CanvasStatsRow',
  component: CanvasStatsRow,
  parameters: { layout: 'padded' },
  args: {
    stats: [
      { value: '1,000', label: 'LH Realizations' },
      { value: '4', label: 'suites' },
      { value: '15', label: 'Statistics' },
      { value: '5', label: 'Halo finders' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof CanvasStatsRow>;

export const Playground: Story = {};
