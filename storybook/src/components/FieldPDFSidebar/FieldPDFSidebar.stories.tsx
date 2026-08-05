import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FieldPDFSidebar } from './FieldPDFSidebar';
import type { FieldPDFParams } from './FieldPDFSidebar';

const meta: Meta<typeof FieldPDFSidebar> = {
  title: 'Sections/FieldPDFSidebar',
  component: FieldPDFSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof FieldPDFSidebar>;

function Interactive() {
  const [params, setParams] = useState<FieldPDFParams>({
    suite: 'IllustrisTNG',
    field: 'Mtot',
    grid: 128,
    redshift: 0.0,
  });
  return <FieldPDFSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
