import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AhfHaloProfilesSidebar } from './AhfHaloProfilesSidebar';
import type { AhfHaloProfilesParams } from './AhfHaloProfilesSidebar';

const meta: Meta<typeof AhfHaloProfilesSidebar> = {
  title: 'Sections/AhfHaloProfilesSidebar',
  component: AhfHaloProfilesSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '600px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof AhfHaloProfilesSidebar>;

function Interactive() {
  const [params, setParams] = useState<AhfHaloProfilesParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 0,
    snapnum: 33,
    haloRank: 1,
  });
  return (
    <AhfHaloProfilesSidebar
      params={params}
      onChange={setParams}
      onRemove={() => {}}
      maxHaloRank={3133}
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};
