import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ICParticlesSidebar } from './ICParticlesSidebar';
import type { ICParticlesParams } from './ICParticlesSidebar';

const meta: Meta<typeof ICParticlesSidebar> = {
  title: 'Sections/ICParticlesSidebar',
  component: ICParticlesSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ICParticlesSidebar>;

function Interactive() {
  const [params, setParams] = useState<ICParticlesParams>({
    suite: 'IllustrisTNG', setName: 'LH', realization: 0, maxParticles: 20_000,
  });
  return <ICParticlesSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
