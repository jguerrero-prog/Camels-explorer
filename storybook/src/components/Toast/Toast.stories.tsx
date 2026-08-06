import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Sections/Toast',
  component: Toast,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-canvas)', padding: '48px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Toast>;

export const Playground: Story = {
  args: {
    title: 'Copied provenance to clipboard',
    detail:
      "backend.get_power_spectrum('IllustrisTNG', 'LH', 0, snapnum=33, grid=512, MAS='CIC', threads=1, ptype='DM [1]', fetch_public=True) - real public CAMELS Pk file",
  },
};

export const TitleOnly: Story = {
  args: { title: 'Copied provenance to clipboard' },
};

export const ErrorState: Story = {
  args: { title: 'No tile is focused', detail: 'Click a tile first, then use Copy provenance.' },
};
