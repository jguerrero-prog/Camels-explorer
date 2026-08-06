import type { Meta, StoryObj } from '@storybook/react';
import { CopyAsCodePopover } from './CopyAsCodePopover';

const meta: Meta<typeof CopyAsCodePopover> = {
  title: 'Sections/CopyAsCodePopover',
  component: CopyAsCodePopover,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-chrome)', padding: '48px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof CopyAsCodePopover>;

const REAL_CODE = `import backend

result = backend.get_power_spectrum(
    'IllustrisTNG', 'LH', 0, 33,
    grid=512, MAS='CIC', threads=1, ptype='DM [1]',
    fetch_public=True,
)
`;

export const Playground: Story = {
  args: { code: REAL_CODE, onClose: () => {} },
};

const CUSTOM_TILE_CODE = `import flathub_client as fc

rows = fc.data(
    fields=['Subhalo_MassType_stars'],
    filters={
        # params_Omega_m: added as a filter, no range narrowed yet
        'type': 'Subhalo',
    },
)
`;

export const CustomTileCode: Story = {
  args: { code: CUSTOM_TILE_CODE, onClose: () => {} },
};
