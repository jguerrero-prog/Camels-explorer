import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from './TopNav';

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
