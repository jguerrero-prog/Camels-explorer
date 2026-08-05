import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RealizationFields } from './RealizationFields';
import type { RealizationFieldsValue } from './RealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

const meta: Meta<typeof RealizationFields> = {
  title: 'Fields/RealizationFields',
  component: RealizationFields,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof RealizationFields>;

// Real suite/set fetch requires the API server (localhost:8010) - falls
// back to just the seeded values below if it isn't running.
function Interactive() {
  const catalog = useCatalogMetadata();
  const [value, setValue] = useState<RealizationFieldsValue>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [42],
  });
  return <RealizationFields catalog={catalog} value={value} onChange={setValue} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
