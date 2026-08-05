import type { Meta, StoryObj } from '@storybook/react';
import { StaticImageChart } from './StaticImageChart';

const meta: Meta<typeof StaticImageChart> = {
  title: 'Fields/StaticImageChart',
  component: StaticImageChart,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '640px', height: '460px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof StaticImageChart>;

// Points at the real API server (localhost:8010) - real X-ray Halo
// Profiles render, one of the statistics this component was built for.
export const RealImage: Story = {
  args: {
    imageUrl: 'http://localhost:8010/api/xray-profiles/plot.png?suite=IllustrisTNG&set_name=LH&realization=42&fetch_public=true',
    alt: 'X-ray luminosity profile vs radius',
  },
};

export const BrokenImage: Story = {
  args: {
    imageUrl: 'http://localhost:8010/api/nonexistent-endpoint',
    alt: 'A chart that fails to load',
  },
};
