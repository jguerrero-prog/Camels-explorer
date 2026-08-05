import type { Meta, StoryObj } from '@storybook/react';
import { PlotChart } from './PlotChart';

const meta: Meta<typeof PlotChart> = {
  title: 'Controls/PlotChart',
  component: PlotChart,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '520px', height: '360px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof PlotChart>;

// Illustrative log-log declining curves - not real fetched data (a story
// must render without a live API) - see PlotChart.mdx for the real source.
function decliningCurve(offset: number) {
  const x = Array.from({ length: 24 }, (_, i) => 1e9 * 10 ** (i * 0.1));
  const y = x.map((v) => (5e-3 * (v / 1e10) ** -1.3) * offset);
  return { x, y };
}

export const SingleSeries: Story = {
  render: () => (
    <PlotChart
      series={[{ label: 'LH_0', ...decliningCurve(1) }]}
      xLabel="Stellar mass [Msun/h]"
      yLabel="dn/dlogM [(Mpc/h)^-3]"
    />
  ),
};

/** Real usage: compare mode overlays one trace per selected realization -
 * see PlotTile.mdx. */
export const CompareMode: Story = {
  render: () => (
    <PlotChart
      series={[
        { label: 'LH_278', ...decliningCurve(1) },
        { label: 'LH_3', ...decliningCurve(1.6) },
      ]}
      xLabel="Stellar mass [Msun/h]"
      yLabel="dn/dlogM [(Mpc/h)^-3]"
    />
  ),
};
