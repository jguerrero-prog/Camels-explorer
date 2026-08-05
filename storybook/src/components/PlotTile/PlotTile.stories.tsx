import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PlotTile } from './PlotTile';
import type { HaloRow } from '../UnderlyingHalos/UnderlyingHalos';

const meta: Meta<typeof PlotTile> = {
  title: 'Sections/PlotTile',
  component: PlotTile,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '720px', height: '520px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof PlotTile>;

// Illustrative log-log curve + illustrative halo rows - not real fetched
// data (a story must render without a live API). See PlotTile.mdx for the
// real GET /api/stellar-mass-function + GET /api/halo-catalog wiring.
function decliningCurve(offset: number) {
  const x = Array.from({ length: 24 }, (_, i) => 1e9 * 10 ** (i * 0.1));
  const y = x.map((v) => (5e-3 * (v / 1e10) ** -1.3) * offset);
  return { x, y };
}

const SAMPLE_ROWS: HaloRow[] = Array.from({ length: 353 }, (_, i) => ({
  subfindId: i,
  stellarMass: 1e9 * (1 + (i % 50)),
  gasMass: 5e9 * (1 + (i % 40)),
  dmMass: 2e11 * (1 + (i % 30)),
  bhMass: 1e6 * (1 + (i % 20)),
  sfr: (i % 12) * 0.4,
  vmax: 120 + (i % 25) * 8,
}));

export const SingleRealization: Story = {
  args: {
    title: 'Stellar Mass Function',
    chart: {
      series: [{ label: 'LH_278', ...decliningCurve(1) }],
      xLabel: 'Stellar mass [Msun/h]',
      yLabel: 'dn/dlogM [(Mpc/h)^-3]',
    },
    readoutGroups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278' },
      { label: 'Stellar mass range', value: '1e9 – 5e11' },
      { label: 'Bins', value: '10' },
    ],
    haloRows: SAMPLE_ROWS,
  },
};

export const CompareMode: Story = {
  args: {
    title: 'Stellar Mass Function',
    chart: {
      series: [
        { label: 'LH_278', ...decliningCurve(1) },
        { label: 'LH_3', ...decliningCurve(1.6) },
      ],
      xLabel: 'Stellar mass [Msun/h]',
      yLabel: 'dn/dlogM [(Mpc/h)^-3]',
    },
    readoutGroups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278, 3' },
      { label: 'Stellar mass range', value: '1e9 – 5e11' },
      { label: 'Bins', value: '10' },
    ],
    haloRows: SAMPLE_ROWS,
  },
};

/** Real usage: clicking a tile focuses it (App.tsx swaps the left 280px
 * slot to that tile's real ParamsSidebar) - toggle here to see the focus
 * ring without wiring a real sidebar. */
function FocusableDemo() {
  const [focused, setFocused] = useState(false);
  return (
    <PlotTile
      title="Stellar Mass Function"
      chart={{
        series: [{ label: 'LH_278', ...decliningCurve(1) }],
        xLabel: 'Stellar mass [Msun/h]',
        yLabel: 'dn/dlogM [(Mpc/h)^-3]',
      }}
      readoutGroups={[
        { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
        { label: 'Realizations (compare)', value: '278' },
        { label: 'Stellar mass range', value: '1e9 – 5e11' },
        { label: 'Bins', value: '10' },
      ]}
      haloRows={SAMPLE_ROWS}
      focused={focused}
      onFocus={() => setFocused((f) => !f)}
    />
  );
}

export const Focusable: Story = {
  render: () => <FocusableDemo />,
};
