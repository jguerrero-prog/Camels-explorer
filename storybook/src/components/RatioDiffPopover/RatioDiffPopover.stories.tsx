import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RatioDiffPopover } from './RatioDiffPopover';

const meta: Meta<typeof RatioDiffPopover> = {
  title: 'Sections/RatioDiffPopover',
  component: RatioDiffPopover,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-chrome)', padding: '48px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof RatioDiffPopover>;

const CANDIDATES = [
  { tileId: 'tile-2', title: 'SFR History', caption: 'IllustrisTNG · LH · 0', compatible: true },
  { tileId: 'tile-3', title: 'SFR History', caption: 'SIMBA · LH · 12', compatible: true },
  { tileId: 'tile-4', title: 'Field PDF', caption: "Different statistic - axes aren't comparable", compatible: false },
];

function Interactive() {
  const [selectedTileId, setSelectedTileId] = useState<string | null>('tile-2');
  const [mode, setMode] = useState<'ratio' | 'difference'>('ratio');
  return (
    <RatioDiffPopover
      candidates={CANDIDATES}
      selectedTileId={selectedTileId}
      onSelect={setSelectedTileId}
      onNewPlot={() => {}}
      onCompare={() => {}}
      mode={mode}
      onModeChange={setMode}
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};

export const NoOtherTiles: Story = {
  args: {
    candidates: [],
    selectedTileId: null,
    onSelect: () => {},
    onNewPlot: () => {},
    onCompare: () => {},
    mode: 'ratio',
    onModeChange: () => {},
  },
};
