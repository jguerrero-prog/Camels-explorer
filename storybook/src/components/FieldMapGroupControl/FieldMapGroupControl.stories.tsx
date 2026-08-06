import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FieldMapGroupControl } from './FieldMapGroupControl';
import type { GridSize } from '../GridSizePicker/GridSizePicker';

const meta: Meta<typeof FieldMapGroupControl> = {
  title: 'Fields/FieldMapGroupControl',
  component: FieldMapGroupControl,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ width: 280, background: 'var(--color-surface-content)', padding: '24px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof FieldMapGroupControl>;

function Interactive({ initialValue }: { initialValue: GridSize | null }) {
  const [value, setValue] = useState(initialValue);
  return <FieldMapGroupControl value={value} onChange={setValue} startRealization={42} />;
}

/** Real usage: default state, no group active - matches today's
 * unchanged single-map behavior. */
export const SingleMap: Story = {
  render: () => <Interactive initialValue={null} />,
};

/** Real usage: a 4×4 grid already selected - the trigger shows the
 * committed size and the caption shows the real realization range that
 * will fill it (sequential, row-major, from the tile's own Realization
 * field - here 42, so 42-57). */
export const GridSelected: Story = {
  render: () => <Interactive initialValue={{ rows: 4, cols: 4 }} />,
};
