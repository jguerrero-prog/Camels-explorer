import type { Meta, StoryObj } from '@storybook/react';
import { Tile } from './Tile';

const meta: Meta<typeof Tile> = {
  title: 'App Shell/Tile',
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
