import type { Meta, StoryObj } from '@storybook/react';
import { FieldMapMosaic } from './FieldMapMosaic';
import type { FieldMapMosaicCell } from './FieldMapMosaic';

const meta: Meta<typeof FieldMapMosaic> = {
  title: 'Charts/FieldMapMosaic',
  component: FieldMapMosaic,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '480px', background: 'var(--color-surface-content)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof FieldMapMosaic>;

// Real image URLs (Storybook dev server proxies /api to the real FastAPI
// backend the same way the Vite app does) - not placeholder rectangles,
// same discipline as every other real-data component's stories.
const IMAGE_BASE = 'http://localhost:8010/api/field-map-2d/plot.png?suite=IllustrisTNG&set_name=LH&field=Mtot&fetch_public=true';

function cellsFor(rows: number, cols: number, start: number, missing: number[] = []): FieldMapMosaicCell[] {
  return Array.from({ length: rows * cols }, (_, i) => {
    const realization = start + i;
    if (missing.includes(realization)) return null;
    return { realization, imageUrl: `${IMAGE_BASE}&realization=${realization}` };
  });
}

/** Real usage: a 4×4 grid, every cell real (realizations 0-15 of
 * IllustrisTNG/LH's Mtot field) - requires the API server running at
 * localhost:8010. */
export const FourByFour: Story = {
  args: { rows: 4, cols: 4, field: 'Mtot', cells: cellsFor(4, 4, 0) },
};

/** Real, honest gap: a few realizations in range don't have real published
 * data (or the API server isn't reachable for them) - those cells show
 * "No data" independently, the rest of the grid renders normally. */
export const SomeCellsMissing: Story = {
  args: { rows: 3, cols: 3, field: 'Mtot', cells: cellsFor(3, 3, 990, [992, 995, 998]) },
};

/** Real usage: a non-square grid (5×4) - GridSizePicker supports this, and
 * the mosaic lays out however many rows/cols it's given. */
export const NonSquareGrid: Story = {
  args: { rows: 4, cols: 5, field: 'T', cells: cellsFor(4, 5, 100) },
};
