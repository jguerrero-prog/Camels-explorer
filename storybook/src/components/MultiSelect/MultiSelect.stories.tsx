import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MultiSelect } from './MultiSelect';

const meta: Meta<typeof MultiSelect> = {
  title: 'Fields/MultiSelect',
  component: MultiSelect,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: '280px', background: 'var(--color-surface-chrome)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof MultiSelect>;

// Label/values/placeholder are generic, not the real Figma copy
// ("Realizations to compare", "278"/"3", "Add realization…") - see
// MultiSelect.mdx Spec.
function Interactive() {
  const [values, setValues] = useState(['Value 1', 'Value 2']);
  return (
    <MultiSelect
      label="Multi-select label"
      values={values}
      onRemove={(v) => setValues((prev) => prev.filter((x) => x !== v))}
      onAdd={(v) => setValues((prev) => [...prev, v])}
      placeholder="Add value…"
    />
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};

/** Real usage: StellarMassFunctionSidebar's "Realizations to compare" -
 * caption shows the total available count, and the chevron opens a
 * dropdown of every valid value not already added (real usage: every
 * realization 0-999 for a 1,000-realization set). */
function WithOptionsDemo() {
  const [values, setValues] = useState(['278', '3']);
  const allRealizations = Array.from({ length: 1000 }, (_, i) => String(i));
  return (
    <MultiSelect
      label="Realizations to compare"
      values={values}
      onRemove={(v) => setValues((prev) => prev.filter((x) => x !== v))}
      onAdd={(v) => setValues((prev) => (prev.includes(v) ? prev : [...prev, v]))}
      placeholder="Add realization…"
      caption="1,000 realizations available"
      options={allRealizations}
    />
  );
}

export const WithOptions: Story = {
  render: () => <WithOptionsDemo />,
};
