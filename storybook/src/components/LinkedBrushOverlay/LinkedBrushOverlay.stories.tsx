import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LinkedBrushOverlay } from './LinkedBrushOverlay';

const meta: Meta<typeof LinkedBrushOverlay> = {
  title: 'Overlays/LinkedBrushOverlay',
  component: LinkedBrushOverlay,
  parameters: { layout: 'centered', backgrounds: { default: 'light' } },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 560, height: 360, background: 'var(--color-surface-chart)', border: '1px solid var(--color-border-subtle)', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof LinkedBrushOverlay>;

function Interactive() {
  const [range, setRange] = useState<{ start: number; end: number } | null>({ start: 0.3, end: 0.55 });
  return (
    <LinkedBrushOverlay
      captureActive
      xFracStart={range?.start ?? null}
      xFracEnd={range?.end ?? null}
      isSource
      sourceLabel="~Redshift 2.99–5.50 selected"
      onBrush={(start, end) => setRange({ start, end })}
      onClear={() => setRange(null)}
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};

export const SourceTile: Story = {
  args: {
    captureActive: false,
    xFracStart: 0.3,
    xFracEnd: 0.55,
    isSource: true,
    sourceLabel: '~Redshift 2.99–5.50 selected',
    onBrush: () => {},
    onClear: () => {},
  },
};

/** A mirrored (non-source) tile - same fraction-of-width band, but no real
 * data-range label for THIS tile's own axis (see this component's own
 * `xFracStart` docs for why that's a deliberate, not missing, choice). */
export const MirroredTile: Story = {
  args: {
    captureActive: false,
    xFracStart: 0.3,
    xFracEnd: 0.55,
    isSource: false,
    onBrush: () => {},
    onClear: () => {},
  },
};

export const NoSelectionYet: Story = {
  args: {
    captureActive: true,
    xFracStart: null,
    xFracEnd: null,
    isSource: false,
    onBrush: () => {},
    onClear: () => {},
  },
};
