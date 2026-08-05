import type { Meta, StoryObj } from '@storybook/react';
import { UnderlyingHalos } from './UnderlyingHalos';
import type { HaloRow } from './UnderlyingHalos';

const meta: Meta<typeof UnderlyingHalos> = {
  title: 'Fields/UnderlyingHalos',
  component: UnderlyingHalos,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '640px', background: 'var(--color-surface-content)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof UnderlyingHalos>;

// Illustrative rows, not a real fetched catalog - see UnderlyingHalos.mdx.
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

// Illustrative raw_frame - a few extra real-ish column names beyond the
// curated 8, not a real catalog fetch.
const SAMPLE_RAW_ROWS = SAMPLE_ROWS.map((r) => ({
  SubfindID: r.subfindId,
  'Stellar Mass [Msun/h]': r.stellarMass,
  'Gas Mass [Msun/h]': r.gasMass,
  'DM Mass [Msun/h]': r.dmMass,
  'BH Mass [Msun/h]': r.bhMass,
  'Half-mass Radius [Mpc/h]': 0.02 + (r.subfindId % 15) * 0.005,
  'SFR [Msun/yr]': r.sfr,
  'Vmax [km/s]': r.vmax,
  'Stellar Metallicity': r.stellarMetallicity,
  SubhaloSpin: 0.03 * (1 + (r.subfindId % 7)),
  SubhaloVelDisp: 80 + (r.subfindId % 20) * 5,
}));

export const Collapsed: Story = {
  args: { rows: SAMPLE_ROWS },
};

export const Expanded: Story = {
  args: { rows: SAMPLE_ROWS, defaultExpanded: true },
};

/** Real usage: "Show all available fields (raw)" - only enabled when
 * rawRows is provided, matching app.py's own disabled=catalog.raw_frame
 * is None. */
export const WithRawFields: Story = {
  args: { rows: SAMPLE_ROWS, rawRows: SAMPLE_RAW_ROWS, defaultExpanded: true },
};
