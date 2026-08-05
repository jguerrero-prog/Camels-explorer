import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DensityField3DSidebar } from './DensityField3DSidebar';
import type { DensityField3DParams } from './DensityField3DSidebar';

const meta: Meta<typeof DensityField3DSidebar> = {
  title: 'Sections/DensityField3DSidebar',
  component: DensityField3DSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '820px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof DensityField3DSidebar>;

function Interactive() {
  const [params, setParams] = useState<DensityField3DParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    snapnum: 33,
    field: 'Mtot',
    grid: 32,
    isoSurfaces: 12,
    opacity: 0.08,
    showVoids: false,
  });
  return <DensityField3DSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
