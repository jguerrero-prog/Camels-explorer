import type { Meta, StoryObj } from '@storybook/react';
import { ParticleCloudChart } from './ParticleCloudChart';

const meta: Meta<typeof ParticleCloudChart> = {
  title: 'Fields/ParticleCloudChart',
  component: ParticleCloudChart,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '640px', height: '560px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ParticleCloudChart>;

// Illustrative clustered cloud - not real fetched data (a story must
// render without a live API). Real usage fetches this shape from
// GET /api/particle-cloud - see ParticleCloudChart.mdx.
function clusteredCloud(n: number): number[][] {
  const clusters = Array.from({ length: 6 }, () => [Math.random() * 25, Math.random() * 25, Math.random() * 25]);
  return Array.from({ length: n }, () => {
    const c = clusters[Math.floor(Math.random() * clusters.length)];
    return [
      c[0] + (Math.random() - 0.5) * 4,
      c[1] + (Math.random() - 0.5) * 4,
      c[2] + (Math.random() - 0.5) * 4,
    ];
  });
}

export const Default: Story = {
  args: {
    positions: clusteredCloud(5000),
  },
};
