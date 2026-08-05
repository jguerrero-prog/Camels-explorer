import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MassRangeSidebar } from './MassRangeSidebar';
import type { MassRangeParams } from './MassRangeSidebar';
import type { MassRangeStatistic } from './massRangeConfig';
import { MASS_RANGE_CONFIGS } from './massRangeConfig';

const meta: Meta<typeof MassRangeSidebar> = {
  title: 'Sections/MassRangeSidebar',
  component: MassRangeSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '640px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof MassRangeSidebar>;

// Real suite/set fetch requires the API server (localhost:8010) - falls
// back to just the seeded values below if it isn't running, same honest
// pattern as AddPlotModal/CuratedTab.
function Interactive({ statistic }: { statistic: MassRangeStatistic }) {
  const config = MASS_RANGE_CONFIGS[statistic];
  const [params, setParams] = useState<MassRangeParams>({
    suite: 'IllustrisTNG',
    setName: 'LH',
    compareMode: false,
    realizations: [278],
    min: config.defaultMin,
    max: config.defaultMax,
    bins: config.defaultBins,
  });
  return (
    <MassRangeSidebar
      statistic={statistic}
      params={params}
      onChange={setParams}
      onRemove={() => {}}
    />
  );
}

export const StellarMassFunction: Story = {
  render: () => <Interactive statistic="Stellar Mass Function" />,
};

export const HaloMassFunction: Story = {
  render: () => <Interactive statistic="Halo Mass Function" />,
};

export const BaryonFraction: Story = {
  render: () => <Interactive statistic="Baryon Fraction" />,
};
