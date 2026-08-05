import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ParticleCloud3DSidebar } from './ParticleCloud3DSidebar';
import type { ParticleCloud3DParams } from './ParticleCloud3DSidebar';

const meta: Meta<typeof ParticleCloud3DSidebar> = {
  title: 'Sections/ParticleCloud3DSidebar',
  component: ParticleCloud3DSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '520px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ParticleCloud3DSidebar>;

function Interactive() {
  const [params, setParams] = useState<ParticleCloud3DParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    snapnum: 33,
    maxParticles: 50_000,
  });
  return <ParticleCloud3DSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
