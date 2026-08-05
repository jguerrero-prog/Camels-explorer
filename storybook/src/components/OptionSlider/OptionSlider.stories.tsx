import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OptionSlider } from './OptionSlider';

const meta: Meta<typeof OptionSlider> = {
  title: 'Fields/OptionSlider',
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-content)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof OptionSlider>;

// Real usage: Power Spectrum's "Grid size" - see PowerSpectrumSidebar.mdx.
function GridSizeDemo() {
  const [grid, setGrid] = useState(512);
  return <OptionSlider label="Grid size" options={[128, 256, 512, 1024]} value={grid} onChange={setGrid} />;
}

export const GridSize: Story = {
  render: () => <GridSizeDemo />,
};

// Real usage: Bispectrum's "Triangle shape" - see BispectrumSidebar.mdx.
const MU_VALUES = [-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9];
function TriangleShapeDemo() {
  const [mu, setMu] = useState(0.5);
  return (
    <OptionSlider
      label="Triangle shape (mu = cos angle between k1, k2)"
      options={MU_VALUES}
      value={mu}
      onChange={setMu}
      formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}${v === 0.5 ? ' (equilateral)' : ''}`}
    />
  );
}

export const TriangleShape: Story = {
  render: () => <TriangleShapeDemo />,
};
