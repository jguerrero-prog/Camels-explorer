import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BispectrumSidebar } from './BispectrumSidebar';
import type { BispectrumParams } from './BispectrumSidebar';

const meta: Meta<typeof BispectrumSidebar> = {
  title: 'Sections/BispectrumSidebar',
  component: BispectrumSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '640px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof BispectrumSidebar>;

function Interactive() {
  const [params, setParams] = useState<BispectrumParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [42],
    field: 'Total Matter',
    muIndex: 7,
  });
  return <BispectrumSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
