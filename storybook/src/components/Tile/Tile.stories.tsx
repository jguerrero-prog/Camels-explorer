import type { Meta, StoryObj } from '@storybook/react';
import { Tile } from './Tile';
import { CanvasStatsRow } from '../CanvasStatsRow/CanvasStatsRow';

const meta: Meta<typeof Tile> = {
  title: 'Sections/Tile',
  component: Tile,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '640px', padding: '16px' }}><Story /></div>],
  args: {
    title: 'Panel 1',
    onAddPlot: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof Tile>;

export const Playground: Story = {};

/** The real composition for the canvas's lone starter tile — see
 * CanvasStatsRow.mdx's Placement note for the Figma evidence behind why
 * this is a footer slot rather than a separate row above the tile. */
export const AsCanvasStarter: Story = {
  args: {
    footer: (
      <CanvasStatsRow
        stats={[
          { value: '1,000', label: 'LH Realizations' },
          { value: '4', label: 'suites' },
          { value: '15', label: 'Statistics' },
          { value: '5', label: 'Halo finders' },
        ]}
      />
    ),
  },
};
