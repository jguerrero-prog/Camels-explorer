import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PowerSpectrumSidebar } from './PowerSpectrumSidebar';
import type { PowerSpectrumParams } from './PowerSpectrumSidebar';

const meta: Meta<typeof PowerSpectrumSidebar> = {
  title: 'Sections/PowerSpectrumSidebar',
  component: PowerSpectrumSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '1100px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof PowerSpectrumSidebar>;

function Interactive() {
  const [params, setParams] = useState<PowerSpectrumParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [42],
    snapnum: 33,
    grid: 512,
    MAS: 'CIC',
    threads: 1,
    ptypeLabel: 'DM [1]',
    kRange: 'standard',
    rsdLabel: 'Real space (none)',
    multipole: 'P0',
    showLinearPk: false,
  });
  return <PowerSpectrumSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};

function AllKDemo() {
  const [params, setParams] = useState<PowerSpectrumParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [42],
    snapnum: 33,
    grid: 512,
    MAS: 'CIC',
    threads: 1,
    ptypeLabel: 'DM [1]',
    kRange: 'allk',
    rsdLabel: 'Axis 0',
    multipole: 'P2',
    showLinearPk: false,
  });
  return <PowerSpectrumSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

/** Real usage: All-k mode reveals the RSD axis picker, which itself
 * reveals the Multipole radio once a real axis (not "Real space") is
 * picked - two levels of conditional reveal, both real. */
export const AllKWithMultipole: Story = {
  render: () => <AllKDemo />,
};
