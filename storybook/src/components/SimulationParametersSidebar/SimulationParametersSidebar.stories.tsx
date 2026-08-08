import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SimulationParametersSidebar } from './SimulationParametersSidebar';
import type { SimulationParametersParams } from './SimulationParametersSidebar';

const meta: Meta<typeof SimulationParametersSidebar> = {
  title: 'Sections/SimulationParametersSidebar',
  component: SimulationParametersSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '360px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof SimulationParametersSidebar>;

function Interactive() {
  const [params, setParams] = useState<SimulationParametersParams>({
    suite: 'IllustrisTNG', setName: 'LH',
  });
  return <SimulationParametersSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
