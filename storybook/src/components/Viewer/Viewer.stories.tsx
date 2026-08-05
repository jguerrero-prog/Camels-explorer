import type { Meta, StoryObj } from '@storybook/react';
import { Viewer } from './Viewer';
import { Tile } from '../Tile/Tile';

const meta: Meta<typeof Viewer> = {
  title: 'Sections/Viewer',
  component: Viewer,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh', background: 'var(--color-surface-chrome)' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Viewer>;

const tiles = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <Tile key={i} title={`Panel ${i + 1}`} onAddPlot={() => {}} />
  ));

export const OneByOne: Story = {
  name: '1x1 (one tile)',
  args: { mode: 'grid', children: tiles(1) },
};

export const TwoByOne: Story = {
  name: '2x1 (two tiles)',
  args: { mode: 'grid', children: tiles(2) },
};

export const Thirds: Story = {
  name: 'Thirds (three tiles)',
  args: { mode: 'grid', children: tiles(3) },
};

export const TwoByTwo: Story = {
  name: '2x2 (four tiles)',
  args: { mode: 'grid', children: tiles(4) },
};

export const Stacked: Story = {
  args: { mode: 'stacked', children: tiles(4) },
};
