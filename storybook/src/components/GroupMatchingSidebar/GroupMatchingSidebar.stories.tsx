import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GroupMatchingSidebar } from './GroupMatchingSidebar';
import type { GroupMatchingParams } from './GroupMatchingSidebar';

const meta: Meta<typeof GroupMatchingSidebar> = {
  title: 'Sections/GroupMatchingSidebar',
  component: GroupMatchingSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof GroupMatchingSidebar>;

function Interactive() {
  const [params, setParams] = useState<GroupMatchingParams>({
    suite: 'IllustrisTNG', setName: 'LH', realization: 0,
  });
  return <GroupMatchingSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
