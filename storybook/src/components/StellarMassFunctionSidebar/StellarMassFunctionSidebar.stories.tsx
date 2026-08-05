import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StellarMassFunctionSidebar } from './StellarMassFunctionSidebar';
import type { StellarMassFunctionParams } from './StellarMassFunctionSidebar';

const meta: Meta<typeof StellarMassFunctionSidebar> = {
  title: 'Sections/StellarMassFunctionSidebar',
  component: StellarMassFunctionSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '640px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof StellarMassFunctionSidebar>;

// Real suite/set fetch requires the API server (localhost:8010) - falls
// back to just the seeded values below if it isn't running, same honest
// pattern as AddPlotModal/CuratedTab.
function Interactive() {
  const [params, setParams] = useState<StellarMassFunctionParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [278],
    SMmin: 1e9,
    SMmax: 5e11,
    bins: 10,
  });
  return (
    <StellarMassFunctionSidebar
      params={params}
      onChange={setParams}
      onRemove={() => {}}
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};
