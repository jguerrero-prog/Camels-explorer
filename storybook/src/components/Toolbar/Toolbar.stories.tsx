import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar } from './Toolbar';
import type { ViewMode } from './Toolbar';

const meta: Meta<typeof Toolbar> = {
  title: 'App Shell/Toolbar',
  component: Toolbar,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  decorators: [(Story) => <div style={{ background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Toolbar>;

function Interactive() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  return <Toolbar viewMode={viewMode} onViewModeChange={setViewMode} />;
}

export const Playground: Story = {
  render: () => <Interactive />,
};

export const StackedActive: Story = {
  args: { viewMode: 'stacked', onViewModeChange: () => {} },
};
