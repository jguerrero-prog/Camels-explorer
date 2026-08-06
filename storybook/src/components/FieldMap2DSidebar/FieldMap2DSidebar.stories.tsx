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

function Interactive({ initialParams }: { initialParams: FieldMap2DParams }) {
  const [params, setParams] = useState<FieldMap2DParams>(initialParams);
  return <FieldMap2DSidebar params={params} onChange={setParams} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive initialParams={{ suite: 'IllustrisTNG', setName: 'LH', realization: 42, field: 'Mtot' }} />,
};

/** Real usage (ticket #12, added 2026-08-06): a 4×4 "Group view" already
 * active - see FieldMapGroupControl.mdx. */
export const GroupViewActive: Story = {
  render: () => <Interactive initialParams={{ suite: 'IllustrisTNG', setName: 'LH', realization: 42, field: 'Mtot', groupSize: { rows: 4, cols: 4 } }} />,
};

/** Real, deliberate gap: 1P selected - the Group view control doesn't
 * render at all, since 1P's `realization` is a compound string id with no
 * real "next realization" to sequentially fill a grid with. */
export const OnepHidesGroupControl: Story = {
  render: () => <Interactive initialParams={{ suite: 'IllustrisTNG', setName: '1P', realization: 'p11_2', field: 'Mtot' }} />,
};
