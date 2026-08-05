import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LymanAlphaSpectrumSidebar } from './LymanAlphaSpectrumSidebar';
import type { LymanAlphaSpectrumParams } from './LymanAlphaSpectrumSidebar';

const meta: Meta<typeof LymanAlphaSpectrumSidebar> = {
  title: 'Sections/LymanAlphaSpectrumSidebar',
  component: LymanAlphaSpectrumSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '560px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof LymanAlphaSpectrumSidebar>;

function Interactive() {
  const [params, setParams] = useState<LymanAlphaSpectrumParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    snapnum: 33,
    sightline: 0,
  });
  return <LymanAlphaSpectrumSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
