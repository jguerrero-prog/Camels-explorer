import type { Meta, StoryObj } from '@storybook/react';
import { Plotly3DChart } from './Plotly3DChart';

const meta: Meta<typeof Plotly3DChart> = {
  title: 'Fields/Plotly3DChart',
  component: Plotly3DChart,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '640px', height: '560px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Plotly3DChart>;

// Illustrative scatter cloud - not real fetched data (a story must render
// without a live API). See DensityFieldChart.mdx/ParticleCloudChart.mdx
// for the real usages built on top of this shared shell.
function randomCloud(n: number) {
  const x: number[] = [], y: number[] = [], z: number[] = [];
  for (let i = 0; i < n; i++) {
    x.push(Math.random() * 25);
    y.push(Math.random() * 25);
    z.push(Math.random() * 25);
  }
  return { x, y, z };
}

export const ScatterExample: Story = {
  args: {
    data: [{
      type: 'scatter3d', mode: 'markers',
      ...randomCloud(2000),
      marker: { size: 1.5, color: '#ffa53c', opacity: 0.5 },
    }],
  },
};
