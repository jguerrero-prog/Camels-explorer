import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BlackholeMergersSidebar } from './BlackholeMergersSidebar';
import type { BlackholeMergersParams } from './BlackholeMergersSidebar';

const meta: Meta<typeof BlackholeMergersSidebar> = {
  title: 'Sections/BlackholeMergersSidebar',
  component: BlackholeMergersSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof BlackholeMergersSidebar>;

function Interactive() {
  const [params, setParams] = useState<BlackholeMergersParams>({
    suite: 'IllustrisTNG', setName: 'LH', realization: 0,
  });
  return <BlackholeMergersSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
