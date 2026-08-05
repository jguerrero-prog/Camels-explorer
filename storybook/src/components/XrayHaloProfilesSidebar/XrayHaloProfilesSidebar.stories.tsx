import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { XrayHaloProfilesSidebar } from './XrayHaloProfilesSidebar';
import type { XrayHaloProfilesParams } from './XrayHaloProfilesSidebar';

const meta: Meta<typeof XrayHaloProfilesSidebar> = {
  title: 'Sections/XrayHaloProfilesSidebar',
  component: XrayHaloProfilesSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof XrayHaloProfilesSidebar>;

function Interactive() {
  const [params, setParams] = useState<XrayHaloProfilesParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
  });
  return <XrayHaloProfilesSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
