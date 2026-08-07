import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { UnderlyingHalos } from './UnderlyingHalos';
import type { HaloRow, ColumnDef } from './UnderlyingHalos';

const meta: Meta<typeof UnderlyingHalos> = {
  title: 'Fields/UnderlyingHalos',
  component: UnderlyingHalos,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: '640px', background: 'var(--color-surface-content)', padding: '16px' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof UnderlyingHalos>;

// Illustrative rows, not a real fetched catalog - see UnderlyingHalos.mdx.
const SAMPLE_ROWS: HaloRow[] = Array.from({ length: 353 }, (_, i) => ({
  subfindId: i,
  stellarMass: 1e9 * (1 + (i % 50)),
  gasMass: 5e9 * (1 + (i % 40)),
  dmMass: 2e11 * (1 + (i % 30)),
  bhMass: 1e6 * (1 + (i % 20)),
  sfr: (i % 12) * 0.4,
  vmax: 120 + (i % 25) * 8,
  stellarMetallicity: 0.01 + (i % 10) * 0.002,
}));

// Illustrative raw_frame - a few extra real-ish column names beyond the
// curated 8, not a real catalog fetch.
const SAMPLE_RAW_ROWS = SAMPLE_ROWS.map((r) => ({
  SubfindID: r.subfindId,
  'Stellar Mass [Msun/h]': r.stellarMass,
  'Gas Mass [Msun/h]': r.gasMass,
  'DM Mass [Msun/h]': r.dmMass,
  'BH Mass [Msun/h]': r.bhMass,
  'Half-mass Radius [Mpc/h]': 0.02 + (r.subfindId % 15) * 0.005,
  'SFR [Msun/yr]': r.sfr,
  'Vmax [km/s]': r.vmax,
  'Stellar Metallicity': r.stellarMetallicity,
  SubhaloSpin: 0.03 * (1 + (r.subfindId % 7)),
  SubhaloVelDisp: 80 + (r.subfindId % 20) * 5,
}));

export const Collapsed: Story = {
  args: { rows: SAMPLE_ROWS },
};

export const Expanded: Story = {
  args: { rows: SAMPLE_ROWS, defaultExpanded: true },
};

/** Real fix (2026-08-06, direct user feedback): open this story's
 * fullscreen icon to see `parentTitle` rendered as a muted prefix in
 * front of "View underlying halos" - previously that header carried no
 * indication of which tile it belonged to. */
export const FullscreenWithParentTitle: Story = {
  args: { rows: SAMPLE_ROWS, defaultExpanded: true, parentTitle: 'Power Spectrum' },
};

/** Real usage: "Show all available fields (raw)" - only enabled when
 * rawRows is provided, matching app.py's own disabled=catalog.raw_frame
 * is None. */
export const WithRawFields: Story = {
  args: { rows: SAMPLE_ROWS, rawRows: SAMPLE_RAW_ROWS, defaultExpanded: true },
};

/** Real usage: Halo Mass Function/Baryon Fraction pass this - see
 * UnderlyingHalos.mdx's 2026-08-05 "Real gap disclosed" note. */
export const WithMassContextNote: Story = {
  args: {
    rows: SAMPLE_ROWS,
    defaultExpanded: true,
    massContextNote:
      "Halo Mass Function bins by each halo's total FoF group mass, a different (and coarser) quantity than any column shown below - this table is the same real per-subhalo Subfind catalog Stellar Mass Function uses, not a halo-level one.",
  },
};

/** Real usage: the three mass-range statistics (Stellar Mass Function/Halo
 * Mass Function/Baryon Fraction) - `App.tsx`'s `handleSelectHaloFinder`
 * owns the actual fetch (`GET /halo-catalog/alt`, real for AHF/Rockstar/
 * CAESAR - see backend.py's `get_alt_halo_catalog`), this component only
 * reflects `current`/`options`/`loading` and calls `onSelect`. This story
 * demonstrates the picker's own UI mechanics with local state standing in
 * for that fetch, not a real network call. */
export const WithFinderPicker: Story = {
  render: () => {
    const [finder, setFinder] = useState('Subfind');
    return (
      <UnderlyingHalos
        rows={SAMPLE_ROWS}
        defaultExpanded
        finderPicker={{ current: finder, options: ['Subfind', 'AHF', 'Rockstar', 'CAESAR'], onSelect: setFinder }}
      />
    );
  },
};

// Illustrative rows matching backend.py's real `_fetch_public_vide_catalog`
// column shape (radius/density_contrast top-level, the rest from `extra`) -
// not a real fetched catalog. See UnderlyingHalos.mdx's 2026-08-07
// "Generalized" note and PlotTile.mdx's `catalogTable` docs.
const VOID_COLUMNS: ColumnDef[] = [
  { key: 'radius', label: 'Radius [Mpc/h]', width: 110, format: (r) => (r.radius as number).toFixed(2) },
  { key: 'density_contrast', label: 'Density Contrast (δ)', width: 150, format: (r) => (r.density_contrast as number).toFixed(3) },
  { key: 'void_id', label: 'Void ID', width: 90, format: (r) => String(r.void_id) },
  { key: 'num_part', label: 'Num. Particles', width: 120, format: (r) => String(r.num_part) },
  { key: 'vol [Mpc/h^3]', label: 'Volume [Mpc/h³]', width: 130, format: (r) => (r['vol [Mpc/h^3]'] as number).toFixed(1) },
  { key: 'vol_norm', label: 'Normalized Volume', width: 140, format: (r) => (r.vol_norm as number).toFixed(3) },
  { key: 'central_density', label: 'Central Density', width: 130, format: (r) => (r.central_density as number).toFixed(3) },
  { key: 'tree_level', label: 'Tree Level', width: 100, format: (r) => String(r.tree_level) },
  { key: 'n_children', label: 'N Children', width: 100, format: (r) => String(r.n_children) },
  { key: 'parent_id', label: 'Parent ID', width: 90, format: (r) => String(r.parent_id) },
];

const SAMPLE_VOID_ROWS = Array.from({ length: 42 }, (_, i) => ({
  radius: 4 + (i % 15) * 1.3,
  density_contrast: -0.6 - (i % 10) * 0.03,
  void_id: i,
  num_part: 800 + (i % 20) * 150,
  'vol [Mpc/h^3]': 300 + (i % 25) * 120,
  vol_norm: 1.2 + (i % 8) * 0.4,
  central_density: 0.05 + (i % 6) * 0.02,
  tree_level: i % 4,
  n_children: i % 3,
  parent_id: i > 0 ? i - 1 : -1,
}));

/** Real usage: 3D Density Field's void overlay, via `PlotTile`'s
 * `catalogTable` prop (see PlotTile.mdx) - the same component as every
 * halo-catalog table above, reused rather than forked (direct user
 * request, 2026-08-07). No filter (`app.py`'s own real void table has
 * none - voids number in the dozens/hundreds, not thousands) and no
 * "+ Add a halo finder" button (nonsensical for void data). */
export const VideVoidCatalog: Story = {
  args: {
    rows: SAMPLE_VOID_ROWS,
    columns: VOID_COLUMNS,
    filter: null,
    label: 'View void catalog',
    itemNoun: 'voids',
    footerNoun: 'voids',
    csvFilename: 'IllustrisTNG_LH_0_vide_voids.csv',
    defaultExpanded: true,
  },
};
