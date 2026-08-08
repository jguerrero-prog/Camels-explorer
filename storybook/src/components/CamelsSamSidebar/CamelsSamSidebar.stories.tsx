import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CamelsSamSidebar } from './CamelsSamSidebar';
import type { CamelsSamParams } from './CamelsSamSidebar';

const meta: Meta<typeof CamelsSamSidebar> = {
  title: 'Sections/CamelsSamSidebar',
  component: CamelsSamSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '320px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof CamelsSamSidebar>;

function Interactive() {
  const [params, setParams] = useState<CamelsSamParams>({ setName: 'LH', realization: 0 });
  return <CamelsSamSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
