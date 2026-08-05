import type { Meta, StoryObj } from '@storybook/react';
import { PlotChart } from './PlotChart';

const meta: Meta<typeof PlotChart> = {
  title: 'Fields/PlotChart',
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

// Points directly at the real API server (localhost:8010) - a genuine
// server-rendered matplotlib PNG, not a placeholder image. Falls back to
// this component's own real error state if the server isn't running (same
// honest-failure pattern as AddPlotModal/CuratedTab).
const REAL_IMAGE_URL =
  'http://localhost:8010/api/stellar-mass-function/plot.png' +
  '?suite=IllustrisTNG&set_name=LH&snapnum=33&SMmin=1e9&SMmax=5e11&bins=10&realizations=0&fetch_public=true';

/** Real usage: the default render mode. Toggle to "Interactive" to see the
 * same Plotly chart from illustrative data (a real fetch would drive both
 * from the same source - see PlotTile.mdx). */
export const StaticDefault: Story = {
  render: () => (
    <PlotChart
      series={[{ label: 'LH_0', ...decliningCurve(1) }]}
      xLabel="Stellar mass [Msun/h]"
      yLabel="dn/dlogM [(Mpc/h)^-3]"
      imageUrl={REAL_IMAGE_URL}
    />
  ),
};
