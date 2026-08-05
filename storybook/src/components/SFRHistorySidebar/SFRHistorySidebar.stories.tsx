import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SFRHistorySidebar } from './SFRHistorySidebar';
import type { SFRHistoryParams } from './SFRHistorySidebar';

const meta: Meta<typeof SFRHistorySidebar> = {
  title: 'Sections/SFRHistorySidebar',
  component: SFRHistorySidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '900px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof SFRHistorySidebar>;

function Interactive() {
  const [params, setParams] = useState<SFRHistoryParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [42],
    zMin: 0.0,
    zMax: 10.0,
    bins: 500,
    showSymbolicFit: true,
    Om: 0.3,
    s8: 0.8,
    A1: 1.0,
    A3: 1.0,
  });
  return <SFRHistorySidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
