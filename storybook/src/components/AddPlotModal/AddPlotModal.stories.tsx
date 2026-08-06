import type { Meta, StoryObj } from '@storybook/react';
import { AddPlotModal } from './AddPlotModal';

const meta: Meta<typeof AddPlotModal> = {
  title: 'Flows/AddPlotModal',
  component: AddPlotModal,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh', background: 'var(--color-surface-content)' }}><Story /></div>],
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmitCurated: () => {},
    onSubmitCustom: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof AddPlotModal>;

/** The Curated tab - real, live-fetched Suite/Set/Realization/Statistic
 * options (see CuratedTab). Requires the API server running at
 * localhost:8010 (`uvicorn api.main:app --port 8010`) - if it's not
 * running, this story shows the real error state instead of hanging. */
export const CuratedTabDefault: Story = {};

/** The Custom tab - real, wired 2026-08-05: every field/option is fetched
 * live from `GET /api/custom/fields` (see CustomTab). Requires the API
 * server running the same as the Curated tab above. */
export const CustomTabReal: Story = {
  args: { initialTab: 'custom' },
};
