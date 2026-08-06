import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AnnotationOverlay } from './AnnotationOverlay';
import type { Annotation } from './AnnotationOverlay';

const meta: Meta<typeof AnnotationOverlay> = {
  title: 'Overlays/AnnotationOverlay',
  component: AnnotationOverlay,
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

type Story = StoryObj<typeof AnnotationOverlay>;

const SEED_ANNOTATIONS: Annotation[] = [
  { id: 'a1', xFrac: 0.3, yFrac: 0.35, text: 'Feedback-driven turnover starts here.', createdAt: Date.now() - 5 * 60_000 },
  { id: 'a2', xFrac: 0.7, yFrac: 0.6, text: 'Matches the real AGN-feedback knee reported in arXiv:2201.01345.', createdAt: Date.now() - 3 * 3600_000 },
];

function Interactive() {
  const [annotations, setAnnotations] = useState(SEED_ANNOTATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ xFrac: number; yFrac: number } | null>(null);

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDraft({ xFrac: (e.clientX - rect.left) / rect.width, yFrac: (e.clientY - rect.top) / rect.height });
      }}
    >
      <AnnotationOverlay
        annotations={annotations}
        activeId={draft ? 'new' : activeId}
        onSelect={setActiveId}
        onDelete={(id) => setAnnotations((prev) => prev.filter((a) => a.id !== id))}
        draft={draft}
        onSaveDraft={(text) => {
          if (draft) setAnnotations((prev) => [...prev, { id: `a${prev.length + 1}`, ...draft, text, createdAt: Date.now() }]);
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

export const CalloutOpen: Story = {
  args: {
    annotations: SEED_ANNOTATIONS,
    activeId: 'a2',
    onSelect: () => {},
    onDelete: () => {},
    draft: null,
    onSaveDraft: () => {},
    onCancelDraft: () => {},
  },
};
