import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from './Radio';

const meta: Meta<typeof Radio> = {
  title: 'Fields/Radio',
  component: Radio,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '320px', background: 'var(--color-surface-content)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Radio>;

function Interactive({ label, options, caption }: { label: string; options: string[]; caption?: string }) {
  const [value, setValue] = useState(options[0]);
  return <Radio label={label} value={value} options={options} onChange={setValue} caption={caption} />;
}

// Real usage: Power Spectrum's "k range" - see PowerSpectrumSidebar.mdx.
export const KRange: Story = {
  render: () => (
    <Interactive
      label="k range"
      options={['Standard (k ≤ ~25 h/Mpc)', 'All-k (HIPSTER, up to k~1000 h/Mpc)']}
    />
  ),
};

// Real usage: Power Spectrum's "Multipole" - only shown once an RSD axis is chosen.
export const Multipole: Story = {
  render: () => <Interactive label="Multipole" options={['P0', 'P2', 'P4']} />,
};

// Real usage: Color-Mass Diagram's "Spectra".
export const ThreeOptions: Story = {
  render: () => <Interactive label="Spectra" options={['attenuated', 'intrinsic']} />,
};
