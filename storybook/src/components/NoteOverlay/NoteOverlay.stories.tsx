import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NoteOverlay } from './NoteOverlay';
import type { NoteShape } from './NoteOverlay';

const meta: Meta<typeof NoteOverlay> = {
  title: 'Overlays/NoteOverlay',
  component: NoteOverlay,
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

type Story = StoryObj<typeof NoteOverlay>;

const SEED_NOTES: NoteShape[] = [
  { id: 'n1', xFrac: 0.55, yFrac: 0.3, text: 'Feedback SN scales with halo mass (see arXiv:2201.01345)' },
];

function Interactive() {
  const [notes, setNotes] = useState(SEED_NOTES);
  const [draft, setDraft] = useState<{ xFrac: number; yFrac: number } | null>(null);

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onClick={(e) => {
        if (draft) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setDraft({ xFrac: (e.clientX - rect.left) / rect.width, yFrac: (e.clientY - rect.top) / rect.height });
      }}
    >
      <NoteOverlay
        notes={notes}
        onSaveText={(id, text) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)))}
        onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        onMove={(id, xFrac, yFrac) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, xFrac, yFrac } : n)))}
        draft={draft}
        onSaveDraft={(text) => {
          if (draft) setNotes((prev) => [...prev, { id: `n${prev.length + 1}`, ...draft, text }]);
          setDraft(null);
        }}
        onCancelDraft={() => setDraft(null)}
      />
    </div>
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};

/** The real, flat cardinal-red "index card" treatment (2026-08-06, direct
 * user feedback) - deliberately screenshot-ready for a research
 * presentation slide, not a floating glassmorphic overlay. */
export const OnWhiteChartCard: Story = {
  args: {
    notes: SEED_NOTES,
    onSaveText: () => {},
    onDelete: () => {},
    onMove: () => {},
    draft: null,
    onSaveDraft: () => {},
    onCancelDraft: () => {},
  },
};
