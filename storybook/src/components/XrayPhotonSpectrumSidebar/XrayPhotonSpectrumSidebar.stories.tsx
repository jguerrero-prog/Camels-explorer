import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { XrayPhotonSpectrumSidebar } from './XrayPhotonSpectrumSidebar';
import type { XrayPhotonSpectrumParams } from './XrayPhotonSpectrumSidebar';

const meta: Meta<typeof XrayPhotonSpectrumSidebar> = {
  title: 'Sections/XrayPhotonSpectrumSidebar',
  component: XrayPhotonSpectrumSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof XrayPhotonSpectrumSidebar>;

function Interactive() {
  const [params, setParams] = useState<XrayPhotonSpectrumParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 0,
  });
  return <XrayPhotonSpectrumSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
