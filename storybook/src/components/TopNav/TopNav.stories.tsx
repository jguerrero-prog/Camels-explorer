import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from './TopNav';
import { Toolbar } from '../Toolbar/Toolbar';
import type { ViewMode } from '../Toolbar/Toolbar';

const meta: Meta<typeof TopNav> = {
  title: 'Sections/TopNav',
  component: TopNav,
  parameters: { layout: 'fullscreen' },
  args: {
    folderName: 'Untitled',
    projectName: 'Project 1',
    onAddPlot: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof TopNav>;

export const Playground: Story = {};

/** Real usage: once a plot exists on the canvas, Toolbar renders in this
 * same row (Figma node 1012:1124, "header") - not a separate row beneath
 * it. See TopNav.mdx's 2026-08-05 correction. */
function WithToolbarDemo() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  return (
    <TopNav
      folderName="Untitled"
      projectName="Project 1"
      onAddPlot={() => {}}
      toolbar={<Toolbar viewMode={viewMode} onViewModeChange={setViewMode} />}
    />
  );
}

export const WithToolbar: Story = {
  render: () => <WithToolbarDemo />,
};
