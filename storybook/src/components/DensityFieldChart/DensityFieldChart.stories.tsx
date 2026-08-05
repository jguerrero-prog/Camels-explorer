import type { Meta, StoryObj } from '@storybook/react';
import { DensityFieldChart } from './DensityFieldChart';

const meta: Meta<typeof DensityFieldChart> = {
  title: 'Fields/DensityFieldChart',
  component: DensityFieldChart,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '640px', height: '560px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof DensityFieldChart>;

// Illustrative small grid (16^3) - not real fetched data (a story must
// render without a live API). Real usage fetches this shape from
// GET /api/density-field-3d - see DensityFieldChart.mdx.
function syntheticGrid(n: number): number[][][] {
  const grid: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const plane: number[][] = [];
    for (let j = 0; j < n; j++) {
      const row: number[] = [];
      for (let k = 0; k < n; k++) {
        const cx = n / 2, cy = n / 2, cz = n / 2;
        const d = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2 + (k - cz) ** 2);
        row.push(Math.exp(-d / 4) + Math.random() * 0.2);
      }
      plane.push(row);
    }
    grid.push(plane);
  }
  return grid;
}

export const Default: Story = {
  args: {
    density: syntheticGrid(24),
    boxSize: 25,
    colorbarTitle: 'ρ/ρ̄',
    isoSurfaces: 12,
    opacity: 0.08,
  },
};

export const WithVoidOverlay: Story = {
  args: {
    density: syntheticGrid(24),
    boxSize: 25,
    colorbarTitle: 'ρ/ρ̄',
    isoSurfaces: 12,
    opacity: 0.08,
    voids: {
      positions: [[5, 5, 5], [18, 12, 8], [10, 20, 15]],
      radius: [3.2, 4.5, 2.1],
      densityContrast: [-0.8, -0.9, -0.7],
      extra: null,
    },
  },
};
