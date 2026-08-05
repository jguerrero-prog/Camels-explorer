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
  stellarMetallicity: 0.01 + (i % 10) * 0.002,
}));

// Points directly at the real API server (localhost:8010), same real
// server-rendered PNG as PlotChart's own StaticDefault story.
const IMAGE_BASE = 'http://localhost:8010/api/stellar-mass-function/plot.png?suite=IllustrisTNG&set_name=LH&snapnum=33&SMmin=1e9&SMmax=5e11&bins=10&fetch_public=true';

export const SingleRealization: Story = {
  args: {
    title: 'Stellar Mass Function',
    chart: {
      series: [{ label: 'LH_278', ...decliningCurve(1) }],
      xLabel: 'Stellar mass [Msun/h]',
      yLabel: 'dn/dlogM [(Mpc/h)^-3]',
      imageUrl: `${IMAGE_BASE}&realizations=0`,
    },
    readoutGroups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278' },
      { label: 'Stellar mass range', value: '1e9 – 5e11' },
      { label: 'Bins', value: '10' },
    ],
    halos: { rows: SAMPLE_ROWS },
  },
};

// Real usage: X-ray Halo Profiles/Halo Gas Profiles and 5 other statistics
// (added 2026-08-05) - app.py renders these exclusively via st.pyplot(),
// no Plotly equivalent, so chart.kind is 'static-image' (StaticImageChart,
// no toggle) rather than the default 'plotly' shape above.
export const StaticImageOnly: Story = {
  args: {
    title: 'X-ray Halo Profiles',
    chart: {
      kind: 'static-image',
      imageUrl: 'http://localhost:8010/api/xray-profiles/plot.png?suite=IllustrisTNG&set_name=LH&realization=42&fetch_public=true',
      alt: 'X-ray luminosity profile vs radius, colored by halo mass',
    },
    readoutGroups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realization', value: '42' },
    ],
    halos: null,
  },
};

// Real usage: Power Spectrum/Bispectrum/SFR History (added 2026-08-05) -
// field/box-level statistics with no per-halo catalog concept at all.
// `halos: null` omits "View underlying halos" entirely.
export const NoHalosTable: Story = {
  args: {
    title: 'Power Spectrum',
    chart: {
      series: [{ label: 'LH_278', ...decliningCurve(1) }],
      xLabel: 'k [h/Mpc]',
      yLabel: 'P(k) [(Mpc/h)^3]',
      imageUrl: `${IMAGE_BASE}&realizations=0`,
    },
    readoutGroups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278' },
      { label: 'Grid / MAS', value: '512 · CIC' },
    ],
    halos: null,
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
      imageUrl: `${IMAGE_BASE}&realizations=0&realizations=3`,
    },
    readoutGroups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278, 3' },
      { label: 'Stellar mass range', value: '1e9 – 5e11' },
      { label: 'Bins', value: '10' },
    ],
    halos: { rows: SAMPLE_ROWS },
  },
};

