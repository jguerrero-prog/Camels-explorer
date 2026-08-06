import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChartModeDropdown } from './ChartModeDropdown';
import type { ChartDisplayMode } from './ChartModeDropdown';

const meta: Meta<typeof ChartModeDropdown> = {
  title: 'Fields/ChartModeDropdown',
  component: ChartModeDropdown,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-content)', padding: '48px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ChartModeDropdown>;

function Interactive({ options }: { options: ChartDisplayMode[] }) {
  const [mode, setMode] = useState<ChartDisplayMode>(options[0]);
  return <ChartModeDropdown mode={mode} options={options} onChange={setMode} />;
}

/** Real usage: all 3 options - a statistic with both a Static PNG and a
 * real per-halo catalog (e.g. Stellar Mass Function). */
export const AllThreeModes: Story = {
  render: () => <Interactive options={['static', 'interactive', 'table']} />,
};

/** Real usage: a field/box-level statistic with no per-halo catalog at all
 * (Power Spectrum, Bispectrum, SFR History) - "Table" is omitted entirely,
 * not shown disabled (see PlotTile's own `availableChartModes`). */
export const NoTableOption: Story = {
  render: () => <Interactive options={['static', 'interactive']} />,
};

/** Real usage: 3D Density Field/3D Particle Cloud have no static-image
 * equivalent at all. Only 2 options here still renders the dropdown -
 * `PlotTile` only omits this component entirely once there's exactly 1
 * real option to show (see below). */
export const InteractiveAndTable: Story = {
  render: () => <Interactive options={['interactive', 'table']} />,
};
