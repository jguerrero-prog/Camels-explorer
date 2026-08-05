import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HaloGasProfilesSidebar } from './HaloGasProfilesSidebar';
import type { HaloGasProfilesParams } from './HaloGasProfilesSidebar';

const meta: Meta<typeof HaloGasProfilesSidebar> = {
  title: 'Sections/HaloGasProfilesSidebar',
  component: HaloGasProfilesSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '680px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof HaloGasProfilesSidebar>;

function Interactive() {
  const [params, setParams] = useState<HaloGasProfilesParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    snapnum: 33,
    field: 'Gas Density',
    highlightRank: 1,
  });
  return (
    <HaloGasProfilesSidebar
      params={params}
      onChange={setParams}
      onRemove={() => {}}
      maxHighlightRank={412}
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};
