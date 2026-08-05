import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GalaxyScalingRelationsSidebar } from './GalaxyScalingRelationsSidebar';
import type { GalaxyScalingRelationsParams } from './GalaxyScalingRelationsSidebar';

const meta: Meta<typeof GalaxyScalingRelationsSidebar> = {
  title: 'Sections/GalaxyScalingRelationsSidebar',
  component: GalaxyScalingRelationsSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '640px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof GalaxyScalingRelationsSidebar>;

function Interactive() {
  const [params, setParams] = useState<GalaxyScalingRelationsParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    snapnum: 33,
    SMmin: 1e9,
    SMmax: 5e11,
    bins: 12,
  });
  return <GalaxyScalingRelationsSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
