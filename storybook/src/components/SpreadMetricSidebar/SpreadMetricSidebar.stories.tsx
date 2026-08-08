import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SpreadMetricSidebar } from './SpreadMetricSidebar';
import type { SpreadMetricParams } from './SpreadMetricSidebar';

const meta: Meta<typeof SpreadMetricSidebar> = {
  title: 'Sections/SpreadMetricSidebar',
  component: SpreadMetricSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof SpreadMetricSidebar>;

function Interactive() {
  const [params, setParams] = useState<SpreadMetricParams>({
    suite: 'SIMBA',
    setName: 'LH',
    realization: 0,
  });
  return <SpreadMetricSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
