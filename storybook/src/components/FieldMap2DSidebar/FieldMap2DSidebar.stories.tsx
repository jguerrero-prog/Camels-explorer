import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FieldMap2DSidebar } from './FieldMap2DSidebar';
import type { FieldMap2DParams } from './FieldMap2DSidebar';

const meta: Meta<typeof FieldMap2DSidebar> = {
  title: 'Sections/FieldMap2DSidebar',
  component: FieldMap2DSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof FieldMap2DSidebar>;

function Interactive() {
  const [params, setParams] = useState<FieldMap2DParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
    field: 'Mtot',
  });
  return <FieldMap2DSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
