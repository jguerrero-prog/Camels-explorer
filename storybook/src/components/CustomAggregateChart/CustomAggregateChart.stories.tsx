import type { Meta, StoryObj } from '@storybook/react';
import { CustomAggregateChart } from './CustomAggregateChart';

const meta: Meta<typeof CustomAggregateChart> = {
  title: 'Fields/CustomAggregateChart',
  component: CustomAggregateChart,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '520px', height: '360px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof CustomAggregateChart>;

// Illustrative bucket shapes matching the real /custom/histogram response
// this component renders (see lib/api.ts's fetchCustomHistogram) - not
// fabricated to look nicer than the real, heavily left-skewed distribution
// (most subhalos have near-zero stellar mass).
export const Histogram: Story = {
  args: {
    data: {
      kind: 'histogram',
      xLabel: 'stars [10^{10}M_\\odot/h]',
      logX: false,
      buckets: [
        { x: 0, count: 1_395_396_182 },
        { x: 44.97, count: 21_370 },
        { x: 89.95, count: 3_526 },
        { x: 134.92, count: 1_090 },
        { x: 179.89, count: 390 },
        { x: 224.87, count: 176 },
      ],
    },
  },
};

export const Heatmap: Story = {
  args: {
    data: {
      kind: 'heatmap',
      xLabel: 'stars [10^{10}M_\\odot/h]',
      yLabel: 'Vmax [km/s]',
      logX: false,
      logY: false,
      buckets: [
        { x: 0, y: 0.03, count: 688_072_433 },
        { x: 0, y: 0.49, count: 544_458_784 },
        { x: 0, y: 9.28, count: 107_870_064 },
        { x: 90, y: 177.2, count: 1_298 },
        { x: 180, y: 177.2, count: 65 },
        { x: 270, y: 3382.75, count: 102 },
      ],
    },
  },
};

export const BoxPlot: Story = {
  args: {
    data: {
      kind: 'boxplot',
      xLabel: 'stars [10^{10}M_\\odot/h]',
      valueLabel: 'Vmax [km/s]',
      logX: false,
      buckets: [
        { x: 0, count: 1_395_417_552, min: 0.03, q1: 0.27, median: 0.55, q3: 2.1, max: 64_577.7 },
        { x: 90, count: 4_616, min: 427.8, q1: 3_091, median: 5_975, q3: 10_363, max: 53_070 },
        { x: 180, count: 566, min: 1_216.7, q1: 5_011, median: 9_657, q3: 18_225, max: 49_673 },
        { x: 270, count: 104, min: 3_108.7, q1: 8_458, median: 13_706, q3: 27_456, max: 64_578 },
      ],
    },
  },
};
