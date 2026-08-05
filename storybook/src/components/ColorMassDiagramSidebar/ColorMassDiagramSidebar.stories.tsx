import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ColorMassDiagramSidebar } from './ColorMassDiagramSidebar';
import type { ColorMassDiagramParams } from './ColorMassDiagramSidebar';

const meta: Meta<typeof ColorMassDiagramSidebar> = {
  title: 'Sections/ColorMassDiagramSidebar',
  component: ColorMassDiagramSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '800px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ColorMassDiagramSidebar>;

function Interactive() {
  const [params, setParams] = useState<ColorMassDiagramParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    snapnum: 33,
    spsModel: 'BC03',
    spectraType: 'attenuated',
    filterFamily: 'SLOAN',
    band1: 'SDSS.g',
    band2: 'SDSS.r',
  });
  return <ColorMassDiagramSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
