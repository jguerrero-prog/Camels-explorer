import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ArrowOverlay } from './ArrowOverlay';
import type { ArrowShape } from './ArrowOverlay';

const meta: Meta<typeof ArrowOverlay> = {
  title: 'Overlays/ArrowOverlay',
  component: ArrowOverlay,
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

type Story = StoryObj<typeof ArrowOverlay>;

const SEED_ARROWS: ArrowShape[] = [
  { id: 'r1', xFracA: 0.2, yFracA: 0.75, xFracB: 0.45, yFracB: 0.3 },
];

function Interactive() {
  const [arrows, setArrows] = useState(SEED_ARROWS);
  const [draftA, setDraftA] = useState<{ xFrac: number; yFrac: number } | null>(null);

  return (
    <div
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const point = { xFrac: (e.clientX - rect.left) / rect.width, yFrac: (e.clientY - rect.top) / rect.height };
        if (!draftA) {
          setDraftA(point);
        } else {
          setArrows((prev) => [...prev, { id: `r${prev.length + 1}`, xFracA: draftA.xFrac, yFracA: draftA.yFrac, xFracB: point.xFrac, yFracB: point.yFrac }]);
          setDraftA(null);
        }
      }}
    >
      <ArrowOverlay
        arrows={arrows}
        onDelete={(id) => setArrows((prev) => prev.filter((a) => a.id !== id))}
        draftA={draftA}
      />
    </div>
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};

export const AwaitingSecondClick: Story = {
  args: { arrows: SEED_ARROWS, onDelete: () => {}, draftA: { xFrac: 0.7, yFrac: 0.7 } },
};
