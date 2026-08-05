import type { Meta, StoryObj } from '@storybook/react';
import { ParamsReadout } from './ParamsReadout';

const meta: Meta<typeof ParamsReadout> = {
  title: 'Fields/ParamsReadout',
  component: ParamsReadout,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-content)', padding: '24px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ParamsReadout>;

/** Real usage shape (Stellar Mass Function): Suite/Set, Realizations
 * (compare), Stellar mass range, Bins - illustrative values, not asserted
 * as confirmed defaults. */
export const Playground: Story = {
  args: {
    groups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278' },
      { label: 'Stellar mass range', value: '1e9 – 5e11' },
      { label: 'Bins', value: '10' },
    ],
  },
};

export const CompareMode: Story = {
  args: {
    groups: [
      { label: 'Suite / Set', value: 'IllustrisTNG · LH' },
      { label: 'Realizations (compare)', value: '278, 3' },
      { label: 'Stellar mass range', value: '1e9 – 5e11' },
      { label: 'Bins', value: '10' },
    ],
  },
};
