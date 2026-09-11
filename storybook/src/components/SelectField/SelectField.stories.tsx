import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SelectField } from './SelectField';

const SUITES = ['IllustrisTNG', 'SIMBA', 'Astrid', 'Swift-EAGLE'];
const SETS = [
  'LH · Latin Hypercube',
  'CV · Cosmic Variance',
  '1P · One-Parameter',
  'EX · Extreme',
  'BE · Butterfly Effect',
];
const CATALOG_FIELDS = [
  'Subhalo_Mass', 'Subhalo_MassType_stars', 'Subhalo_MassType_gas', 'Subhalo_MassType_dm',
  'Subhalo_SFR', 'Subhalo_Vmax', 'Subhalo_VelDisp', 'Subhalo_HalfmassRad',
  'Subhalo_GasMetallicity', 'Subhalo_StarMetallicity', 'Subhalo_BHMass', 'Subhalo_BHMdot',
  'Group_Mass', 'Group_SFR', 'Group_Nsubs', 'Group_GasMetallicity',
  'Subhalo_StellarPhotometrics_g', 'Subhalo_StellarPhotometrics_r',
  'Subhalo_HalfmassRadType_stars', 'Subhalo_MassInRadType_stars',
];

const meta: Meta<typeof SelectField> = {
  title: 'Fields/SelectField',
  component: SelectField,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  args: { label: 'Suite', value: 'IllustrisTNG', options: SUITES },
};
export default meta;

type Story = StoryObj<typeof SelectField>;

function Interactive(args: ComponentProps<typeof SelectField>) {
  const [value, setValue] = useState(args.value);
  return <SelectField {...args} value={value} onChange={setValue} />;
}

/** The most common configuration: a short list of suites. Click to open the menu. */
export const Default: Story = { render: (args) => <Interactive {...args} /> };

/** Every control exposed. */
export const Playground: Story = { render: (args) => <Interactive {...args} /> };

/** A caption carries a count or a caveat under the input. */
export const WithCaption: Story = {
  args: { label: 'Set', value: 'LH · Latin Hypercube', options: SETS, caption: '1,000 realizations' },
  render: (args) => <Interactive {...args} />,
};

/** Twenty catalog fields, so the menu scrolls and the search input earns its place. */
export const Searchable: Story = {
  args: { label: 'X field', value: 'Subhalo_Mass', options: CATALOG_FIELDS, searchable: true },
  render: (args) => <Interactive {...args} />,
};

/** Options that exist in the catalog but are not implemented stay visible and dimmed. */
export const WithDisabledOptions: Story = {
  args: {
    label: 'Chart type',
    value: 'Scatterplot',
    options: ['Scatterplot', 'Histogram', 'Heatmap', 'Sky map'],
    disabledOptions: ['Heatmap', 'Sky map'],
  },
  render: (args) => <Interactive {...args} />,
};

/** The longest catalog field name in use, proving the value truncates with an ellipsis. */
export const LongContent: Story = {
  args: {
    label: 'Y field',
    value: 'Subhalo_GasMetallicitySfrWeighted',
    options: ['Subhalo_GasMetallicitySfrWeighted', ...CATALOG_FIELDS],
  },
  render: (args) => <Interactive {...args} />,
};
