import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconRail } from './IconRail';
import type { IconRailPanel } from './IconRail';

const meta: Meta<typeof IconRail> = {
  title: 'Sections/IconRail',
  component: IconRail,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof IconRail>;

function Interactive() {
  const [activePanel, setActivePanel] = useState<IconRailPanel>(null);
  return <IconRail activePanel={activePanel} onSelectPanel={setActivePanel} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};

export const ProjectPanelOpen: Story = {
  args: { activePanel: 'project', onSelectPanel: () => {} },
};
