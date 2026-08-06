import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GridSizePicker } from './GridSizePicker';
import type { GridSize } from './GridSizePicker';

const meta: Meta<typeof GridSizePicker> = {
  title: 'Fields/GridSizePicker',
  component: GridSizePicker,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-content)', padding: '24px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof GridSizePicker>;

function Interactive() {
  const [selected, setSelected] = useState<GridSize | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <GridSizePicker onSelect={setSelected} />
      <p style={{ fontFamily: 'var(--font-label)', fontSize: 12, color: 'var(--color-text-muted)' }}>
        {selected ? `Last committed: ${selected.rows} × ${selected.cols}` : 'Click a cell to commit'}
      </p>
    </div>
  );
}

/** Real usage: default 6×6 extent - hover to preview the rectangle from
 * the top-left corner, click to commit. Supports non-square sizes (e.g.
 * 4×3) the same way Google Docs'/MS Word's own "Insert Table" tool does. */
export const Default: Story = {
  render: () => <Interactive />,
};

/** A smaller extent (3×3) - the field-map grouping feature this was built
 * for doesn't need this exact size, shown just to confirm the widget
 * isn't hardcoded to 6×6. */
export const SmallerExtent: Story = {
  args: { maxRows: 3, maxCols: 3, onSelect: () => {} },
};
