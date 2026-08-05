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
}));

export const Collapsed: Story = {
  args: { rows: SAMPLE_ROWS },
};

export const Expanded: Story = {
  args: { rows: SAMPLE_ROWS, defaultExpanded: true },
};
