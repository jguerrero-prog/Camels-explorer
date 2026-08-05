import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SingleRealizationFields } from './SingleRealizationFields';
import type { SingleRealizationFieldsValue } from './SingleRealizationFields';
import { useCatalogMetadata } from '../../lib/useCatalogMetadata';

const meta: Meta<typeof SingleRealizationFields> = {
  title: 'Fields/SingleRealizationFields',
  component: SingleRealizationFields,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof SingleRealizationFields>;

function Interactive() {
  const catalog = useCatalogMetadata();
  const [value, setValue] = useState<SingleRealizationFieldsValue>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    realization: 42,
  });
  return <SingleRealizationFields catalog={catalog} value={value} onChange={setValue} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
