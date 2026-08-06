import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CustomSidebar } from './CustomSidebar';
import { EMPTY_CUSTOM_SELECTION } from '../AddPlotModal/CustomFieldsForm';
import type { CustomSelection } from '../AddPlotModal/CustomFieldsForm';

const meta: Meta<typeof CustomSidebar> = {
  title: 'Sections/CustomSidebar',
  component: CustomSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '640px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof CustomSidebar>;

// Real, live data - `fields`/`tree` are fetched from the actual FastAPI
// backend (api.ts's API_BASE points directly at localhost:8010, not
// relative to Storybook's own port), the same way the real app does. Run
// `uvicorn api.main:app --port 8010` for this to render its fully-loaded
// state rather than the real "Couldn't load real field metadata" error
// path - both are genuine states, not a Storybook-only mock.
function Interactive() {
  const [selection, setSelection] = useState<CustomSelection>({
    ...EMPTY_CUSTOM_SELECTION,
    type: 'Subhalo',
    xField: 'Subhalo_MassType_stars',
    yField: 'Group_Mass',
    activeFilterFields: ['params_Omega_m'],
  });
  return <CustomSidebar selection={selection} onChange={setSelection} onRemove={() => {}} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};
