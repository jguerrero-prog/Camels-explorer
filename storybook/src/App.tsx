import { useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { IconRail } from './components/IconRail/IconRail';
import type { IconRailPanel } from './components/IconRail/IconRail';
import { TopNav } from './components/TopNav/TopNav';
import { LoadingIndicator } from './components/LoadingIndicator/LoadingIndicator';
import { Toolbar } from './components/Toolbar/Toolbar';
import type { ViewMode } from './components/Toolbar/Toolbar';
import { Toast } from './components/Toast/Toast';
import { CopyAsCodePopover } from './components/CopyAsCodePopover/CopyAsCodePopover';
import { AnnotationOverlay } from './components/AnnotationOverlay/AnnotationOverlay';
import type { Annotation } from './components/AnnotationOverlay/AnnotationOverlay';
import { ArrowOverlay } from './components/ArrowOverlay/ArrowOverlay';
import type { ArrowShape } from './components/ArrowOverlay/ArrowOverlay';
import { NoteOverlay } from './components/NoteOverlay/NoteOverlay';
import type { NoteShape } from './components/NoteOverlay/NoteOverlay';
import { LinkedBrushOverlay } from './components/LinkedBrushOverlay/LinkedBrushOverlay';
import { RatioDiffPopover } from './components/RatioDiffPopover/RatioDiffPopover';
import { HidePopover } from './components/HidePopover/HidePopover';
import type { HideCategory, HideScope, HideValues } from './components/HidePopover/HidePopover';
import { Viewer } from './components/Viewer/Viewer';
import { Tile } from './components/Tile/Tile';
import { PlotTile } from './components/PlotTile/PlotTile';
import type { PlotTileChart } from './components/PlotTile/PlotTile';
import { CanvasStatsRow } from './components/CanvasStatsRow/CanvasStatsRow';
import { AddPlotModal } from './components/AddPlotModal/AddPlotModal';
import type { CuratedSelection } from './components/AddPlotModal/CuratedTab';
import { EMPTY_CUSTOM_SELECTION, fieldLabel } from './components/AddPlotModal/CustomFieldsForm';
import type { CustomSelection } from './components/AddPlotModal/CustomFieldsForm';
import { CustomSidebar } from './components/CustomSidebar/CustomSidebar';
import { MassRangeSidebar } from './components/MassRangeSidebar/MassRangeSidebar';
import type { MassRangeParams } from './components/MassRangeSidebar/MassRangeSidebar';
import type { MassRangeStatistic } from './components/MassRangeSidebar/massRangeConfig';
import { MASS_RANGE_CONFIGS, isMassRangeStatistic } from './components/MassRangeSidebar/massRangeConfig';
import { PowerSpectrumSidebar, PTYPE_OPTIONS, rsdAxisFromLabel } from './components/PowerSpectrumSidebar/PowerSpectrumSidebar';
import type { PowerSpectrumParams } from './components/PowerSpectrumSidebar/PowerSpectrumSidebar';
import { BispectrumSidebar } from './components/BispectrumSidebar/BispectrumSidebar';
import type { BispectrumParams } from './components/BispectrumSidebar/BispectrumSidebar';
import { SFRHistorySidebar } from './components/SFRHistorySidebar/SFRHistorySidebar';
import type { SFRHistoryParams } from './components/SFRHistorySidebar/SFRHistorySidebar';
import { XrayHaloProfilesSidebar } from './components/XrayHaloProfilesSidebar/XrayHaloProfilesSidebar';
import type { XrayHaloProfilesParams } from './components/XrayHaloProfilesSidebar/XrayHaloProfilesSidebar';
import { HaloGasProfilesSidebar } from './components/HaloGasProfilesSidebar/HaloGasProfilesSidebar';
import type { HaloGasProfilesParams } from './components/HaloGasProfilesSidebar/HaloGasProfilesSidebar';
import { ColorMassDiagramSidebar } from './components/ColorMassDiagramSidebar/ColorMassDiagramSidebar';
import type { ColorMassDiagramParams } from './components/ColorMassDiagramSidebar/ColorMassDiagramSidebar';
import { FieldPDFSidebar } from './components/FieldPDFSidebar/FieldPDFSidebar';
import type { FieldPDFParams } from './components/FieldPDFSidebar/FieldPDFSidebar';
import { LymanAlphaSpectrumSidebar } from './components/LymanAlphaSpectrumSidebar/LymanAlphaSpectrumSidebar';
import type { LymanAlphaSpectrumParams } from './components/LymanAlphaSpectrumSidebar/LymanAlphaSpectrumSidebar';
import { GalaxyScalingRelationsSidebar } from './components/GalaxyScalingRelationsSidebar/GalaxyScalingRelationsSidebar';
import type { GalaxyScalingRelationsParams } from './components/GalaxyScalingRelationsSidebar/GalaxyScalingRelationsSidebar';
import { FieldMap2DSidebar } from './components/FieldMap2DSidebar/FieldMap2DSidebar';
import type { FieldMap2DParams } from './components/FieldMap2DSidebar/FieldMap2DSidebar';
import { FieldMapMosaic } from './components/FieldMapMosaic/FieldMapMosaic';
import { DensityField3DSidebar } from './components/DensityField3DSidebar/DensityField3DSidebar';
import type { DensityField3DParams } from './components/DensityField3DSidebar/DensityField3DSidebar';
import { ParticleCloud3DSidebar } from './components/ParticleCloud3DSidebar/ParticleCloud3DSidebar';
import type { ParticleCloud3DParams } from './components/ParticleCloud3DSidebar/ParticleCloud3DSidebar';
import { ICParticlesSidebar } from './components/ICParticlesSidebar/ICParticlesSidebar';
import type { ICParticlesParams } from './components/ICParticlesSidebar/ICParticlesSidebar';
import { DensityFieldChart } from './components/DensityFieldChart/DensityFieldChart';
import { ParticleCloudChart } from './components/ParticleCloudChart/ParticleCloudChart';
import { Plotly3DChart } from './components/Plotly3DChart/Plotly3DChart';
import { PlotChart } from './components/PlotChart/PlotChart';
import { CustomAggregateChart } from './components/CustomAggregateChart/CustomAggregateChart';
import type { ColumnDef } from './components/UnderlyingHalos/UnderlyingHalos';
import {
  fetchMassRangeResult, fetchHaloCatalog, toHaloRows, fetchAltHaloCatalog,
  fetchMergerHistory, fetchConsistentTreesHistory, fetchBlackholeMergers, massRangeImageUrl,
  fetchPowerSpectrum, powerSpectrumImageUrl,
  fetchBispectrum, bispectrumImageUrl,
  fetchSFRHistory, sfrHistoryImageUrl,
  fetchXrayProfilesMeta, xrayProfilesImageUrl,
  fetchHaloProfilesMeta, haloProfilesImageUrl,
  fetchColorMassDiagramMeta, colorMassDiagramImageUrl,
  fetchFieldPDFMeta, fieldPDFImageUrl,
  fetchLymanAlphaSpectrumMeta, lymanAlphaSpectrumImageUrl,
  fetchScalingRelationsMeta, scalingRelationsImageUrl,
  fetchFieldMap2DMeta, fieldMap2DImageUrl,
  fetchDensityField3D, fetchVoidCatalog,
  fetchParticleCloud,
  fetchSamCatalog, SAM_OCTANTS,
  fetchICParticles, N_IC_FILES,
  fetchProgressive,
  fetchCustomFields, fetchCustomData, buildCustomFilters, fetchCustomHistogram,
} from './lib/api';
import type { Result, VoidCatalog, CustomField, CustomHistogramField, HaloCatalogRow } from './lib/api';
import { CamelsSamSidebar } from './components/CamelsSamSidebar/CamelsSamSidebar';
import type { CamelsSamParams } from './components/CamelsSamSidebar/CamelsSamSidebar';
import { BlackholeMergersSidebar } from './components/BlackholeMergersSidebar/BlackholeMergersSidebar';
import type { BlackholeMergersParams } from './components/BlackholeMergersSidebar/BlackholeMergersSidebar';
import './App.css';

/** DEFAULT_SNAPNUM mirrors backend.py's N_SNAPSHOTS - 1 (highest snapshot,
 * z=0), which the frontend has no direct access to. */
const DEFAULT_SNAPNUM = 33;

/** Real product facts, not filler — see CanvasStatsRow.mdx. */
const CANVAS_STATS = [
  { value: '1,000', label: 'LH Realizations' },
  { value: '4', label: 'suites' },
  { value: '15', label: 'Statistics' },
  { value: '5', label: 'Halo finders' },
];

/** Real columns backend.py's `_fetch_public_vide_catalog` returns (radius/
 * density_contrast top-level, everything else in `extra`) - the same real
 * columns `app.py`'s own "Void catalog fields (VIDE)" expander shows, fed
 * into `UnderlyingHalos` (added 2026-08-07, direct user request to reuse
 * that table rather than build a bespoke one - see PlotTile.tsx's
 * `PlotTileCatalogTable`). */
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

/** Real (wired 2026-08-07, direct user request) - backend.py's already-real
 * get_alt_halo_catalog()/GET /halo-catalog/alt, previously only reachable
 * from app.py's Streamlit Catalog Browser tab. Each finder has its own
 * real column set/units (confirmed directly against backend.py's
 * _fetch_ahf_halos/_fetch_rockstar_halos/_fetch_caesar_halos/
 * _fetch_caesar_galaxies) - not a reshaped version of Subfind's, so this
 * is 4 real column lists, not 1 generic one. */
function massCol(key: string): ColumnDef {
  return { key, label: key, width: 130, format: (r) => (r[key] as number).toExponential(2) };
}
const AHF_COLUMNS: ColumnDef[] = [
  massCol('Halo Mass [Msun/h]'), massCol('Stellar Mass [Msun/h]'), massCol('Gas Mass [Msun/h]'),
  { key: 'Rvir [kpc/h]', label: 'Rvir [kpc/h]', width: 110, format: (r) => (r['Rvir [kpc/h]'] as number).toFixed(1) },
  { key: 'N substructures', label: 'N Substructures', width: 140, format: (r) => String(r['N substructures']) },
];
const ROCKSTAR_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'Halo ID', width: 90, format: (r) => String(r.id) },
  massCol('Halo Mass [Msun/h]'), massCol('Stellar Mass [Msun/h]'), massCol('Gas Mass [Msun/h]'), massCol('BH Mass [Msun/h]'),
  { key: 'Vmax [km/s]', label: 'Vmax [km/s]', width: 100, format: (r) => (r['Vmax [km/s]'] as number).toFixed(1) },
  { key: 'Type', label: 'Type', width: 90, format: (r) => (r.Type === 0 ? 'Central' : 'Satellite') },
];
const CAESAR_HALO_COLUMNS: ColumnDef[] = [
  massCol('Halo Mass [Msun]'), massCol('Stellar Mass [Msun]'), massCol('Gas Mass [Msun]'), massCol('BH Mass [Msun]'),
  { key: 'SFR [Msun/yr]', label: 'SFR [Msun/yr]', width: 110, format: (r) => (r['SFR [Msun/yr]'] as number).toFixed(2) },
];
const CAESAR_GALAXY_COLUMNS: ColumnDef[] = [
  massCol('Stellar Mass [Msun]'), massCol('Gas Mass [Msun]'), massCol('BH Mass [Msun]'), massCol('Total Mass [Msun]'),
  { key: 'SFR [Msun/yr]', label: 'SFR [Msun/yr]', width: 110, format: (r) => (r['SFR [Msun/yr]'] as number).toFixed(2) },
  { key: 'Stellar Half-Mass Radius [kpc/h]', label: 'Half-Mass Radius [kpc/h]', width: 160, format: (r) => (r['Stellar Half-Mass Radius [kpc/h]'] as number).toFixed(2) },
  { key: 'Parent Halo Index', label: 'Parent Halo Index', width: 140, format: (r) => String(r['Parent Halo Index']) },
];

// Real per-suite coverage (backend.py's PUBLIC_AHF_SUITES/
// PUBLIC_ROCKSTAR_SUITES/PUBLIC_CAESAR_SUITES) - small, stable sets
// mirrored directly rather than round-tripped through metadata, same
// precedent as PowerSpectrumSidebar's own PTYPE_OPTIONS.
const HALO_FINDER_CONFIG: Record<string, {
  columns: ColumnDef[]; filterKey: string; itemNoun: string; suites: Set<string>;
}> = {
  AHF: { columns: AHF_COLUMNS, filterKey: 'Stellar Mass [Msun/h]', itemNoun: 'halos', suites: new Set(['IllustrisTNG', 'SIMBA']) },
  Rockstar: { columns: ROCKSTAR_COLUMNS, filterKey: 'Stellar Mass [Msun/h]', itemNoun: 'halos', suites: new Set(['IllustrisTNG', 'SIMBA', 'Astrid']) },
  CAESAR: { columns: CAESAR_HALO_COLUMNS, filterKey: 'Stellar Mass [Msun]', itemNoun: 'halos', suites: new Set(['IllustrisTNG', 'SIMBA']) },
  'CAESAR Galaxies': { columns: CAESAR_GALAXY_COLUMNS, filterKey: 'Stellar Mass [Msun]', itemNoun: 'galaxies', suites: new Set(['IllustrisTNG', 'SIMBA']) },
};

function availableHaloFinders(suite: string): string[] {
  return ['Subfind', ...Object.keys(HALO_FINDER_CONFIG).filter((f) => HALO_FINDER_CONFIG[f].suites.has(suite))];
}

/** CAMELS-SAM's real two-panel chart, matching `app.py`'s own `st.columns(2)`
 * layout (a real matplotlib mass-mass scatter + a real Plotly 3D position
 * scatter) - built directly from the already-fetched catalog rows, since
 * there's no existing `_render_result_png`/`fetchXxxResult` backend path
 * for an ad-hoc scatter the way every other statistic's own chart has.
 * Native Plotly for both panels rather than porting the matplotlib one -
 * `PlotChart` already renders exactly this shape (log-log scatter,
 * `mode: 'markers'`), so no new backend/API surface was needed. */
function CamelsSamCharts({ rows }: { rows: HaloCatalogRow[] }) {
  const haloMass = rows.map((r) => r['Halo Mass [Msun]']);
  const stellarMass = rows.map((r) => r['Stellar Mass [Msun]']);
  const sfr = rows.map((r) => r['SFR [Msun/yr]']);
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <PlotChart
          series={[{ label: 'galaxies', x: haloMass, y: stellarMass }]}
          xLabel="Halo mass [Msun]"
          yLabel="Stellar mass [Msun]"
          logX
          logY
          mode="markers"
          displayMode="interactive"
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Plotly3DChart
          xLabel="x [Mpc]"
          yLabel="y [Mpc]"
          zLabel="z [Mpc]"
          pinEnabled={false}
          data={[{
            type: 'scatter3d',
            mode: 'markers',
            x: rows.map((r) => r['x [Mpc]']),
            y: rows.map((r) => r['y [Mpc]']),
            z: rows.map((r) => r['z [Mpc]']),
            marker: {
              size: 4,
              color: stellarMass.map((m) => Math.log10(m)),
              colorscale: 'Inferno',
              showscale: true,
              colorbar: { title: { text: 'log10 M*', font: { color: '#e5e7eb' } }, tickfont: { color: '#e5e7eb' } },
            },
            text: rows.map((_, i) => `M* = ${stellarMass[i].toExponential(2)} Msun<br>Mhalo = ${haloMass[i].toExponential(2)} Msun<br>SFR = ${sfr[i].toFixed(3)} Msun/yr`),
            hoverinfo: 'text',
          }]}
        />
      </div>
    </div>
  );
}

/** Real columns backend.py's `get_sam_catalog` returns (see
 * CamelsSamSidebar.mdx) - fed into `UnderlyingHalos` via `PlotTile`'s
 * `halos` prop, and into the tile's own scatter/3D charts (`loadCamelsSamTile`). */
const SAM_COLUMNS: ColumnDef[] = [
  massCol('Stellar Mass [Msun]'), massCol('Halo Mass [Msun]'), massCol('BH Mass [Msun]'), massCol('Cold Gas Mass [Msun]'),
  { key: 'SFR [Msun/yr]', label: 'SFR [Msun/yr]', width: 110, format: (r) => (r['SFR [Msun/yr]'] as number).toFixed(3) },
  { key: 'x [Mpc]', label: 'x [Mpc]', width: 90, format: (r) => (r['x [Mpc]'] as number).toFixed(2) },
  { key: 'y [Mpc]', label: 'y [Mpc]', width: 90, format: (r) => (r['y [Mpc]'] as number).toFixed(2) },
  { key: 'z [Mpc]', label: 'z [Mpc]', width: 90, format: (r) => (r['z [Mpc]'] as number).toFixed(2) },
];

/** Real columns backend.py's `get_blackhole_mergers` returns (see
 * BlackholeMergersSidebar.mdx for the real, undocumented-by-CAMELS column
 * meaning this was inferred from). */
const BLACKHOLE_MERGERS_COLUMNS: ColumnDef[] = [
  { key: 'Redshift', label: 'Redshift', width: 90, format: (r) => (r.Redshift as number).toFixed(2) },
  { key: 'Swallower BH ID', label: 'Swallower BH ID', width: 130, format: (r) => String(r['Swallower BH ID']) },
  massCol('Swallower BH Mass [Msun/h]'),
  { key: 'Swallowed BH ID', label: 'Swallowed BH ID', width: 130, format: (r) => String(r['Swallowed BH ID']) },
  massCol('Swallowed BH Mass [Msun/h]'),
];

type PlotTileState = {
  id: string;
  kind: 'mass-range';
  statistic: MassRangeStatistic;
  params: MassRangeParams;
  series: { label: string; x: number[]; y: number[] }[];
  xLabel: string;
  yLabel: string;
  logX: boolean;
  logY: boolean;
  haloRows: ReturnType<typeof toHaloRows>;
  haloRawRows: Record<string, number>[] | null;
  /** Real (added 2026-08-07, direct user request: wire in the alternate
   * halo finders) - 'Subfind' means the two `halo*` fields above are what's
   * shown; anything else means `altRows`/`altRawRows` are, fetched from
   * `GET /halo-catalog/alt` on demand (see `handleSelectHaloFinder`). Reset
   * to 'Subfind' whenever suite/set/realization/snapnum change (the same
   * fields that invalidate `haloRows` itself) - a stale AHF table under a
   * newly-selected suite AHF doesn't even cover would be a worse UX than
   * just resetting the picker. */
  altFinder: string;
  altRows: Record<string, unknown>[];
  altRawRows: Record<string, number>[] | null;
  altLoading: boolean;
  /** Real (added 2026-08-07, direct user request: wire in SubLink/
   * SubLink_gal merger history and Rockstar Consistent Trees) - "Trace a
   * subhalo's merger history". `mergerTreeVariant` only matters when
   * `altFinder === 'Subfind'` (SubLink vs SubLink_gal); Rockstar always
   * uses Consistent Trees, no variant choice. `null` mergerHistoryData
   * means "not fetched yet or no data returned" - `error` distinguishes
   * an actual fetch failure from a genuine "no tree entry" 404. Reset to
   * an unset state whenever altFinder/params change, same reasoning as
   * altRows above - a stale trace under a newly-selected finder or
   * snapshot would silently show the wrong subhalo's history. */
  mergerTreeId: number | null;
  mergerTreeVariant: 'SubLink' | 'SubLink_gal';
  mergerTreeData: { redshift: number[]; mass: number[]; note: string } | null;
  mergerTreeLoading: boolean;
  mergerTreeError?: string;
  /** Real backend.py Result.note for realizations[0] - added 2026-08-06 for
   * the toolbar's Copy provenance tool (see describeTileProvenance). Same
   * field the other 9 static-image tile kinds already carried; this
   * statistic's own note was already computed server-side (to_jsonable()
   * serializes every Result field), just never read here before now. */
  note: string;
  loading: boolean;
  error?: string;
};

/** Power Spectrum/Bispectrum/SFR History (added 2026-08-05) - the three
 * remaining statistics sharing backend.py's _render_result_png path, but
 * each with a genuinely different control surface (own sidebar) and no
 * per-halo catalog concept (PlotTile's halos prop is always null for
 * these). */
type PowerSpectrumTileState = {
  id: string;
  kind: 'power-spectrum';
  params: PowerSpectrumParams;
  series: { label: string; x: number[]; y: number[] }[];
  xLabel: string;
  yLabel: string;
  logX: boolean;
  logY: boolean;
  note: string;
  loading: boolean;
  error?: string;
};

type BispectrumTileState = {
  id: string;
  kind: 'bispectrum';
  params: BispectrumParams;
  series: { label: string; x: number[]; y: number[] }[];
  xLabel: string;
  yLabel: string;
  logX: boolean;
  logY: boolean;
  note: string;
  loading: boolean;
  error?: string;
};

type SFRHistoryTileState = {
  id: string;
  kind: 'sfr-history';
  params: SFRHistoryParams;
  series: { label: string; x: number[]; y: number[] }[];
  xLabel: string;
  yLabel: string;
  logX: boolean;
  logY: boolean;
  note: string;
  loading: boolean;
  error?: string;
};

/** X-ray Halo Profiles/Halo Gas Profiles (added 2026-08-05) - real-data
 * only, colored-by-mass multi-line charts with no Plotly equivalent
 * (PlotTile's chart.kind: 'static-image'). `note`/`nHalos` come from the
 * one real JSON fetch each does (see fetchXrayProfilesMeta/
 * fetchHaloProfilesMeta) - the chart itself is the PNG. */
type XrayHaloProfilesTileState = {
  id: string;
  kind: 'xray-halo-profiles';
  params: XrayHaloProfilesParams;
  note: string;
  nHalos: number;
  loading: boolean;
  error?: string;
};

type HaloGasProfilesTileState = {
  id: string;
  kind: 'halo-gas-profiles';
  params: HaloGasProfilesParams;
  note: string;
  nHalos: number;
  loading: boolean;
  error?: string;
};

/** Color-Mass Diagram/Field PDF/Lyman-alpha Spectrum (added 2026-08-05) -
 * the final three statistics, completing all 15. All real-data only,
 * no Plotly equivalent (PlotTile's chart.kind: 'static-image'), no
 * per-halo catalog concept. */
type ColorMassDiagramTileState = {
  id: string;
  kind: 'color-mass-diagram';
  params: ColorMassDiagramParams;
  note: string;
  nGalaxies: number;
  loading: boolean;
  error?: string;
};

type FieldPDFTileState = {
  id: string;
  kind: 'field-pdf';
  params: FieldPDFParams;
  note: string;
  loading: boolean;
  error?: string;
};

type LymanAlphaSpectrumTileState = {
  id: string;
  kind: 'lyman-alpha-spectrum';
  params: LymanAlphaSpectrumParams;
  note: string;
  loading: boolean;
  error?: string;
};

/** Galaxy Scaling Relations/2D Field Map/3D Density Field/3D Particle Cloud
 * (added 2026-08-05) - the final four statistics, completing all 15.
 * Galaxy Scaling Relations/2D Field Map are static-image; 3D Density
 * Field/3D Particle Cloud are plotly-3d and store their own raw fetched
 * data (density grid, positions, void overlay) rather than a pre-built
 * chart node, so the tile-render switch below can build
 * the real DensityFieldChart/ParticleCloudChart element fresh each render. */
type GalaxyScalingRelationsTileState = {
  id: string;
  kind: 'galaxy-scaling-relations';
  params: GalaxyScalingRelationsParams;
  note: string;
  source: string;
  loading: boolean;
  error?: string;
};

type FieldMap2DTileState = {
  id: string;
  kind: 'field-map-2d';
  params: FieldMap2DParams;
  note: string;
  source: string;
  /** Real (ticket #12, added 2026-08-06) - only set when `params.groupSize`
   * is active. One entry per grid cell, row-major, `null` for a
   * realization with no real published map (out of range, or a suite/
   * field CMD doesn't publish) - PlotTile renders a mosaic instead of the
   * single `imageUrl` image when this is present. */
  cells?: ({ realization: number; note: string; source: string } | null)[];
  loading: boolean;
  error?: string;
};

type DensityField3DTileState = {
  id: string;
  kind: 'density-field-3d';
  params: DensityField3DParams;
  density: number[][][];
  boxSize: number;
  note: string;
  source: string;
  voids: VoidCatalog | null;
  loading: boolean;
  error?: string;
};

type ParticleCloud3DTileState = {
  id: string;
  kind: 'particle-cloud-3d';
  params: ParticleCloud3DParams;
  positions: number[][];
  note: string;
  source: string;
  loading: boolean;
  error?: string;
};

/** Initial Conditions (added 2026-08-07). Originally sampled just one of
 * N_IC_FILES real Gadget Format I files; per direct user request
 * ("actually wire in all 47... use lazy loading... so we don't slow down
 * the site") this now renders file 0 immediately (fast first paint, see
 * loadICParticlesTile) then fetches the remaining 46 in the background
 * with capped concurrency, appending their particles as they land (see
 * streamRemainingICFiles) - `filesLoaded` tracks progress for the tile's
 * own readout rather than blocking the UI on all 47 up front. */
type ICParticles3DTileState = {
  id: string;
  kind: 'ic-particles-3d';
  params: ICParticlesParams;
  positions: number[][];
  note: string;
  source: string;
  filesLoaded: number;
  loading: boolean;
  error?: string;
};

/** CAMELS-SAM (added 2026-08-07, direct user request) - `app.py`'s own
 * "CAMELS-SAM" tab, backed by the already-real `get_sam_catalog()`/
 * `GET /sam-catalog`. Genuinely different from every catalog-backed tile
 * above: no Suite/Set at all (hardcoded to the LH set - see
 * `CamelsSamSidebar.mdx`), and its own chart is built directly from the
 * same real catalog rows the table shows (no separate `_render_result_png`/
 * `fetchXxxResult` path - there's no existing backend render function for
 * an ad-hoc mass-mass scatter, so this uses the already-fetched rows with
 * plain client-side Plotly, same as the Custom tab's own scatter charts). */
type CamelsSamTileState = {
  id: string;
  kind: 'camels-sam';
  params: CamelsSamParams;
  rows: HaloCatalogRow[];
  rawRows: HaloCatalogRow[] | null;
  note: string;
  // Octant 0 renders immediately (fast first paint); the remaining 7 of
  // SAM_OCTANTS load in the background and append here (2026-08-07, direct
  // user request - see streamRemainingSamOctants) - tracks progress rather
  // than blocking on the complete 8-octant realization up front.
  octantsLoaded: number;
  loading: boolean;
  error?: string;
};

/** Black Hole Mergers (added 2026-08-07, direct user request) - a genuinely
 * new statistic, not a Streamlit-to-React port (app.py never had this).
 * `get_blackhole_mergers()`'s only real output shape is a per-event table
 * (redshift, swallower/swallowed BH id+mass) - `rows` doubles as both the
 * chart's own scatter data and the Table mode's real catalog, same
 * `HaloCatalogRow[]` shape every other real catalog-backed tile uses. */
type BlackholeMergersTileState = {
  id: string;
  kind: 'blackhole-mergers';
  params: BlackholeMergersParams;
  rows: HaloCatalogRow[];
  note: string;
  loading: boolean;
  error?: string;
};

/** Custom tile (added 2026-08-05) - the Add Plot modal's "Custom" tab,
 * real and wired against Flatiron's own live FlatHUB API (see
 * api/routers/custom.py, CustomTab.tsx). Genuinely different from every
 * other tile kind above: `params` (here `selection`) has no single suite/
 * set/realization at all - a query can pool rows across the whole
 * ~2.9B-row ensemble. `points`/`xLabel`/`yLabel` are the real, already-
 * fetched-and-reshaped rows (see loadCustomTile) that PlotChart's new
 * `mode: 'markers'` renders directly - no per-realization catalog/halos
 * concept, so `halos` is always null at the PlotTile call site, same as
 * Power Spectrum/Bispectrum/SFR History. */
/** Real, per-chart-type result shapes for the Custom tile (extended
 * 2026-08-06 from Scatterplot-only) - each of FlatHUB's 5 real chart types
 * needs a genuinely different response shape (raw rows for Scatterplot/3D
 * Scatterplot vs. FlatHUB's own histogram buckets for the other 3), so
 * this is a discriminated union on `kind`, not one shape with unused
 * fields. See loadCustomTile for how each is built, CustomAggregateChart/
 * Plotly3DChart for how each renders. */
type CustomScatterResult = {
  kind: 'scatter';
  points: { x: number; y: number; color?: number }[];
  xLabel: string;
  yLabel: string;
  colorLabel: string;
};

type CustomScatter3DResult = {
  kind: 'scatter3d';
  points: { x: number; y: number; z: number; color?: number }[];
  xLabel: string;
  yLabel: string;
  zLabel: string;
  colorLabel: string;
};

type CustomHistogramResult = {
  kind: 'histogram';
  buckets: { x: number; count: number }[];
  xLabel: string;
};

type CustomHeatmapResult = {
  kind: 'heatmap';
  buckets: { x: number; y: number; count: number }[];
  xLabel: string;
  yLabel: string;
};

type CustomBoxplotResult = {
  kind: 'boxplot';
  buckets: { x: number; min: number; q1: number; median: number; q3: number; max: number; count: number }[];
  xLabel: string;
  valueLabel: string;
};

type CustomResult =
  | CustomScatterResult
  | CustomScatter3DResult
  | CustomHistogramResult
  | CustomHeatmapResult
  | CustomBoxplotResult;

/** Real client-side x-values for whichever real result a Custom tile
 * currently holds - Linked brushing's `brushSourceLabel` needs a flat
 * x-array regardless of chart type (raw rows for scatter/scatter3d,
 * bucket left-edges for histogram/heatmap/boxplot). */
function customResultXs(result: CustomResult): number[] {
  return result.kind === 'scatter' || result.kind === 'scatter3d'
    ? result.points.map((p) => p.x)
    : result.buckets.map((b) => b.x);
}

function customResultXLabel(result: CustomResult): string {
  return result.xLabel;
}

/** Real tile title per Custom chart type - single source of truth shared
 * by `tileDisplayTitle` (Ratio/diff candidate labels, Copy provenance) and
 * the tile's own PlotTile `title=` prop, so the two can never drift (see
 * PlotTile.mdx's Usecase precedent for every other tile kind's title). */
function customTileTitle(result: CustomResult | null): string {
  if (!result) return 'Custom plot';
  switch (result.kind) {
    case 'scatter': return result.yLabel && result.xLabel ? `${result.yLabel} vs ${result.xLabel}` : 'Custom Scatterplot';
    case 'scatter3d': return result.zLabel && result.yLabel && result.xLabel
      ? `${result.zLabel} vs ${result.yLabel} vs ${result.xLabel}` : 'Custom 3D Scatterplot';
    case 'histogram': return result.xLabel ? `Histogram of ${result.xLabel}` : 'Custom Histogram';
    case 'heatmap': return result.yLabel && result.xLabel ? `${result.yLabel} vs ${result.xLabel} (heatmap)` : 'Custom Heatmap';
    case 'boxplot': return result.valueLabel && result.xLabel ? `${result.valueLabel} by ${result.xLabel}` : 'Custom Box Plot';
    default: return 'Custom plot';
  }
}

type CustomTileState = {
  id: string;
  kind: 'custom';
  selection: CustomSelection;
  result: CustomResult | null;
  matchedCount: number;
  loading: boolean;
  error?: string;
};

/** Every other statistic still adds this title-only tile - see
 * PlotTile.mdx's Usecase for which statistics have a real wired chart
 * so far. */
type EmptyTileState = { id: string; kind: 'empty'; title: string };

type CanvasTile =
  | PlotTileState
  | PowerSpectrumTileState
  | BispectrumTileState
  | SFRHistoryTileState
  | XrayHaloProfilesTileState
  | HaloGasProfilesTileState
  | ColorMassDiagramTileState
  | FieldPDFTileState
  | LymanAlphaSpectrumTileState
  | GalaxyScalingRelationsTileState
  | FieldMap2DTileState
  | DensityField3DTileState
  | ParticleCloud3DTileState
  | ICParticles3DTileState
  | CamelsSamTileState
  | BlackholeMergersTileState
  | CustomTileState
  | EmptyTileState;

/** Mirrors the literal `title=` string each tile kind's own PlotTile
 * render call already uses - kept as one lookup rather than threading a
 * title field onto every tile state type, since these strings are already
 * the real, single source of truth for what's on screen. Top-level (not
 * inside the App component) so describeTileProvenance can reuse it for
 * the citation sentence's statistic name, rather than duplicating this
 * switch a second time. */
function tileDisplayTitle(tile: CanvasTile): string {
  switch (tile.kind) {
    case 'mass-range': return tile.statistic;
    case 'power-spectrum': return 'Power Spectrum';
    case 'bispectrum': return 'Bispectrum';
    case 'sfr-history': return 'SFR History';
    case 'xray-halo-profiles': return 'X-ray Halo Profiles';
    case 'halo-gas-profiles': return 'Halo Gas Profiles';
    case 'color-mass-diagram': return 'Color-Mass Diagram';
    case 'field-pdf': return 'Field PDF';
    case 'lyman-alpha-spectrum': return 'Lyman-alpha Spectrum';
    case 'galaxy-scaling-relations': return 'Galaxy Scaling Relations';
    case 'field-map-2d': return '2D Field Map';
    case 'density-field-3d': return '3D Density Field';
    case 'particle-cloud-3d': return '3D Particle Cloud';
    case 'ic-particles-3d': return 'Initial Conditions';
    case 'camels-sam': return 'CAMELS-SAM';
    case 'blackhole-mergers': return 'Black Hole Mergers';
    case 'custom': return customTileTitle(tile.result);
    case 'empty': return tile.title;
    default: return '';
  }
}

// The two real CAMELS papers every public-data statistic in this app is
// built from, regardless of suite/set/statistic - verified directly
// against the arXiv abstract pages (2026-08-07, direct user request: Copy
// provenance was leaking internal-engineering language like "fetched and
// appended progressively" into text meant to go in a manuscript). Suite/
// statistic-specific papers (e.g. CAMELS-SAM's own Perez et al. 2023)
// deliberately not included - the two below are always correct for every
// tile, a per-statistic paper would need its own independent verification
// and isn't worth the added citation-accuracy surface right now.
const CAMELS_CITATION = 'the CAMELS project (Villaescusa-Navarro et al. 2021, 2023)';
const CAMELS_DATA_URL = 'https://camels.readthedocs.io';

/** Manuscript-ready citation sentence for a tile - the toolbar's Copy
 * provenance tool (Figma node 1066-10) copies this to the clipboard
 * verbatim. Deliberately NOT backend.py's own Result.note (that free text
 * is written for internal/debugging purposes - HTTP Range requests, byte
 * offsets, which of N files was sampled - exactly the language a peer
 * reviewer would flag). This is built fresh from each tile's own
 * structured suite/set/realization params instead, so it's always a
 * clean sentence regardless of how the engineering note reads. `null` for
 * a tile with nothing to describe yet (empty, or a tile that hasn't
 * finished its first real fetch). */
function describeTileProvenance(tile: CanvasTile): string | null {
  if (tile.kind === 'empty') return null;
  const statistic = tileDisplayTitle(tile) || 'Data';

  if (tile.kind === 'custom') {
    return `${statistic} from ${CAMELS_CITATION}, queried live via the public FlatHub interface, ${CAMELS_DATA_URL}.`;
  }
  if (tile.kind === 'camels-sam') {
    return `${statistic} (Santa Cruz Semi-Analytic Model, LH set, realization ${tile.params.realization}) from ${CAMELS_CITATION}, ${CAMELS_DATA_URL}.`;
  }

  const p = 'params' in tile ? (tile.params as Record<string, unknown>) : null;
  const suite = p && typeof p.suite === 'string' ? p.suite : null;
  const setName = p && typeof p.setName === 'string' ? p.setName : null;
  const realizations = p && Array.isArray(p.realizations)
    ? p.realizations.map(String)
    : p && typeof p.realization !== 'undefined'
      ? [String(p.realization)]
      : [];
  const realizationText = realizations.length === 0
    ? ''
    : realizations.length === 1
      ? `, realization ${realizations[0]}`
      : `, realizations ${realizations.join(', ')}`;

  if (suite && setName) {
    return `${statistic} for ${suite} (${setName} set${realizationText}) from ${CAMELS_CITATION}, ${CAMELS_DATA_URL}.`;
  }
  return `${statistic} from ${CAMELS_CITATION}, ${CAMELS_DATA_URL}.`;
}

const py = (s: string | number | boolean) =>
  typeof s === 'string' ? `'${s.replace(/'/g, "\\'")}'`
    : typeof s === 'boolean' ? (s ? 'True' : 'False')
      : String(s);

const MASS_RANGE_FUNCTION: Record<MassRangeStatistic, { fn: string; rangeArgs: [string, string] }> = {
  'Halo Mass Function': { fn: 'get_halo_mass_function', rangeArgs: ['RMmin', 'RMmax'] },
  'Baryon Fraction': { fn: 'get_baryon_fraction', rangeArgs: ['RMmin', 'RMmax'] },
  'Stellar Mass Function': { fn: 'get_stellar_mass_function', rangeArgs: ['SMmin', 'SMmax'] },
};

/** Real, runnable Python for the toolbar's Copy as code tool (Figma node
 * 1076-10's "Plot Code" popover) - templated directly against backend.py's
 * own real function signatures, not the aspirational `camels_viz` API
 * shown in the Figma copy (`cv.load(...)`/`sim.get_sfr_history()` don't
 * exist anywhere in this codebase). Matches this app's own established
 * real-vs-fabricated discipline (see e.g. CustomFilterValues' "no
 * fallback range" rule) - showing code that can't actually run would be
 * exactly the kind of dishonesty this project has avoided everywhere
 * else. Every real per-file/per-catalog statistic maps onto exactly the
 * backend.py call App.tsx's own loadXTile already makes; Custom instead
 * calls the vendored flathub_client.py directly, since there is no
 * single backend.py function behind a live FlatHUB query. */
function generateTileCode(tile: CanvasTile): string | null {
  const header = 'import backend\n\n';
  switch (tile.kind) {
    case 'mass-range': {
      const { fn, rangeArgs } = MASS_RANGE_FUNCTION[tile.statistic];
      const p = tile.params;
      return `${header}result = backend.${fn}(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realizations[0])}, ${p.snapnum},\n`
        + `    ${rangeArgs[0]}=${p.min}, ${rangeArgs[1]}=${p.max}, bins=${p.bins},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'power-spectrum': {
      const p = tile.params;
      return `${header}result = backend.get_power_spectrum(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realizations[0])}, ${p.snapnum},\n`
        + `    grid=${p.grid}, MAS=${py(p.MAS)}, threads=${p.threads}, ptype=${py(p.ptypeLabel)},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'bispectrum': {
      const p = tile.params;
      return `${header}result = backend.get_bispectrum(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realizations[0])},\n`
        + `    field=${py(p.field)}, mu_index=${p.muIndex}, fetch_public=True,\n)\n`;
    }
    case 'sfr-history': {
      const p = tile.params;
      return `${header}result = backend.get_sfr_history(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realizations[0])},\n`
        + `    z_min=${p.zMin}, z_max=${p.zMax}, bins=${p.bins},\n    fetch_public=True,\n)\n`;
    }
    case 'xray-halo-profiles': {
      const p = tile.params;
      return `${header}profiles = backend.get_xray_profiles(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)}, fetch_public=True,\n)\n`;
    }
    case 'halo-gas-profiles': {
      const p = tile.params;
      return `${header}profiles = backend.get_halo_profiles(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)}, ${p.snapnum}, ${py(p.field)},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'color-mass-diagram': {
      const p = tile.params;
      return `${header}result = backend.get_color_mass_diagram(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)},\n`
        + `    band1=${py(p.band1)}, band2=${py(p.band2)}, snapnum=${p.snapnum},\n`
        + `    sps_model=${py(p.spsModel)}, spectra_type=${py(p.spectraType)}, fetch_public=True,\n)\n`;
    }
    case 'field-pdf': {
      const p = tile.params;
      return `${header}result = backend.get_field_pdf(\n`
        + `    ${py(p.suite)}, field=${py(p.field)}, grid=${p.grid}, redshift=${p.redshift},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'lyman-alpha-spectrum': {
      const p = tile.params;
      return `${header}result = backend.get_lya_spectrum(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)}, ${p.snapnum}, ${p.sightline},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'galaxy-scaling-relations': {
      const p = tile.params;
      return `${header}result = backend.get_scaling_relations(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)},\n`
        + `    SMmin=${p.SMmin}, SMmax=${p.SMmax}, bins=${p.bins}, snapnum=${p.snapnum},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'field-map-2d': {
      const p = tile.params;
      return `${header}result = backend.get_field_map_2d(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)}, field=${py(p.field)},\n`
        + `    fetch_public=True,\n)\n`;
    }
    case 'density-field-3d': {
      const p = tile.params;
      return `${header}result = backend.get_density_field_3d(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)}, ${p.snapnum},\n`
        + `    grid=${p.grid}, field=${py(p.field)}, fetch_public=True,\n)\n`;
    }
    case 'particle-cloud-3d': {
      const p = tile.params;
      return `${header}result = backend.get_particle_cloud(\n`
        + `    ${py(p.suite)}, ${py(p.setName)}, ${py(p.realization)},\n`
        + `    max_particles=${p.maxParticles}, snapnum=${p.snapnum}, fetch_public=True,\n)\n`;
    }
    case 'custom': {
      // Real fix (2026-08-06): this used to always emit a `fc.data(fields=
      // [xField, yField, colorField])` call regardless of chartType - a
      // real bug from extending the Custom tile to 4 more chart types
      // (Table 1 row 91) without updating this function, caught directly
      // by a user pasting the output into Gemini for a second opinion.
      // Histogram/Heatmap/Box Plot's real live fetch (see
      // loadCustomHistogramTile/loadCustomHeatmapTile/loadCustomBoxplotTile)
      // calls flathub_client's genuinely different `histogram()` function,
      // not `data()` - the generated code now mirrors whichever real
      // function this tile's own chartType actually calls. 3D Scatterplot's
      // `zField` was also missing from `fields` entirely.
      const s = tile.selection;
      const filterLines = s.activeFilterFields.map((f) => {
        const range = s.paramFilters[f];
        return range
          ? `        ${py(f)}: fc.range_filter(gte=${range.min}, lte=${range.max}),`
          : `        # ${f}: added as a filter, no range narrowed yet`;
      });
      const filtersBlock = `    filters={\n`
        + `${filterLines.join('\n')}${filterLines.length ? '\n' : ''}`
        + `        'type': ${py(s.type)},\n    },\n`;

      if (s.chartType === 'histogram' || s.chartType === 'heatmap' || s.chartType === 'boxplot') {
        const fieldSpecs: [string, boolean][] =
          s.chartType === 'heatmap' ? [[s.xField, s.logX], [s.yField, s.logY]] : [[s.xField, s.logX]];
        const fieldsBlock = fieldSpecs
          .map(([f, log]) => `        {'field': ${py(f)}, 'size': ${s.binCount}, 'log': ${py(log)}},`)
          .join('\n');
        return `import flathub_client as fc\n\n`
          + `buckets = fc.histogram(\n`
          + `    fields=[\n${fieldsBlock}\n    ],\n`
          + filtersBlock
          + (s.chartType === 'boxplot' ? `    quartiles=${py(s.yField)},\n` : '')
          + `)\n`;
      }

      // Real dedupe (2026-08-06): a duplicate field entry surfaced directly
      // by a user - a scatter tile with Color field set to the same field
      // as Y produced `fields=['a', 'b', 'b']`. Not fabricated data either
      // way (FlatHUB returns the same real column twice), but a
      // deduplicated list is the honest, minimal request for what's
      // actually plotted.
      const fields = [...new Set(
        [s.xField, s.yField, ...(s.chartType === 'scatter3d' ? [s.zField] : []), s.colorField].filter(Boolean),
      )] as string[];
      return `import flathub_client as fc\n\n`
        + `rows = fc.data(\n`
        + `    fields=[${fields.map(py).join(', ')}],\n`
        + filtersBlock
        + `)\n`;
    }
    case 'empty':
      return null;
    default:
      return null;
  }
}

async function loadMassRangeTile(
  id: string, statistic: MassRangeStatistic, params: MassRangeParams, previous?: PlotTileState,
): Promise<PlotTileState> {
  const config = MASS_RANGE_CONFIGS[statistic];
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const fetched = await Promise.all(
    realizations.map((realization) =>
      fetchMassRangeResult(config, {
        suite: params.suite, setName: params.setName, realization,
        snapnum: params.snapnum, min: params.min, max: params.max, bins: params.bins,
      }).then((r) => ({ realization, r })),
    ),
  );
  // Real gap, not a bug: no synthetic fallback (removed 2026-08-05), so
  // some (or all) selected realizations can come back null - same
  // filtering pattern as Bispectrum's own load function.
  const withData = fetched.filter((f): f is { realization: number | string; r: Result } => f.r !== null);
  if (withData.length === 0) {
    throw new Error(`No data available for this suite/set/realization.`);
  }
  const results = withData.map((f) => f.r);
  const dataRealizations = withData.map((f) => f.realization);
  // The halo catalog (Underlying Halos table) depends only on suite/set/
  // realization[0]/snapnum - min/max/bins only reshape the histogram curve
  // above, they never change which halos exist. Re-fetching the whole
  // catalog on every Bins-slider tick was a wasted round-trip; reuse the
  // previous tile's rows when those fields haven't changed.
  const catalogUnchanged = previous
    && previous.kind === 'mass-range'
    && previous.params.suite === params.suite
    && previous.params.setName === params.setName
    && previous.params.realizations[0] === realizations[0]
    && previous.params.snapnum === params.snapnum;
  const catalog = catalogUnchanged
    ? null
    : await fetchHaloCatalog({
        suite: params.suite, setName: params.setName, realization: dataRealizations[0], snapnum: params.snapnum,
      });
  const first = results[0];
  return {
    id,
    kind: 'mass-range',
    statistic,
    params,
    series: results.map((r, i) => ({ label: `${params.setName}_${dataRealizations[i]}`, x: r.x, y: r.y })),
    xLabel: first.x_label,
    yLabel: first.y_label,
    logX: first.log_x,
    logY: first.log_y,
    haloRows: catalogUnchanged ? previous.haloRows : toHaloRows(catalog),
    haloRawRows: catalogUnchanged ? previous.haloRawRows : (catalog?.raw_frame ?? null),
    // Same invalidation as the Subfind catalog above - an alt-finder table
    // fetched for the old suite/set/realization/snapnum would be stale
    // (and possibly for a suite that finder doesn't even cover) under the
    // new ones, so it resets to Subfind rather than carrying over.
    altFinder: catalogUnchanged ? previous.altFinder : 'Subfind',
    altRows: catalogUnchanged ? previous.altRows : [],
    altRawRows: catalogUnchanged ? previous.altRawRows : null,
    altLoading: false,
    mergerTreeId: catalogUnchanged ? previous.mergerTreeId : null,
    mergerTreeVariant: catalogUnchanged ? previous.mergerTreeVariant : 'SubLink',
    mergerTreeData: catalogUnchanged ? previous.mergerTreeData : null,
    mergerTreeLoading: false,
    note: first.note,
    loading: false,
  };
}

async function loadPowerSpectrumTile(id: string, params: PowerSpectrumParams): Promise<PowerSpectrumTileState> {
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const ptype = PTYPE_OPTIONS[params.ptypeLabel];
  const rsdAxis = rsdAxisFromLabel(params.rsdLabel);
  const fetched = await Promise.all(
    realizations.map((realization) =>
      fetchPowerSpectrum({
        suite: params.suite, setName: params.setName, realization, snapnum: params.snapnum,
        grid: params.grid, MAS: params.MAS, threads: params.threads, ptype,
        kRange: params.kRange, rsdAxis, multipole: params.multipole,
      }).then((r) => ({ realization, r })),
    ),
  );
  // Real gap, not a bug: no synthetic fallback (removed 2026-08-05), so
  // some (or all) selected realizations can come back null.
  const withData = fetched.filter((f): f is { realization: number | string; r: Result } => f.r !== null);
  if (withData.length === 0) {
    throw new Error('No data available for this suite/set/realization.');
  }
  const first = withData[0].r;
  return {
    id, kind: 'power-spectrum', params,
    series: withData.map(({ realization, r }) => ({ label: `${params.setName}_${realization}`, x: r.x, y: r.y })),
    xLabel: first.x_label, yLabel: first.y_label, logX: first.log_x, logY: first.log_y,
    note: first.note,
    loading: false,
  };
}

async function loadBispectrumTile(id: string, params: BispectrumParams): Promise<BispectrumTileState> {
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const fetched = await Promise.all(
    realizations.map((realization) =>
      fetchBispectrum({
        suite: params.suite, setName: params.setName, realization,
        field: params.field, muIndex: params.muIndex,
        kRange: params.kRange, rsdAxis: rsdAxisFromLabel(params.rsdLabel), ell: params.ell,
      }).then((r) => ({ realization, r })),
    ),
  );
  // Real gap, not a bug: some (or all) selected realizations can come back
  // null - matches app.py's own generic block filtering None results
  // before plotting.
  const withData = fetched.filter((f): f is { realization: number; r: Result } => f.r !== null);
  if (withData.length === 0) {
    throw new Error('No data available for this suite/set/realization. Try IllustrisTNG or SIMBA, LH set.');
  }
  const first = withData[0].r;
  return {
    id, kind: 'bispectrum', params,
    series: withData.map(({ realization, r }) => ({ label: `${params.setName}_${realization}`, x: r.x, y: r.y })),
    xLabel: first.x_label, yLabel: first.y_label, logX: first.log_x, logY: first.log_y,
    note: first.note,
    loading: false,
  };
}

async function loadSFRHistoryTile(id: string, params: SFRHistoryParams): Promise<SFRHistoryTileState> {
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const fetched = await Promise.all(
    realizations.map((realization) =>
      fetchSFRHistory({
        suite: params.suite, setName: params.setName, realization,
        zMin: params.zMin, zMax: params.zMax, bins: params.bins,
      }).then((r) => ({ realization, r })),
    ),
  );
  // Real gap, not a bug: no synthetic fallback (removed 2026-08-05), so
  // some (or all) selected realizations can come back null.
  const withData = fetched.filter((f): f is { realization: number | string; r: Result } => f.r !== null);
  if (withData.length === 0) {
    throw new Error('No data available for this suite/set/realization.');
  }
  const first = withData[0].r;
  return {
    id, kind: 'sfr-history', params,
    series: withData.map(({ realization, r }) => ({ label: `${params.setName}_${realization}`, x: r.x, y: r.y })),
    xLabel: first.x_label, yLabel: first.y_label, logX: first.log_x, logY: first.log_y,
    note: first.note,
    loading: false,
  };
}

async function loadXrayHaloProfilesTile(id: string, params: XrayHaloProfilesParams): Promise<XrayHaloProfilesTileState> {
  const meta = await fetchXrayProfilesMeta(params);
  if (meta === null) {
    throw new Error('No X-ray profile data available for this suite/set/realization. Try IllustrisTNG or SIMBA.');
  }
  return { id, kind: 'xray-halo-profiles', params, note: meta.note, nHalos: meta.nHalos, loading: false };
}

async function loadHaloGasProfilesTile(id: string, params: HaloGasProfilesParams): Promise<HaloGasProfilesTileState> {
  const meta = await fetchHaloProfilesMeta(params);
  if (meta === null) {
    throw new Error(
      'No halo gas profile data available for this suite/set/realization. Try IllustrisTNG or SIMBA, LH or CV set.',
    );
  }
  return { id, kind: 'halo-gas-profiles', params, note: meta.note, nHalos: meta.nHalos, loading: false };
}

async function loadColorMassDiagramTile(id: string, params: ColorMassDiagramParams): Promise<ColorMassDiagramTileState> {
  const meta = await fetchColorMassDiagramMeta(params);
  if (meta === null) {
    throw new Error(
      'No photometry data available for this suite/set/realization/band combination. ' +
      'Try IllustrisTNG, SIMBA, Astrid, or Swift-EAGLE.',
    );
  }
  return { id, kind: 'color-mass-diagram', params, note: meta.note, nGalaxies: meta.nGalaxies, loading: false };
}

async function loadFieldPDFTile(id: string, params: FieldPDFParams): Promise<FieldPDFTileState> {
  const meta = await fetchFieldPDFMeta(params);
  if (meta === null) {
    throw new Error(
      'No PDF data available for this suite/field/grid/redshift combination. Try IllustrisTNG or SIMBA.',
    );
  }
  return { id, kind: 'field-pdf', params, note: meta.note, loading: false };
}

async function loadLymanAlphaSpectrumTile(id: string, params: LymanAlphaSpectrumParams): Promise<LymanAlphaSpectrumTileState> {
  const meta = await fetchLymanAlphaSpectrumMeta(params);
  if (meta === null) {
    throw new Error(
      'No Lyman-alpha data available for this suite/set/realization/snapshot. Try IllustrisTNG or SIMBA.',
    );
  }
  return { id, kind: 'lyman-alpha-spectrum', params, note: meta.note, loading: false };
}

async function loadGalaxyScalingRelationsTile(id: string, params: GalaxyScalingRelationsParams): Promise<GalaxyScalingRelationsTileState> {
  const meta = await fetchScalingRelationsMeta(params);
  if (meta === null) {
    throw new Error(
      'No Subfind catalog available for this suite/set/realization. Try IllustrisTNG, SIMBA, Astrid, or Swift-EAGLE.',
    );
  }
  return { id, kind: 'galaxy-scaling-relations', params, note: meta.note, source: meta.source, loading: false };
}

// Real (ticket #12, added 2026-08-06) - N parallel calls to the EXISTING
// single-realization endpoint (fetchFieldMap2DMeta), zero backend changes.
// Mirrors Compare mode's own parallel-fetch pattern (Power Spectrum/
// Bispectrum/SFR History): each cell's fetch is independent, a missing/404
// realization becomes a `null` cell rather than failing the whole tile.
async function loadFieldMap2DGroupTile(id: string, params: FieldMap2DParams): Promise<FieldMap2DTileState> {
  const { rows, cols } = params.groupSize!;
  const start = Number(params.realization);
  // Real fix (2026-08-06, code-quality audit): `realization` is a plain
  // number for every set this control is offered for, but a 1P compound
  // string id (e.g. "p11_2") for 1P - currently only ever reaches here
  // because FieldMap2DSidebar forces `groupSize: null` for 1P before this
  // ever gets called, not because this function enforces it itself. Fails
  // fast with a clear message rather than relying solely on that sidebar-
  // level guard staying correct forever, or silently firing `rows*cols`
  // real network requests for `NaN`/`NaN+1`/... realizations before
  // reaching the same "no data" conclusion.
  if (Number.isNaN(start)) {
    throw new Error('Group view needs a numeric Realization - not available for this Set.');
  }
  const realizations = Array.from({ length: rows * cols }, (_, i) => start + i);
  const fetched = await Promise.all(
    realizations.map((realization) =>
      fetchFieldMap2DMeta({ ...params, realization }).then((meta) => ({ realization, meta })),
    ),
  );
  const cells = fetched.map(({ realization, meta }) => (meta ? { realization, note: meta.note, source: meta.source } : null));
  const firstReal = cells.find((c) => c !== null);
  if (!firstReal) {
    throw new Error(
      `No CMD 2D maps available for realizations ${start}-${start + rows * cols - 1} of this suite/set/field. Try IllustrisTNG, SIMBA, or Astrid.`,
    );
  }
  return { id, kind: 'field-map-2d', params, note: firstReal.note, source: firstReal.source, cells, loading: false };
}

async function loadFieldMap2DTile(id: string, params: FieldMap2DParams): Promise<FieldMap2DTileState> {
  if (params.groupSize) return loadFieldMap2DGroupTile(id, params);
  const meta = await fetchFieldMap2DMeta(params);
  if (meta === null) {
    throw new Error(
      'No CMD 2D map available for this suite/set/realization/field. Try IllustrisTNG, SIMBA, or Astrid.',
    );
  }
  return { id, kind: 'field-map-2d', params, note: meta.note, source: meta.source, loading: false };
}

async function loadDensityField3DTile(id: string, params: DensityField3DParams): Promise<DensityField3DTileState> {
  const result = await fetchDensityField3D(params);
  if (result === null) {
    throw new Error(
      'No CMD grid or snapshot available for this suite/set/realization/field. Try IllustrisTNG, SIMBA, or Astrid.',
    );
  }
  const voids = params.showVoids ? await fetchVoidCatalog(params) : null;
  return {
    id, kind: 'density-field-3d', params,
    density: result.density, boxSize: result.box_size, note: result.note, source: result.source,
    voids, loading: false,
  };
}

async function loadParticleCloud3DTile(id: string, params: ParticleCloud3DParams): Promise<ParticleCloud3DTileState> {
  const result = await fetchParticleCloud(params);
  if (result === null) {
    throw new Error(
      'No snapshot particles available for this suite/set/realization. Try IllustrisTNG, SIMBA, or Astrid.',
    );
  }
  return {
    id, kind: 'particle-cloud-3d', params,
    positions: result.positions, note: result.note, source: result.source, loading: false,
  };
}

/** Fetches only ics.0 for a fast first render - see ICParticles3DTileState's
 * own comment. `maxParticles` is a TOTAL budget across all N_IC_FILES real
 * files, split evenly per file, not a per-file cap. */
async function loadICParticlesTile(id: string, params: ICParticlesParams): Promise<ICParticles3DTileState> {
  const perFile = Math.max(1, Math.round(params.maxParticles / N_IC_FILES));
  const result = await fetchICParticles({ ...params, maxParticles: perFile, fileIndex: 0 });
  if (result === null) {
    throw new Error(
      'No Initial Conditions file for this suite/set/realization. Try IllustrisTNG, SIMBA, or Astrid.',
    );
  }
  return {
    id, kind: 'ic-particles-3d', params,
    positions: result.positions, note: result.note, source: result.source, filesLoaded: 1, loading: false,
  };
}

/** Fetches the remaining N_IC_FILES-1 real Gadget IC files in the
 * background (file 0 already rendered by loadICParticlesTile) and appends
 * each file's particles to the tile as they arrive, batching flushes every
 * 4 files so 46 more fetches don't trigger 46 back-to-back Scatter3d
 * redraws. Capped at 6 concurrent requests against Flatiron's public
 * webspace. Bails out silently once the tile's request sequence goes
 * stale (removed / refetched with different params). */
function streamRemainingICFiles(
  id: string,
  seq: number,
  params: ICParticlesParams,
  requestSeqRef: MutableRefObject<Map<string, number>>,
  setTiles: Dispatch<SetStateAction<CanvasTile[]>>,
) {
  const perFile = Math.max(1, Math.round(params.maxParticles / N_IC_FILES));
  let pendingPositions: number[][] = [];
  let filesLoaded = 1;
  const flush = () => {
    if (pendingPositions.length === 0) return;
    const positions = pendingPositions;
    pendingPositions = [];
    const loaded = filesLoaded;
    setTiles((prev) =>
      prev.map((t) =>
        t.id === id && t.kind === 'ic-particles-3d'
          ? { ...t, positions: [...t.positions, ...positions], filesLoaded: loaded }
          : t,
      ),
    );
  };
  fetchProgressive(
    N_IC_FILES - 1,
    (i) => fetchICParticles({ ...params, maxParticles: perFile, fileIndex: i + 1 }),
    (result) => {
      filesLoaded += 1;
      if (result) pendingPositions.push(...result.positions);
      if (filesLoaded % 4 === 0 || filesLoaded === N_IC_FILES) flush();
    },
    { concurrency: 6, isCancelled: () => requestSeqRef.current.get(id) !== seq },
  ).then(flush);
}

async function loadCamelsSamTile(id: string, params: CamelsSamParams): Promise<CamelsSamTileState> {
  const catalog = await fetchSamCatalog(params.realization, SAM_OCTANTS[0]);
  if (catalog === null) {
    throw new Error('No CAMELS-SAM catalog for this realization - try another one (0-999).');
  }
  return {
    id, kind: 'camels-sam', params,
    rows: catalog.frame, rawRows: catalog.raw_frame, note: catalog.note, octantsLoaded: 1, loading: false,
  };
}

/** Fetches the remaining 7 of SAM_OCTANTS in the background (octant 0 is
 * already rendered by loadCamelsSamTile) and appends each octant's rows as
 * they land, batching flushes every 2 octants so 7 more fetches don't
 * trigger 7 back-to-back re-renders. See ICParticles3DTileState's own
 * comment for the identical rationale/pattern applied to Initial
 * Conditions. Bails out silently once the tile's request sequence goes
 * stale (removed / refetched with different params). */
function streamRemainingSamOctants(
  id: string,
  seq: number,
  params: CamelsSamParams,
  requestSeqRef: MutableRefObject<Map<string, number>>,
  setTiles: Dispatch<SetStateAction<CanvasTile[]>>,
) {
  let pendingRows: HaloCatalogRow[] = [];
  let pendingRawRows: HaloCatalogRow[] = [];
  let octantsLoaded = 1;
  const flush = () => {
    if (pendingRows.length === 0) return;
    const rows = pendingRows;
    const rawRows = pendingRawRows;
    pendingRows = [];
    pendingRawRows = [];
    const loaded = octantsLoaded;
    setTiles((prev) =>
      prev.map((t) =>
        t.id === id && t.kind === 'camels-sam'
          ? {
              ...t,
              rows: [...t.rows, ...rows],
              rawRows: rawRows.length ? [...(t.rawRows ?? []), ...rawRows] : t.rawRows,
              octantsLoaded: loaded,
            }
          : t,
      ),
    );
  };
  fetchProgressive(
    SAM_OCTANTS.length - 1,
    (i) => fetchSamCatalog(params.realization, SAM_OCTANTS[i + 1]),
    (catalog) => {
      octantsLoaded += 1;
      if (catalog) {
        pendingRows.push(...catalog.frame);
        if (catalog.raw_frame) pendingRawRows.push(...catalog.raw_frame);
      }
      if (octantsLoaded % 2 === 0 || octantsLoaded === SAM_OCTANTS.length) flush();
    },
    { concurrency: 4, isCancelled: () => requestSeqRef.current.get(id) !== seq },
  ).then(flush);
}

async function loadBlackholeMergersTile(id: string, params: BlackholeMergersParams): Promise<BlackholeMergersTileState> {
  const catalog = await fetchBlackholeMergers({
    suite: params.suite, setName: params.setName, realization: params.realization,
  });
  if (catalog === null) {
    throw new Error('No black hole merger events for this suite/set/realization - try IllustrisTNG.');
  }
  return {
    id, kind: 'blackhole-mergers', params,
    rows: catalog.frame, note: catalog.note, loading: false,
  };
}

/** Real field titles/units for real axis labels ("Mass [10^10 Msun/h]"),
 * not the raw FlatHUB field name - shared by every chartType branch below
 * (a second small fetch, 241 fields is cheap - not worth threading the
 * already-fetched list from CustomTab/CustomSidebar through tile state
 * just to avoid it). */
async function customFieldByName(): Promise<Map<string, CustomField>> {
  const allFields = await fetchCustomFields();
  return new Map(allFields.map((f: CustomField) => [f.name, f]));
}

async function loadCustomScatterTile(id: string, selection: CustomSelection, is3d: boolean): Promise<CustomTileState> {
  const fieldNames = [
    selection.xField, selection.yField,
    ...(is3d ? [selection.zField] : []),
    ...(selection.colorField ? [selection.colorField] : []),
  ];
  const filters = buildCustomFilters(selection);
  const [rows, fieldByName] = await Promise.all([fetchCustomData(fieldNames, filters, 2000), customFieldByName()]);

  // /custom/data only returns fields actually present on a matching row
  // (see api/routers/custom.py's own docstring) - a row missing x, y, z,
  // or (when selected) the color field is dropped rather than coerced to
  // 0, which would fabricate a fake point at the origin.
  const rawPoints = rows.map((row) => ({
    x: row[selection.xField],
    y: row[selection.yField],
    z: is3d ? row[selection.zField] : 0,
    color: selection.colorField ? row[selection.colorField] : undefined,
  }));
  const points = rawPoints.filter(
    (p): p is { x: number; y: number; z: number; color: number | undefined } =>
      Number.isFinite(p.x) && Number.isFinite(p.y) && (!is3d || Number.isFinite(p.z))
      && (!selection.colorField || Number.isFinite(p.color)),
  );

  if (points.length === 0) {
    throw new Error('No rows matched this filter/field combination - try widening a param filter or picking "Any" suite/set.');
  }

  const colorLabel = selection.colorField ? fieldLabel(fieldByName.get(selection.colorField)) : '';
  const result: CustomResult = is3d
    ? {
        kind: 'scatter3d',
        points,
        xLabel: fieldLabel(fieldByName.get(selection.xField)),
        yLabel: fieldLabel(fieldByName.get(selection.yField)),
        zLabel: fieldLabel(fieldByName.get(selection.zField)),
        colorLabel,
      }
    : {
        kind: 'scatter',
        points,
        xLabel: fieldLabel(fieldByName.get(selection.xField)),
        yLabel: fieldLabel(fieldByName.get(selection.yField)),
        colorLabel,
      };

  return { id, kind: 'custom', selection, result, matchedCount: points.length, loading: false };
}

async function loadCustomHistogramTile(id: string, selection: CustomSelection): Promise<CustomTileState> {
  const filters = buildCustomFilters(selection);
  const histogramFields: CustomHistogramField[] = [{ field: selection.xField, size: selection.binCount, log: selection.logX }];
  const [{ buckets }, fieldByName] = await Promise.all([
    fetchCustomHistogram(histogramFields, filters),
    customFieldByName(),
  ]);
  const flatBuckets = buckets.map((b) => ({ x: b.key[0], count: b.count }));
  const matchedCount = flatBuckets.reduce((sum, b) => sum + b.count, 0);
  if (matchedCount === 0) {
    throw new Error('No rows matched this filter/field combination - try widening a param filter or picking "Any" suite/set.');
  }
  return {
    id, kind: 'custom', selection,
    result: { kind: 'histogram', buckets: flatBuckets, xLabel: fieldLabel(fieldByName.get(selection.xField)) },
    matchedCount, loading: false,
  };
}

async function loadCustomHeatmapTile(id: string, selection: CustomSelection): Promise<CustomTileState> {
  const filters = buildCustomFilters(selection);
  const histogramFields: CustomHistogramField[] = [
    { field: selection.xField, size: selection.binCount, log: selection.logX },
    { field: selection.yField, size: selection.binCount, log: selection.logY },
  ];
  const [{ buckets }, fieldByName] = await Promise.all([
    fetchCustomHistogram(histogramFields, filters),
    customFieldByName(),
  ]);
  const flatBuckets = buckets.map((b) => ({ x: b.key[0], y: b.key[1], count: b.count }));
  const matchedCount = flatBuckets.reduce((sum, b) => sum + b.count, 0);
  if (matchedCount === 0) {
    throw new Error('No rows matched this filter/field combination - try widening a param filter or picking "Any" suite/set.');
  }
  return {
    id, kind: 'custom', selection,
    result: {
      kind: 'heatmap', buckets: flatBuckets,
      xLabel: fieldLabel(fieldByName.get(selection.xField)),
      yLabel: fieldLabel(fieldByName.get(selection.yField)),
    },
    matchedCount, loading: false,
  };
}

async function loadCustomBoxplotTile(id: string, selection: CustomSelection): Promise<CustomTileState> {
  const filters = buildCustomFilters(selection);
  const histogramFields: CustomHistogramField[] = [{ field: selection.xField, size: selection.binCount, log: selection.logX }];
  const [{ buckets }, fieldByName] = await Promise.all([
    fetchCustomHistogram(histogramFields, filters, selection.yField),
    customFieldByName(),
  ]);
  // A bucket with zero matching rows has no real quartiles - FlatHUB
  // omits `quartiles` entirely for it (confirmed live), so it's dropped
  // rather than plotted as a fabricated zero-height box.
  const flatBuckets = buckets
    .filter((b) => b.quartiles && b.count > 0)
    .map((b) => ({
      x: b.key[0], count: b.count,
      min: b.quartiles![0], q1: b.quartiles![1], median: b.quartiles![2], q3: b.quartiles![3], max: b.quartiles![4],
    }));
  const matchedCount = flatBuckets.reduce((sum, b) => sum + b.count, 0);
  if (matchedCount === 0) {
    throw new Error('No rows matched this filter/field combination - try widening a param filter or picking "Any" suite/set.');
  }
  return {
    id, kind: 'custom', selection,
    result: {
      kind: 'boxplot', buckets: flatBuckets,
      xLabel: fieldLabel(fieldByName.get(selection.xField)),
      valueLabel: fieldLabel(fieldByName.get(selection.yField)),
    },
    matchedCount, loading: false,
  };
}

async function loadCustomTile(id: string, selection: CustomSelection): Promise<CustomTileState> {
  switch (selection.chartType) {
    case 'scatter': return loadCustomScatterTile(id, selection, false);
    case 'scatter3d': return loadCustomScatterTile(id, selection, true);
    case 'histogram': return loadCustomHistogramTile(id, selection);
    case 'heatmap': return loadCustomHeatmapTile(id, selection);
    case 'boxplot': return loadCustomBoxplotTile(id, selection);
    default: throw new Error(`Unknown chart type: ${selection.chartType}`);
  }
}

export function App() {
  const [activePanel, setActivePanel] = useState<IconRailPanel>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [tiles, setTiles] = useState<CanvasTile[]>([]);
  // Guards against a slow, superseded refetch response overwriting a newer
  // one - e.g. dragging Snapshot from 0->1->2 fires three requests, and
  // without this the response for 0 (however unlikely) could land after 2's
  // and stomp the tile back to a stale state. Bumped on every refetch call;
  // a response is only applied if its own sequence number still matches.
  const requestSeqRef = useRef<Map<string, number>>(new Map());
  const bumpRequestSeq = (id: string) => {
    const next = (requestSeqRef.current.get(id) ?? 0) + 1;
    requestSeqRef.current.set(id, next);
    return next;
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  // null = the modal will ADD a new tile on submit (opened from TopNav).
  // A real id = the modal will FILL that existing tile in place instead
  // (opened from that tile's own empty state) — see AddPlotModal.mdx's
  // "Real, still-open gap" note: reopening a tile that already has a
  // statistic doesn't yet restore its previous selection into the modal.
  const [pendingTileId, setPendingTileId] = useState<string | null>(null);
  // Which populated tile currently owns the left 280px slot - mutually
  // exclusive with activePanel (Project/Files), same shared-slot rule
  // ParamsSidebar.mdx already established for IconRail's own panels.
  const [focusedTileId, setFocusedTileId] = useState<string | null>(null);
  // Copy provenance's own transient confirmation (Toolbar.mdx/Toast.mdx) -
  // a plain timeout ref rather than a library, since this is the only
  // toast in the app so far.
  const [toast, setToast] = useState<{ title: string; detail?: string } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codePopoverOpen, setCodePopoverOpen] = useState(false);
  // Toolbar tool modes (Toolbar.mdx/AnnotationOverlay.mdx/ArrowOverlay.mdx/
  // NoteOverlay.mdx) - one global "which tool is active" value rather than
  // 4 independent booleans, since only one click-driven tool can own a
  // click at a time; turning one on turns any other off. Per-tile real
  // data (annotations/arrows/notes) stays in its own `...ByTile` map;
  // which item is mid-interaction (open/dragging/awaiting a 2nd click) is
  // a single global value per tool, since only one tile can be
  // mid-interaction at once.
  type ToolMode = 'annotate' | 'arrow' | 'note' | 'ruler' | 'brush' | null;
  const [activeTool, setActiveTool] = useState<ToolMode>(null);
  const toggleTool = (tool: ToolMode) => setActiveTool((current) => (current === tool ? null : tool));
  const annotateMode = activeTool === 'annotate';
  const arrowMode = activeTool === 'arrow';
  const noteMode = activeTool === 'note';
  const rulerMode = activeTool === 'ruler';
  const brushCaptureActive = activeTool === 'brush';

  const [annotationsByTile, setAnnotationsByTile] = useState<Record<string, Annotation[]>>({});
  const [activeAnnotation, setActiveAnnotation] = useState<{ tileId: string; id: string } | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState<{ tileId: string; xFrac: number; yFrac: number } | null>(
    null,
  );
  const handleSaveAnnotationDraft = (text: string) => {
    if (!draftAnnotation) return;
    const annotation: Annotation = {
      id: `annotation-${draftAnnotation.tileId}-${annotationsByTile[draftAnnotation.tileId]?.length ?? 0}-${Math.random().toString(36).slice(2)}`,
      xFrac: draftAnnotation.xFrac,
      yFrac: draftAnnotation.yFrac,
      text,
      createdAt: Date.now(),
    };
    setAnnotationsByTile((prev) => ({
      ...prev,
      [draftAnnotation.tileId]: [...(prev[draftAnnotation.tileId] ?? []), annotation],
    }));
    setDraftAnnotation(null);
    setActiveTool(null);
  };
  const handleCancelAnnotationDraft = () => {
    setDraftAnnotation(null);
    setActiveTool(null);
  };
  const handleDeleteAnnotation = (tileId: string, id: string) => {
    setAnnotationsByTile((prev) => ({ ...prev, [tileId]: (prev[tileId] ?? []).filter((a) => a.id !== id) }));
    setActiveAnnotation((current) => (current?.tileId === tileId && current.id === id ? null : current));
  };

  // Arrow tool - two clicks (A, then B) make one arrow; a 3rd click starts
  // a fresh one, same "2 clicks = 1 measurement" pattern as the Ruler.
  const [arrowsByTile, setArrowsByTile] = useState<Record<string, ArrowShape[]>>({});
  const [arrowDraftA, setArrowDraftA] = useState<{ tileId: string; xFrac: number; yFrac: number } | null>(null);
  const handleDeleteArrow = (tileId: string, id: string) => {
    setArrowsByTile((prev) => ({ ...prev, [tileId]: (prev[tileId] ?? []).filter((a) => a.id !== id) }));
  };

  // Note tool - one click places a draft (no pin, unlike Annotate);
  // notes can be dragged after creation via NoteOverlay's own onMove.
  const [notesByTile, setNotesByTile] = useState<Record<string, NoteShape[]>>({});
  const [noteDraft, setNoteDraft] = useState<{ tileId: string; xFrac: number; yFrac: number } | null>(null);
  const handleSaveNoteDraft = (text: string) => {
    if (!noteDraft) return;
    const note: NoteShape = {
      id: `note-${noteDraft.tileId}-${notesByTile[noteDraft.tileId]?.length ?? 0}-${Math.random().toString(36).slice(2)}`,
      xFrac: noteDraft.xFrac,
      yFrac: noteDraft.yFrac,
      text,
    };
    setNotesByTile((prev) => ({ ...prev, [noteDraft.tileId]: [...(prev[noteDraft.tileId] ?? []), note] }));
    setNoteDraft(null);
    setActiveTool(null);
  };
  const handleCancelNoteDraft = () => {
    setNoteDraft(null);
    setActiveTool(null);
  };
  const handleSaveNoteText = (tileId: string, id: string, text: string) => {
    setNotesByTile((prev) => ({
      ...prev,
      [tileId]: (prev[tileId] ?? []).map((n) => (n.id === id ? { ...n, text } : n)),
    }));
  };
  const handleDeleteNote = (tileId: string, id: string) => {
    setNotesByTile((prev) => ({ ...prev, [tileId]: (prev[tileId] ?? []).filter((n) => n.id !== id) }));
  };
  const handleMoveNote = (tileId: string, id: string, xFrac: number, yFrac: number) => {
    setNotesByTile((prev) => ({
      ...prev,
      [tileId]: (prev[tileId] ?? []).map((n) => (n.id === id ? { ...n, xFrac, yFrac } : n)),
    }));
  };

  // Toolbar's Hide feature (added 2026-08-06, direct user feedback) - see
  // HidePopover.mdx for the full decision record. "All panels" and "This
  // panel" track separate checkbox state (never merged); Annotations/
  // Arrows/Notes stamp a `hidden` flag onto existing items (snapshot, not
  // a live filter - a fresh item added afterward stays visible), while
  // Param readouts have no per-item array to stamp so `hideAllPanels`/
  // `hidePerPanel`'s own `readouts` flag is consulted live by PlotTile.
  const EMPTY_HIDE_VALUES: HideValues = { annotations: false, arrows: false, notes: false, readouts: false };
  const [hidePopoverOpen, setHidePopoverOpen] = useState(false);
  const [hideScope, setHideScope] = useState<HideScope>('all');
  const [hideAllPanels, setHideAllPanels] = useState<HideValues>(EMPTY_HIDE_VALUES);
  const [hidePerPanel, setHidePerPanel] = useState<Record<string, HideValues>>({});
  const stampHiddenAllTiles = <T extends { hidden?: boolean }>(
    setter: Dispatch<SetStateAction<Record<string, T[]>>>,
    value: boolean,
  ) => {
    setter((prev) => Object.fromEntries(Object.entries(prev).map(([tileId, items]) => [tileId, items.map((item) => ({ ...item, hidden: value }))])));
  };
  const stampHiddenOneTile = <T extends { hidden?: boolean }>(
    setter: Dispatch<SetStateAction<Record<string, T[]>>>,
    tileId: string,
    value: boolean,
  ) => {
    setter((prev) => ({ ...prev, [tileId]: (prev[tileId] ?? []).map((item) => ({ ...item, hidden: value })) }));
  };
  const handleHideToggle = (category: HideCategory, value: boolean) => {
    if (hideScope === 'all') {
      setHideAllPanels((prev) => ({ ...prev, [category]: value }));
      if (category === 'annotations') stampHiddenAllTiles(setAnnotationsByTile, value);
      else if (category === 'arrows') stampHiddenAllTiles(setArrowsByTile, value);
      else if (category === 'notes') stampHiddenAllTiles(setNotesByTile, value);
    } else {
      if (!focusedTileId) return;
      setHidePerPanel((prev) => ({ ...prev, [focusedTileId]: { ...(prev[focusedTileId] ?? EMPTY_HIDE_VALUES), [category]: value } }));
      if (category === 'annotations') stampHiddenOneTile(setAnnotationsByTile, focusedTileId, value);
      else if (category === 'arrows') stampHiddenOneTile(setArrowsByTile, focusedTileId, value);
      else if (category === 'notes') stampHiddenOneTile(setNotesByTile, focusedTileId, value);
    }
  };
  const readoutsHiddenFor = (tileId: string) => hidePerPanel[tileId]?.readouts ?? hideAllPanels.readouts;

  // Single click router for whichever click-driven tool is active - each
  // tool decides for itself what one click means (Annotate: place a
  // draft pin; Arrow: first click sets point A, second finishes the
  // arrow; Note: place a draft note).
  const handleChartAreaClick = (tileId: string, xFrac: number, yFrac: number) => {
    if (annotateMode) {
      setDraftAnnotation({ tileId, xFrac, yFrac });
      setActiveAnnotation(null);
    } else if (arrowMode) {
      if (!arrowDraftA || arrowDraftA.tileId !== tileId) {
        setArrowDraftA({ tileId, xFrac, yFrac });
      } else {
        const arrow: ArrowShape = {
          id: `arrow-${tileId}-${arrowsByTile[tileId]?.length ?? 0}-${Math.random().toString(36).slice(2)}`,
          xFracA: arrowDraftA.xFrac,
          yFracA: arrowDraftA.yFrac,
          xFracB: xFrac,
          yFracB: yFrac,
        };
        setArrowsByTile((prev) => ({ ...prev, [tileId]: [...(prev[tileId] ?? []), arrow] }));
        setArrowDraftA(null);
        setActiveTool(null);
      }
    } else if (noteMode) {
      setNoteDraft({ tileId, xFrac, yFrac });
    }
  };

  // Linked brushing (Figma node 1063-10) - one global selection (which
  // tile started it, and the x-fraction band) rather than per-tile state,
  // since every visible tile mirrors the identical fraction of its own
  // chart width (see LinkedBrushOverlay's own docs for why fraction-of-
  // width, not translated data units, is the real rule here).
  const [brushSelection, setBrushSelection] = useState<{ sourceTileId: string; xFracStart: number; xFracEnd: number } | null>(
    null,
  );
  const handleBrush = (tileId: string, xFracStart: number, xFracEnd: number) => {
    setBrushSelection({ sourceTileId: tileId, xFracStart, xFracEnd });
    setActiveTool(null);
  };
  const handleClearBrush = () => setBrushSelection(null);

  // Real data-range label for the source tile only (Figma's own "z = 2.1
  // - 4.3 selected") - computed from whichever real x-array this tile
  // kind actually carries client-side (`series[0].x` for the 4 Plotly-
  // capable kinds, `points` for Custom). Approximate for every tile kind
  // (a static PNG's exact plot-area inset isn't known client-side, so
  // even the Plotly-capable kinds' label is a "~" estimate, not an exact
  // pixel-to-data mapping) - falls back to a plain fraction for the
  // static-image-only kinds with no client-side x-array at all, rather
  // than fabricating a data value with no real basis.
  const brushSourceLabel = (tile: CanvasTile, xFracStart: number, xFracEnd: number): string => {
    const xs: number[] | null =
      'series' in tile && tile.series.length > 0 ? tile.series[0].x
        : tile.kind === 'custom' && tile.result ? customResultXs(tile.result)
          : null;
    const xLabel = tile.kind === 'custom' ? (tile.result ? customResultXLabel(tile.result) : null) : 'xLabel' in tile ? tile.xLabel : null;
    if (!xs || xs.length === 0) {
      return `${Math.round(xFracStart * 100)}%–${Math.round(xFracEnd * 100)}% selected`;
    }
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const a = min + xFracStart * (max - min);
    const b = min + xFracEnd * (max - min);
    const label = xLabel ? `${xLabel} ` : '';
    return `~${label}${a.toPrecision(3)}–${b.toPrecision(3)} selected`;
  };

  // Ratio/diff overlay (Figma node 989-10's ratio-diff-popover) - real,
  // decided compatibility rule (the Figma frame itself dims its own
  // "Field PDF" row against a focused "SFR History" tile): only a tile of
  // the SAME statistic as the focused one has an x-axis that means the
  // same thing, so only same-`kind` tiles are real, offerable comparison
  // targets - a ratio/diff between e.g. Redshift and Stellar mass would
  // be a category error, not just a display inconvenience.
  const focusedTile = tiles.find((t) => t.id === focusedTileId);
  const [ratioDiffPopoverOpen, setRatioDiffPopoverOpen] = useState(false);
  const [ratioDiffSelectedId, setRatioDiffSelectedId] = useState<string | null>(null);
  const [ratioDiffMode, setRatioDiffMode] = useState<'ratio' | 'difference'>('ratio');
  const [ratioDiffResult, setRatioDiffResult] = useState<
    { forTileId: string; targetLabel: string; mode: 'ratio' | 'difference'; x: number[]; y: number[] } | null
  >(null);

  const tileCaption = (tile: CanvasTile): string => {
    const p = 'params' in tile ? (tile.params as Record<string, unknown>) : null;
    const suite = p && typeof p.suite === 'string' ? p.suite : null;
    const setName = p && typeof p.setName === 'string' ? p.setName : null;
    const realization = p && 'realizations' in p && Array.isArray(p.realizations)
      ? String(p.realizations[0])
      : p && typeof p.realization !== 'undefined' ? String(p.realization) : null;
    if (suite && setName) return `${suite} · ${setName}${realization !== null ? ` · ${realization}` : ' · all realizations'}`;
    return tile.kind === 'custom' ? 'Live FlatHUB query' : '';
  };

  const ratioDiffCandidates = tiles
    .filter((t): t is CanvasTile => t.id !== focusedTileId && t.kind !== 'empty')
    .map((t) => ({
      tileId: t.id,
      title: tileDisplayTitle(t),
      caption: tileCaption(t),
      compatible: focusedTile ? t.kind === focusedTile.kind : false,
    }));

  const interpolateOnto = (srcX: number[], srcY: number[], gridX: number[]): number[] => gridX.map((x) => {
    if (x <= srcX[0]) return srcY[0];
    if (x >= srcX[srcX.length - 1]) return srcY[srcY.length - 1];
    let i = 0;
    while (i < srcX.length - 1 && srcX[i + 1] < x) i++;
    const x0 = srcX[i];
    const x1 = srcX[i + 1];
    const y0 = srcY[i];
    const y1 = srcY[i + 1];
    return x1 === x0 ? y0 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  });

  const handleCompare = (mode: 'ratio' | 'difference') => {
    if (!focusedTile || !ratioDiffSelectedId) return;
    const target = tiles.find((t) => t.id === ratioDiffSelectedId);
    if (!target || !('series' in focusedTile) || !('series' in target)) return;
    if (focusedTile.series.length === 0 || target.series.length === 0) return;
    const gridX = focusedTile.series[0].x;
    const targetInterp = interpolateOnto(target.series[0].x, target.series[0].y, gridX);
    const y = gridX.map((_, i) => (
      mode === 'ratio' ? focusedTile.series[0].y[i] / targetInterp[i] : focusedTile.series[0].y[i] - targetInterp[i]
    ));
    setRatioDiffResult({
      forTileId: focusedTile.id,
      targetLabel: tileDisplayTitle(target),
      mode,
      x: gridX,
      y,
    });
    setRatioDiffPopoverOpen(false);
    setRatioDiffSelectedId(null);
  };

  /** Appends the real computed ratio/diff series (if any, and if it's for
   * THIS tile) alongside its own real series - the derived line renders
   * on the same axes as an extra trace, not a separate chart. */
  const seriesWithRatioDiff = (tile: { id: string; series: { label: string; x: number[]; y: number[] }[] }) => (
    ratioDiffResult && ratioDiffResult.forTileId === tile.id
      ? [
          ...tile.series,
          {
            label: `${ratioDiffResult.mode === 'ratio' ? 'Ratio' : 'Difference'} vs ${ratioDiffResult.targetLabel}`,
            x: ratioDiffResult.x,
            y: ratioDiffResult.y,
          },
        ]
      : tile.series
  );

  const renderAnnotationOverlay = (tile: CanvasTile) => {
    const tileId = tile.id;
    return (
    <>
      <AnnotationOverlay
        annotations={(annotationsByTile[tileId] ?? []).filter((a) => !a.hidden)}
        activeId={activeAnnotation?.tileId === tileId ? activeAnnotation.id : null}
        onSelect={(id) => setActiveAnnotation(id ? { tileId, id } : null)}
        onDelete={(id) => handleDeleteAnnotation(tileId, id)}
        draft={draftAnnotation?.tileId === tileId ? { xFrac: draftAnnotation.xFrac, yFrac: draftAnnotation.yFrac } : null}
        onSaveDraft={handleSaveAnnotationDraft}
        onCancelDraft={handleCancelAnnotationDraft}
      />
      <ArrowOverlay
        arrows={(arrowsByTile[tileId] ?? []).filter((a) => !a.hidden)}
        onDelete={(id) => handleDeleteArrow(tileId, id)}
        draftA={arrowDraftA?.tileId === tileId ? { xFrac: arrowDraftA.xFrac, yFrac: arrowDraftA.yFrac } : null}
      />
      <NoteOverlay
        notes={(notesByTile[tileId] ?? []).filter((n) => !n.hidden)}
        onSaveText={(id, text) => handleSaveNoteText(tileId, id, text)}
        onDelete={(id) => handleDeleteNote(tileId, id)}
        onMove={(id, xFrac, yFrac) => handleMoveNote(tileId, id, xFrac, yFrac)}
        draft={noteDraft?.tileId === tileId ? { xFrac: noteDraft.xFrac, yFrac: noteDraft.yFrac } : null}
        onSaveDraft={handleSaveNoteDraft}
        onCancelDraft={handleCancelNoteDraft}
      />
      <LinkedBrushOverlay
        captureActive={brushCaptureActive}
        xFracStart={brushSelection ? brushSelection.xFracStart : null}
        xFracEnd={brushSelection ? brushSelection.xFracEnd : null}
        isSource={brushSelection?.sourceTileId === tileId}
        sourceLabel={
          brushSelection && brushSelection.sourceTileId === tileId
            ? brushSourceLabel(tile, brushSelection.xFracStart, brushSelection.xFracEnd)
            : undefined
        }
        onBrush={(xFracStart, xFracEnd) => handleBrush(tileId, xFracStart, xFracEnd)}
        onClear={handleClearBrush}
      />
    </>
    );
  };

  // Real fix (2026-08-06, code-quality audit): every one of the 14
  // <PlotTile> call sites below used to repeat these exact same 5 props
  // verbatim - onFocus/focused/onChartClick/annotationOverlay/
  // readoutsHidden don't vary by tile kind, only by the tile itself, so
  // there was nothing tile-kind-specific about them worth inlining 14
  // times. The remaining chart/readoutGroups/halos props still differ
  // enough per kind that folding this into a full per-kind renderer map
  // would be a much larger, riskier rewrite for the same 4 lines/site this
  // already recovers.
  const commonPlotTileProps = (tile: CanvasTile) => ({
    onFocus: () => focusTile(tile.id),
    focused: tile.id === focusedTileId,
    onChartClick: (annotateMode || arrowMode || noteMode)
      ? (xFrac: number, yFrac: number) => handleChartAreaClick(tile.id, xFrac, yFrac)
      : undefined,
    annotationOverlay: renderAnnotationOverlay(tile),
    readoutsHidden: readoutsHiddenFor(tile.id),
  });

  const showToast = (title: string, detail?: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ title, detail });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  const openAddPlotModal = (tileId: string | null) => {
    setPendingTileId(tileId);
    setIsModalOpen(true);
  };

  const selectPanel = (panel: IconRailPanel) => {
    setFocusedTileId(null);
    setActivePanel(panel);
  };

  const focusTile = (tileId: string) => {
    setActivePanel(null);
    setFocusedTileId(tileId);
  };

  const replaceTile = (tile: CanvasTile) => {
    setTiles((prev) => (pendingTileId ? prev.map((t) => (t.id === pendingTileId ? tile : t)) : [...prev, tile]));
  };

  const refetchMassRangeTile = (id: string, statistic: MassRangeStatistic, params: MassRangeParams) => {
    const previous = tiles.find((t) => t.id === id);
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, params, loading: true } : t)),
    );
    loadMassRangeTile(id, statistic, params, previous?.kind === 'mass-range' ? previous : undefined)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  /** Real (added 2026-08-07, direct user request: wire in the alternate
   * halo finders) - backend.py's already-real get_alt_halo_catalog()/
   * GET /halo-catalog/alt, fetched on demand when a mass-range tile's
   * `UnderlyingHalos.finderPicker` selects something other than 'Subfind'.
   * Shares `bumpRequestSeq`'s own per-tile sequence guard with
   * `refetchMassRangeTile` (not a separate mechanism) - selecting a new
   * finder correctly invalidates an in-flight fetch for the old one, and a
   * params change (Snapshot slider, etc.) correctly invalidates this too. */
  const handleSelectHaloFinder = (id: string, finder: string) => {
    const tile = tiles.find((t) => t.id === id);
    if (!tile || tile.kind !== 'mass-range') return;
    const seq = bumpRequestSeq(id);
    if (finder === 'Subfind') {
      setTiles((prev) =>
        prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, altFinder: 'Subfind', altRows: [], altRawRows: null, altLoading: false, mergerTreeId: null, mergerTreeData: null, mergerTreeError: undefined } : t)),
      );
      return;
    }
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'mass-range'
        ? { ...t, altFinder: finder, altLoading: true, mergerTreeId: null, mergerTreeData: null, mergerTreeError: undefined }
        : t)),
    );
    fetchAltHaloCatalog({
      finder, suite: tile.params.suite, setName: tile.params.setName,
      realization: tile.params.realizations[0], snapnum: tile.params.snapnum,
    })
      .then((catalog) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        if (!catalog) {
          showToast(`No ${finder} catalog`, 'for this suite/set/realization - reverted to Subfind.');
          setTiles((prev) =>
            prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, altFinder: 'Subfind', altRows: [], altRawRows: null, altLoading: false, mergerTreeId: null, mergerTreeData: null, mergerTreeError: undefined } : t)),
          );
          return;
        }
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'mass-range'
            ? { ...t, altRows: catalog.frame, altRawRows: catalog.raw_frame, altLoading: false }
            : t)),
        );
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        showToast(`${finder} catalog failed to load`, String(err));
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, altFinder: 'Subfind', altRows: [], altRawRows: null, altLoading: false, mergerTreeId: null, mergerTreeData: null, mergerTreeError: undefined } : t)),
        );
      });
  };

  /** Real (added 2026-08-07, direct user request: wire in SubLink/
   * SubLink_gal merger history and Rockstar Consistent Trees) - "Trace a
   * subhalo's merger history". Which real endpoint gets called depends on
   * `altFinder`: Subfind traces via SubLink (or SubLink_gal, `variant`),
   * Rockstar via Consistent Trees - both write into the same
   * `mergerTree*` fields either way, since `UnderlyingHalos` renders them
   * identically regardless of which tree produced them. */
  const handleTraceMergerHistory = (id: string, traceId: number, variant?: 'SubLink' | 'SubLink_gal') => {
    const tile = tiles.find((t) => t.id === id);
    if (!tile || tile.kind !== 'mass-range') return;
    const seq = bumpRequestSeq(id);
    const nextVariant = variant ?? tile.mergerTreeVariant;
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'mass-range'
        ? { ...t, mergerTreeId: traceId, mergerTreeVariant: nextVariant, mergerTreeLoading: true, mergerTreeError: undefined }
        : t)),
    );
    const request = tile.altFinder === 'Rockstar'
      ? fetchConsistentTreesHistory({
          suite: tile.params.suite, setName: tile.params.setName,
          realization: tile.params.realizations[0], haloId: traceId,
        })
      : fetchMergerHistory({
          suite: tile.params.suite, setName: tile.params.setName,
          realization: tile.params.realizations[0], subfindId: traceId,
          rootSnapnum: tile.params.snapnum, variant: nextVariant,
        });
    request
      .then((history) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'mass-range'
            ? { ...t, mergerTreeData: history, mergerTreeLoading: false }
            : t)),
        );
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'mass-range'
            ? { ...t, mergerTreeLoading: false, mergerTreeError: String(err) }
            : t)),
        );
      });
  };

  const refetchPowerSpectrumTile = (id: string, params: PowerSpectrumParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'power-spectrum' ? { ...t, params, loading: true } : t)),
    );
    loadPowerSpectrumTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'power-spectrum' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchBispectrumTile = (id: string, params: BispectrumParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'bispectrum' ? { ...t, params, loading: true } : t)),
    );
    loadBispectrumTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'bispectrum' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchSFRHistoryTile = (id: string, params: SFRHistoryParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'sfr-history' ? { ...t, params, loading: true } : t)),
    );
    loadSFRHistoryTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'sfr-history' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchXrayHaloProfilesTile = (id: string, params: XrayHaloProfilesParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'xray-halo-profiles' ? { ...t, params, loading: true } : t)),
    );
    loadXrayHaloProfilesTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'xray-halo-profiles' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchHaloGasProfilesTile = (id: string, params: HaloGasProfilesParams) => {
    const current = tiles.find((t) => t.id === id);
    if (
      current
      && current.kind === 'halo-gas-profiles'
      && current.params.suite === params.suite
      && current.params.setName === params.setName
      && current.params.realization === params.realization
      && current.params.snapnum === params.snapnum
      && current.params.field === params.field
    ) {
      // highlightRank only selects which halo the backend PNG
      // (haloProfilesImageUrl) draws with error bars - the <img> tag's own
      // src re-fetch already handles that; the JSON metadata (note/nHalos)
      // never depends on it, so refetching it here was a wasted round-trip
      // on every tick of the "Highlight halo" slider.
      setTiles((prev) =>
        prev.map((t) => (t.id === id && t.kind === 'halo-gas-profiles' ? { ...t, params } : t)),
      );
      return;
    }
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'halo-gas-profiles' ? { ...t, params, loading: true } : t)),
    );
    loadHaloGasProfilesTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'halo-gas-profiles' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchColorMassDiagramTile = (id: string, params: ColorMassDiagramParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'color-mass-diagram' ? { ...t, params, loading: true } : t)),
    );
    loadColorMassDiagramTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'color-mass-diagram' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchFieldPDFTile = (id: string, params: FieldPDFParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'field-pdf' ? { ...t, params, loading: true } : t)),
    );
    loadFieldPDFTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'field-pdf' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchLymanAlphaSpectrumTile = (id: string, params: LymanAlphaSpectrumParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'lyman-alpha-spectrum' ? { ...t, params, loading: true } : t)),
    );
    loadLymanAlphaSpectrumTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'lyman-alpha-spectrum' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchGalaxyScalingRelationsTile = (id: string, params: GalaxyScalingRelationsParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'galaxy-scaling-relations' ? { ...t, params, loading: true } : t)),
    );
    loadGalaxyScalingRelationsTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'galaxy-scaling-relations' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchFieldMap2DTile = (id: string, params: FieldMap2DParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'field-map-2d' ? { ...t, params, loading: true } : t)),
    );
    loadFieldMap2DTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'field-map-2d' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchDensityField3DTile = (id: string, params: DensityField3DParams) => {
    const current = tiles.find((t) => t.id === id);
    if (
      current
      && current.kind === 'density-field-3d'
      && current.params.suite === params.suite
      && current.params.setName === params.setName
      && current.params.realization === params.realization
      && current.params.snapnum === params.snapnum
      && current.params.field === params.field
      && current.params.grid === params.grid
      && current.params.showVoids === params.showVoids
    ) {
      // Iso-surfaces/Opacity are pure client-side DensityFieldChart trace
      // styling, never sent to the backend - updating params alone re-
      // renders the already-fetched grid instantly with zero network
      // request. Without this, every tick of those two sliders re-fetched
      // the full density grid (+ void catalog) for a byte-identical
      // response - the single worst case of the "range slider causes
      // repeated slow re-renders" complaint, since this grid fetch is one
      // of the heaviest in the app.
      setTiles((prev) =>
        prev.map((t) => (t.id === id && t.kind === 'density-field-3d' ? { ...t, params } : t)),
      );
      return;
    }
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'density-field-3d' ? { ...t, params, loading: true } : t)),
    );
    loadDensityField3DTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'density-field-3d' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchParticleCloud3DTile = (id: string, params: ParticleCloud3DParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'particle-cloud-3d' ? { ...t, params, loading: true } : t)),
    );
    loadParticleCloud3DTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'particle-cloud-3d' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchICParticlesTile = (id: string, params: ICParticlesParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'ic-particles-3d' ? { ...t, params, loading: true } : t)),
    );
    loadICParticlesTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
        streamRemainingICFiles(id, seq, params, requestSeqRef, setTiles);
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'ic-particles-3d' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchCamelsSamTile = (id: string, params: CamelsSamParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'camels-sam' ? { ...t, params, loading: true } : t)),
    );
    loadCamelsSamTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
        streamRemainingSamOctants(id, seq, params, requestSeqRef, setTiles);
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'camels-sam' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchBlackholeMergersTile = (id: string, params: BlackholeMergersParams) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'blackhole-mergers' ? { ...t, params, loading: true } : t)),
    );
    loadBlackholeMergersTile(id, params)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'blackhole-mergers' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const refetchCustomTile = (id: string, selection: CustomSelection) => {
    const seq = bumpRequestSeq(id);
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'custom' ? { ...t, selection, loading: true } : t)),
    );
    loadCustomTile(id, selection)
      .then((updated) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (requestSeqRef.current.get(id) !== seq) return;
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'custom' ? { ...t, loading: false, error: String(err) } : t)),
        );
      });
  };

  const isAnyTileLoading = tiles.some((t) => 'loading' in t && t.loading);

  // Stop button: there's no real network cancellation (see requestSeqRef's
  // own comment), but bumping every loading tile's sequence number means
  // whatever response eventually lands gets silently discarded - matching
  // what the user actually wants ("stop the loading, if nothing is
  // happening or if it's taking long") without needing AbortController
  // plumbing through all 13 loaders.
  const stopAllLoading = () => {
    tiles.forEach((t) => {
      if ('loading' in t && t.loading) bumpRequestSeq(t.id);
    });
    setTiles((prev) => prev.map((t) => ('loading' in t && t.loading ? { ...t, loading: false } : t)));
  };

  const handleSubmitCurated = (selection: CuratedSelection) => {
    setIsModalOpen(false);
    const id = pendingTileId ?? `tile-${tiles.length + 1}`;

    if (isMassRangeStatistic(selection.statistic)) {
      const statistic = selection.statistic;
      const config = MASS_RANGE_CONFIGS[statistic];
      const params: MassRangeParams = {
        suite: selection.suite, setName: selection.set, compareMode: false,
        realizations: [selection.realization], snapnum: DEFAULT_SNAPNUM,
        min: config.defaultMin, max: config.defaultMax, bins: config.defaultBins,
      };
      const placeholder: PlotTileState = {
        id, kind: 'mass-range', statistic, params,
        series: [], xLabel: '', yLabel: '', logX: true, logY: config.logY,
        haloRows: [], haloRawRows: null,
        altFinder: 'Subfind', altRows: [], altRawRows: null, altLoading: false,
        mergerTreeId: null, mergerTreeVariant: 'SubLink', mergerTreeData: null, mergerTreeLoading: false,
        note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchMassRangeTile(id, statistic, params);
      return;
    }

    if (selection.statistic === 'CAMELS-SAM') {
      const params: CamelsSamParams = { realization: Number(selection.realization) || 0 };
      const placeholder: CamelsSamTileState = {
        id, kind: 'camels-sam', params, rows: [], rawRows: null, note: '', octantsLoaded: 0, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchCamelsSamTile(id, params);
      return;
    }

    if (selection.statistic === 'Black Hole Mergers') {
      const params: BlackholeMergersParams = {
        suite: 'IllustrisTNG', setName: selection.set || 'LH', realization: selection.realization,
      };
      const placeholder: BlackholeMergersTileState = {
        id, kind: 'blackhole-mergers', params, rows: [], note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchBlackholeMergersTile(id, params);
      return;
    }

    if (selection.statistic === 'Power Spectrum') {
      const params: PowerSpectrumParams = {
        suite: selection.suite, setName: selection.set, compareMode: false,
        realizations: [selection.realization], snapnum: DEFAULT_SNAPNUM,
        grid: 512, MAS: 'CIC', threads: 1, ptypeLabel: 'DM [1]',
        kRange: 'standard', rsdLabel: 'Real space (none)', multipole: 'P0', showLinearPk: false,
      };
      const placeholder: PowerSpectrumTileState = {
        id, kind: 'power-spectrum', params,
        series: [], xLabel: '', yLabel: '', logX: true, logY: true, note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchPowerSpectrumTile(id, params);
      return;
    }

    if (selection.statistic === 'Bispectrum') {
      const params: BispectrumParams = {
        suite: selection.suite, setName: selection.set, compareMode: false,
        realizations: [selection.realization],
        field: 'Total Matter', muIndex: 7,
        kRange: 'lowk', rsdLabel: 'Real space (none)', ell: 0,
      };
      const placeholder: BispectrumTileState = {
        id, kind: 'bispectrum', params,
        series: [], xLabel: '', yLabel: '', logX: true, logY: true, note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchBispectrumTile(id, params);
      return;
    }

    if (selection.statistic === 'SFR History') {
      const params: SFRHistoryParams = {
        suite: selection.suite, setName: selection.set, compareMode: false,
        realizations: [selection.realization],
        zMin: 0.0, zMax: 10.0, bins: 500,
        showSymbolicFit: true, Om: 0.3, s8: 0.8, A1: 1.0, A3: 1.0,
      };
      const placeholder: SFRHistoryTileState = {
        id, kind: 'sfr-history', params,
        series: [], xLabel: '', yLabel: '', logX: false, logY: true, note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchSFRHistoryTile(id, params);
      return;
    }

    if (selection.statistic === 'X-ray Halo Profiles') {
      const params: XrayHaloProfilesParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
      };
      const placeholder: XrayHaloProfilesTileState = {
        id, kind: 'xray-halo-profiles', params, note: '', nHalos: 0, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchXrayHaloProfilesTile(id, params);
      return;
    }

    if (selection.statistic === 'Halo Gas Profiles') {
      const params: HaloGasProfilesParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        snapnum: DEFAULT_SNAPNUM, field: 'Gas Density', highlightRank: 1,
      };
      const placeholder: HaloGasProfilesTileState = {
        id, kind: 'halo-gas-profiles', params, note: '', nHalos: 0, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchHaloGasProfilesTile(id, params);
      return;
    }

    if (selection.statistic === 'Color-Mass Diagram') {
      const params: ColorMassDiagramParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        snapnum: DEFAULT_SNAPNUM, spsModel: 'BC03', spectraType: 'attenuated',
        filterFamily: 'SLOAN', band1: 'SDSS.g', band2: 'SDSS.r',
      };
      const placeholder: ColorMassDiagramTileState = {
        id, kind: 'color-mass-diagram', params, note: '', nGalaxies: 0, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchColorMassDiagramTile(id, params);
      return;
    }

    if (selection.statistic === 'Field PDF') {
      const params: FieldPDFParams = {
        suite: selection.suite, field: 'Mtot', grid: 128, redshift: 0.0,
      };
      const placeholder: FieldPDFTileState = {
        id, kind: 'field-pdf', params, note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchFieldPDFTile(id, params);
      return;
    }

    if (selection.statistic === 'Lyman-alpha Spectrum') {
      const params: LymanAlphaSpectrumParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        snapnum: DEFAULT_SNAPNUM, sightline: 0,
      };
      const placeholder: LymanAlphaSpectrumTileState = {
        id, kind: 'lyman-alpha-spectrum', params, note: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchLymanAlphaSpectrumTile(id, params);
      return;
    }

    if (selection.statistic === 'Galaxy Scaling Relations') {
      const params: GalaxyScalingRelationsParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        snapnum: DEFAULT_SNAPNUM, SMmin: 1e9, SMmax: 5e11, bins: 12,
      };
      const placeholder: GalaxyScalingRelationsTileState = {
        id, kind: 'galaxy-scaling-relations', params, note: '', source: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchGalaxyScalingRelationsTile(id, params);
      return;
    }

    if (selection.statistic === '2D Field Map') {
      const params: FieldMap2DParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        field: 'Mtot',
      };
      const placeholder: FieldMap2DTileState = {
        id, kind: 'field-map-2d', params, note: '', source: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchFieldMap2DTile(id, params);
      return;
    }

    if (selection.statistic === '3D Density Field') {
      const params: DensityField3DParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        snapnum: DEFAULT_SNAPNUM, field: 'Mtot', grid: 32, isoSurfaces: 12, opacity: 0.08,
        showVoids: false,
      };
      const placeholder: DensityField3DTileState = {
        id, kind: 'density-field-3d', params,
        density: [], boxSize: 25, note: '', source: '', voids: null, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchDensityField3DTile(id, params);
      return;
    }

    if (selection.statistic === '3D Particle Cloud') {
      const params: ParticleCloud3DParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        snapnum: DEFAULT_SNAPNUM, maxParticles: 50_000,
      };
      const placeholder: ParticleCloud3DTileState = {
        id, kind: 'particle-cloud-3d', params,
        positions: [], note: '', source: '', loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchParticleCloud3DTile(id, params);
      return;
    }

    if (selection.statistic === 'Initial Conditions') {
      const params: ICParticlesParams = {
        suite: selection.suite, setName: selection.set, realization: selection.realization,
        maxParticles: 20_000,
      };
      const placeholder: ICParticles3DTileState = {
        id, kind: 'ic-particles-3d', params,
        positions: [], note: '', source: '', filesLoaded: 0, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchICParticlesTile(id, params);
      return;
    }

    // Real, honest gap (see PlotTile.mdx's Usecase): every other statistic
    // still adds a title-only empty tile, rather than fabricate a chart.
    replaceTile({ id, kind: 'empty', title: selection.statistic });
  };

  const handleSubmitCustom = (selection: CustomSelection) => {
    setIsModalOpen(false);
    const id = pendingTileId ?? `tile-${tiles.length + 1}`;
    const placeholder: CustomTileState = {
      id, kind: 'custom', selection, result: null, matchedCount: 0, loading: true,
    };
    replaceTile(placeholder);
    focusTile(id);
    refetchCustomTile(id, selection);
  };

  const removeTile = (id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
    setFocusedTileId((current) => (current === id ? null : current));
  };

  const handleCopyProvenance = () => {
    if (!focusedTile) {
      showToast('No tile is focused', 'Click a tile first, then use Copy provenance.');
      return;
    }
    const provenance = describeTileProvenance(focusedTile);
    if (!provenance) {
      showToast('Nothing to copy yet', 'This tile has no real data loaded.');
      return;
    }
    navigator.clipboard.writeText(provenance);
    showToast('Copied provenance to clipboard', provenance);
  };

  const tileCode = focusedTile ? generateTileCode(focusedTile) : null;

  return (
    <div className="app-shell">
      <IconRail activePanel={activePanel} onSelectPanel={selectPanel} />
      {activePanel && (
        <div className="app-shell__side-panel">
          {/* Project/Files panel content isn't designed yet — see
              STUDIO_PLAN.md's "Left icon rail" section. */}
          {activePanel === 'project' ? 'Project panel — not yet designed.' : 'Files panel — not yet designed.'}
        </div>
      )}
      {!activePanel && focusedTile?.kind === 'mass-range' && (
        <MassRangeSidebar
          statistic={focusedTile.statistic}
          params={focusedTile.params}
          onChange={(params) => refetchMassRangeTile(focusedTile.id, focusedTile.statistic, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'power-spectrum' && (
        <PowerSpectrumSidebar
          params={focusedTile.params}
          onChange={(params) => refetchPowerSpectrumTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'bispectrum' && (
        <BispectrumSidebar
          params={focusedTile.params}
          onChange={(params) => refetchBispectrumTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'sfr-history' && (
        <SFRHistorySidebar
          params={focusedTile.params}
          onChange={(params) => refetchSFRHistoryTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'xray-halo-profiles' && (
        <XrayHaloProfilesSidebar
          params={focusedTile.params}
          onChange={(params) => refetchXrayHaloProfilesTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'halo-gas-profiles' && (
        <HaloGasProfilesSidebar
          params={focusedTile.params}
          onChange={(params) => refetchHaloGasProfilesTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
          maxHighlightRank={focusedTile.nHalos || 1}
        />
      )}
      {!activePanel && focusedTile?.kind === 'color-mass-diagram' && (
        <ColorMassDiagramSidebar
          params={focusedTile.params}
          onChange={(params) => refetchColorMassDiagramTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'field-pdf' && (
        <FieldPDFSidebar
          params={focusedTile.params}
          onChange={(params) => refetchFieldPDFTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'lyman-alpha-spectrum' && (
        <LymanAlphaSpectrumSidebar
          params={focusedTile.params}
          onChange={(params) => refetchLymanAlphaSpectrumTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'galaxy-scaling-relations' && (
        <GalaxyScalingRelationsSidebar
          params={focusedTile.params}
          onChange={(params) => refetchGalaxyScalingRelationsTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'field-map-2d' && (
        <FieldMap2DSidebar
          params={focusedTile.params}
          onChange={(params) => refetchFieldMap2DTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'density-field-3d' && (
        <DensityField3DSidebar
          params={focusedTile.params}
          onChange={(params) => refetchDensityField3DTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'particle-cloud-3d' && (
        <ParticleCloud3DSidebar
          params={focusedTile.params}
          onChange={(params) => refetchParticleCloud3DTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'ic-particles-3d' && (
        <ICParticlesSidebar
          params={focusedTile.params}
          onChange={(params) => refetchICParticlesTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'camels-sam' && (
        <CamelsSamSidebar
          params={focusedTile.params}
          onChange={(params) => refetchCamelsSamTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'blackhole-mergers' && (
        <BlackholeMergersSidebar
          params={focusedTile.params}
          onChange={(params) => refetchBlackholeMergersTile(focusedTile.id, params)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      {!activePanel && focusedTile?.kind === 'custom' && (
        <CustomSidebar
          selection={focusedTile.selection}
          onChange={(selection) => refetchCustomTile(focusedTile.id, selection)}
          onRemove={() => removeTile(focusedTile.id)}
        />
      )}
      <div className="app-shell__main">
        <TopNav
          onAddPlot={() => openAddPlotModal(null)}
          // Real evidence (Figma node 1113:1583's header, and 1012:1124's
          // merged header/toolbar): the toolbar isn't present at all in the
          // zero-plots skeleton, and lives in the SAME row as the
          // breadcrumbs/Add Plot button, not a separate row beneath it.
          toolbar={
            tiles.length > 0 ? (
              <Toolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onAnnotate={() => toggleTool('annotate')}
                annotateActive={annotateMode}
                onArrow={() => toggleTool('arrow')}
                arrowActive={arrowMode}
                onNote={() => toggleTool('note')}
                noteActive={noteMode}
                onHide={() => setHidePopoverOpen((open) => !open)}
                hidePopover={
                  hidePopoverOpen ? (
                    <HidePopover
                      scope={hideScope}
                      onScopeChange={setHideScope}
                      values={hideScope === 'all' ? hideAllPanels : (hidePerPanel[focusedTileId ?? ''] ?? EMPTY_HIDE_VALUES)}
                      onToggle={handleHideToggle}
                      panelDisabled={!focusedTile}
                      onClose={() => setHidePopoverOpen(false)}
                    />
                  ) : undefined
                }
                onRatioDiff={() => setRatioDiffPopoverOpen((open) => !open)}
                ratioDiffPopover={
                  ratioDiffPopoverOpen && focusedTile ? (
                    <RatioDiffPopover
                      candidates={ratioDiffCandidates}
                      selectedTileId={ratioDiffSelectedId}
                      onSelect={setRatioDiffSelectedId}
                      onNewPlot={() => {
                        setRatioDiffPopoverOpen(false);
                        openAddPlotModal(null);
                      }}
                      onCompare={handleCompare}
                      mode={ratioDiffMode}
                      onModeChange={setRatioDiffMode}
                      onClose={() => setRatioDiffPopoverOpen(false)}
                    />
                  ) : undefined
                }
                onRuler={() => toggleTool('ruler')}
                rulerActive={rulerMode}
                onLinkedBrushing={() => toggleTool('brush')}
                linkedBrushingActive={brushCaptureActive}
                onCopyProvenance={handleCopyProvenance}
                onCopyAsCode={() => setCodePopoverOpen((open) => !open)}
                copyAsCodePopover={
                  codePopoverOpen ? (
                    tileCode ? (
                      <CopyAsCodePopover code={tileCode} onClose={() => setCodePopoverOpen(false)} />
                    ) : (
                      <CopyAsCodePopover
                        code={
                          focusedTile
                            ? '# No real backend.py call is templated for this tile kind yet.'
                            : '# No tile is focused - click a tile first.'
                        }
                        onClose={() => setCodePopoverOpen(false)}
                      />
                    )
                  ) : undefined
                }
              />
            ) : undefined
          }
          loadingIndicator={isAnyTileLoading ? <LoadingIndicator onStop={stopAllLoading} /> : undefined}
        />
        <div className="app-shell__canvas">
          {toast && (
            <div className="app-shell__toast-anchor">
              <Toast title={toast.title} detail={toast.detail} />
            </div>
          )}
          <Viewer mode={viewMode}>
            {tiles.length === 0 ? (
              // Real nesting (Figma node 1113:1609 "stats-row" is the last
              // child inside Panel 1's own card, not a separate row above
              // it) — see Tile.mdx / CanvasStatsRow.mdx.
              <Tile
                title="Panel 1"
                onAddPlot={() => openAddPlotModal(null)}
                footer={<CanvasStatsRow stats={CANVAS_STATS} />}
              />
            ) : (
              tiles.map((tile) => {
                if (tile.kind === 'mass-range') {
                  const config = MASS_RANGE_CONFIGS[tile.statistic];
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title={tile.statistic}
                      chart={{
                        series: seriesWithRatioDiff(tile),
                        forceInteractiveSignal: ratioDiffResult?.forTileId === tile.id ? ratioDiffResult : undefined,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: massRangeImageUrl(config, {
                          suite: tile.params.suite,
                          setName: tile.params.setName,
                          realizations: tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]],
                          snapnum: tile.params.snapnum,
                          min: tile.params.min,
                          max: tile.params.max,
                          bins: tile.params.bins,
                        }),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realizations (compare)', value: tile.params.realizations.join(', ') },
                        { label: config.rangeLabel, value: `${tile.params.min.toExponential()} – ${tile.params.max.toExponential()}` },
                        { label: 'Bins', value: String(tile.params.bins) },
                      ]}
                      halos={(() => {
                        // Real, established precedent (ChartModeDropdown's
                        // own "no toggle when nothing to switch to") -
                        // suites with no real alternate-finder coverage
                        // (Swift-EAGLE) get no picker at all, not a
                        // 1-option dropdown with nothing to pick.
                        const finders = availableHaloFinders(tile.params.suite);
                        const finderPicker = finders.length > 1
                          ? {
                              current: tile.altFinder,
                              options: finders,
                              onSelect: (finder: string) => handleSelectHaloFinder(tile.id, finder),
                              loading: tile.altLoading,
                            }
                          : null;
                        if (tile.altFinder === 'Subfind') {
                          // Real (backend.py's PUBLIC_SUBLINK_SUITES) - SubLink
                          // covers 3 of Subfind's 4 suites (no Swift-EAGLE) -
                          // mirrored directly, same small-stable-set precedent
                          // as HALO_FINDER_CONFIG's own suite sets.
                          const sublinkSuites = new Set(['IllustrisTNG', 'SIMBA', 'Astrid']);
                          const defaultSubfindId = tile.haloRows.length
                            ? tile.haloRows.reduce((best, r) => (r.stellarMass > best.stellarMass ? r : best)).subfindId
                            : null;
                          return {
                            rows: tile.haloRows,
                            rawRows: tile.haloRawRows,
                            // Halo Mass Function/Baryon Fraction are binned by
                            // FoF group mass, which has no column in this
                            // per-subhalo table - see UnderlyingHalos.mdx.
                            massContextNote:
                              tile.statistic !== 'Stellar Mass Function'
                                ? `${tile.statistic} bins by each halo's total FoF group mass, a different (and coarser) quantity than any column shown below - this table is the same real per-subhalo Subfind catalog Stellar Mass Function uses, not a halo-level one.`
                                : undefined,
                            finderPicker,
                            mergerHistory: sublinkSuites.has(tile.params.suite) && defaultSubfindId !== null
                              ? {
                                  idLabel: 'SubfindID to trace',
                                  id: tile.mergerTreeId ?? defaultSubfindId,
                                  onIdChange: (traceId: number) => handleTraceMergerHistory(tile.id, traceId),
                                  variantOptions: {
                                    current: tile.mergerTreeVariant,
                                    options: ['SubLink', 'SubLink_gal'],
                                    onSelect: (v: string) => handleTraceMergerHistory(tile.id, tile.mergerTreeId ?? defaultSubfindId, v as 'SubLink' | 'SubLink_gal'),
                                  },
                                  loading: tile.mergerTreeLoading,
                                  error: tile.mergerTreeError,
                                  data: tile.mergerTreeData,
                                }
                              : null,
                          };
                        }
                        const cfg = HALO_FINDER_CONFIG[tile.altFinder];
                        // Real constraint (get_consistent_trees_history's own
                        // docstring) - Consistent Trees ids are only
                        // meaningful at the root (z=0) snapshot, the only one
                        // locations.dat indexes - offering this at any other
                        // snapshot would trace the wrong halo silently.
                        const defaultRockstarId = tile.altFinder === 'Rockstar' && tile.altRows.length
                          ? Number(tile.altRows.reduce((best, r) =>
                              (Number(r[cfg.filterKey]) > Number(best[cfg.filterKey]) ? r : best)).id)
                          : null;
                        return {
                          rows: tile.altLoading ? [] : tile.altRows,
                          rawRows: tile.altRawRows,
                          columns: cfg.columns,
                          filter: { key: cfg.filterKey, label: 'Minimum stellar mass', format: (v: number) => v.toExponential(2) },
                          label: `View underlying ${cfg.itemNoun} (${tile.altFinder})`,
                          itemNoun: cfg.itemNoun,
                          footerNoun: cfg.itemNoun,
                          csvFilename: `${tile.params.suite}_${tile.params.setName}_${tile.params.realizations[0]}_${tile.altFinder.replace(/\s+/g, '_')}.csv`,
                          finderPicker,
                          mergerHistory: tile.altFinder === 'Rockstar' && tile.params.snapnum === 33 && defaultRockstarId !== null
                            ? {
                                idLabel: 'Rockstar halo ID to trace (Consistent Trees, z=0 only)',
                                id: tile.mergerTreeId ?? defaultRockstarId,
                                onIdChange: (traceId: number) => handleTraceMergerHistory(tile.id, traceId),
                                loading: tile.mergerTreeLoading,
                                error: tile.mergerTreeError,
                                data: tile.mergerTreeData,
                              }
                            : null,
                        };
                      })()}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'power-spectrum') {
                  const ptype = PTYPE_OPTIONS[tile.params.ptypeLabel];
                  const realizations = tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]];
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Power Spectrum"
                      chart={{
                        series: seriesWithRatioDiff(tile),
                        forceInteractiveSignal: ratioDiffResult?.forTileId === tile.id ? ratioDiffResult : undefined,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: powerSpectrumImageUrl({
                          suite: tile.params.suite, setName: tile.params.setName, realizations,
                          snapnum: tile.params.snapnum, grid: tile.params.grid, MAS: tile.params.MAS,
                          threads: tile.params.threads, ptype,
                          kRange: tile.params.kRange, rsdAxis: rsdAxisFromLabel(tile.params.rsdLabel),
                          multipole: tile.params.multipole, showLinearPk: tile.params.showLinearPk,
                        }),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realizations (compare)', value: tile.params.realizations.join(', ') },
                        { label: 'Grid / MAS', value: `${tile.params.grid} · ${tile.params.MAS}` },
                        { label: 'Particle type', value: tile.params.ptypeLabel },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'bispectrum') {
                  const realizations = tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]];
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Bispectrum"
                      chart={{
                        series: seriesWithRatioDiff(tile),
                        forceInteractiveSignal: ratioDiffResult?.forTileId === tile.id ? ratioDiffResult : undefined,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: bispectrumImageUrl({
                          suite: tile.params.suite, setName: tile.params.setName, realizations,
                          field: tile.params.field, muIndex: tile.params.muIndex,
                          kRange: tile.params.kRange, rsdAxis: rsdAxisFromLabel(tile.params.rsdLabel), ell: tile.params.ell,
                        }),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realizations (compare)', value: tile.params.realizations.join(', ') },
                        { label: 'Field', value: tile.params.field },
                        { label: 'Triangle shape (mu)', value: String(tile.params.muIndex) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'sfr-history') {
                  const realizations = tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]];
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="SFR History"
                      chart={{
                        series: seriesWithRatioDiff(tile),
                        forceInteractiveSignal: ratioDiffResult?.forTileId === tile.id ? ratioDiffResult : undefined,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: sfrHistoryImageUrl({
                          suite: tile.params.suite, setName: tile.params.setName, realizations,
                          zMin: tile.params.zMin, zMax: tile.params.zMax, bins: tile.params.bins,
                          showSymbolicFit: tile.params.showSymbolicFit,
                          Om: tile.params.Om, s8: tile.params.s8, A1: tile.params.A1, A3: tile.params.A3,
                        }),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realizations (compare)', value: tile.params.realizations.join(', ') },
                        { label: 'Redshift range', value: `${tile.params.zMin.toFixed(1)} – ${tile.params.zMax.toFixed(1)}` },
                        { label: 'Bins', value: String(tile.params.bins) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'xray-halo-profiles') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="X-ray Halo Profiles"
                      chart={{
                        kind: 'static-image',
                        imageUrl: xrayProfilesImageUrl(tile.params),
                        alt: 'X-ray luminosity profile vs radius, colored by halo mass',
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Halos', value: String(tile.nHalos) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'halo-gas-profiles') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Halo Gas Profiles"
                      chart={{
                        kind: 'static-image',
                        imageUrl: haloProfilesImageUrl(tile.params),
                        alt: `${tile.params.field} profile vs radius, colored by halo mass`,
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Field', value: tile.params.field },
                        { label: 'Halos', value: String(tile.nHalos) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'color-mass-diagram') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Color-Mass Diagram"
                      chart={{
                        kind: 'static-image',
                        imageUrl: colorMassDiagramImageUrl(tile.params),
                        alt: `${tile.params.band1} - ${tile.params.band2} color vs. log stellar mass`,
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Color', value: `${tile.params.band1} − ${tile.params.band2}` },
                        { label: 'Galaxies', value: String(tile.nGalaxies) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'field-pdf') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Field PDF"
                      chart={{
                        kind: 'static-image',
                        imageUrl: fieldPDFImageUrl(tile.params),
                        alt: `${tile.params.field} PDF, mean ± std across the LH ensemble`,
                      }}
                      readoutGroups={[
                        { label: 'Suite', value: tile.params.suite },
                        { label: 'Field', value: tile.params.field },
                        { label: 'Grid', value: String(tile.params.grid) },
                        { label: 'Redshift', value: tile.params.redshift.toFixed(2) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'lyman-alpha-spectrum') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Lyman-alpha Spectrum"
                      chart={{
                        kind: 'static-image',
                        imageUrl: lymanAlphaSpectrumImageUrl(tile.params),
                        alt: 'Lyman-alpha transmitted flux and HI column density vs. spectral pixel',
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Snapshot', value: String(tile.params.snapnum) },
                        { label: 'Sightline', value: String(tile.params.sightline) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'galaxy-scaling-relations') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Galaxy Scaling Relations"
                      chart={{
                        kind: 'static-image',
                        imageUrl: scalingRelationsImageUrl(tile.params),
                        alt: 'Stellar half-mass radius, BH mass, SFR, Vmax, and metallicity vs. stellar mass',
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Stellar mass range', value: `${tile.params.SMmin.toExponential()} – ${tile.params.SMmax.toExponential()}` },
                        { label: 'Bins', value: String(tile.params.bins) },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'field-map-2d') {
                  const group = tile.params.groupSize;
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="2D Field Map"
                      chart={
                        group && tile.cells
                          ? {
                              kind: 'plotly-3d',
                              content: (
                                <FieldMapMosaic
                                  rows={group.rows}
                                  cols={group.cols}
                                  field={tile.params.field}
                                  cells={tile.cells.map((cell) => (cell
                                    ? { realization: cell.realization, imageUrl: fieldMap2DImageUrl({ ...tile.params, realization: cell.realization }) }
                                    : null))}
                                />
                              ),
                            }
                          : {
                              kind: 'static-image',
                              imageUrl: fieldMap2DImageUrl(tile.params),
                              alt: `${tile.params.field} 2D column-density-style projection`,
                            }
                      }
                      readoutGroups={
                        group && tile.cells
                          ? [
                              { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                              { label: 'Realizations', value: `${Number(tile.params.realization)}–${Number(tile.params.realization) + group.rows * group.cols - 1} (${group.rows} × ${group.cols})` },
                              { label: 'Field', value: tile.params.field },
                            ]
                          : [
                              { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                              { label: 'Realization', value: String(tile.params.realization) },
                              { label: 'Field', value: tile.params.field },
                            ]
                      }
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'density-field-3d') {
                  // Real, fixed set (backend.py's own CMD_MASS_TYPE_FIELDS) -
                  // mass-type fields plot as overdensity rho/mean(rho), every
                  // other field in its own raw CMD units. Same precedent as
                  // PowerSpectrumSidebar's PTYPE_OPTIONS: a small, stable
                  // constant mirrored directly rather than round-tripped
                  // through metadata for a 4-item set.
                  const massTypeFields = new Set(['Mtot', 'Mgas', 'Mcdm', 'Mstar']);
                  const colorbarTitle = massTypeFields.has(tile.params.field) ? 'ρ/ρ̄' : tile.params.field;
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="3D Density Field"
                      chart={{
                        kind: 'plotly-3d',
                        content: (
                          <DensityFieldChart
                            density={tile.density}
                            boxSize={tile.boxSize}
                            colorbarTitle={colorbarTitle}
                            isoSurfaces={tile.params.isoSurfaces}
                            opacity={tile.params.opacity}
                            rulerMode={rulerMode && tile.id === focusedTileId}
                            voids={
                              tile.voids && {
                                positions: tile.voids.positions,
                                radius: tile.voids.radius,
                                densityContrast: tile.voids.density_contrast,
                                extra: tile.voids.extra,
                              }
                            }
                          />
                        ),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Field', value: tile.params.field },
                        { label: 'Grid', value: String(tile.params.grid) },
                      ]}
                      halos={null}
                      catalogTable={
                        // Matches app.py's own real gate (`if show_voids and
                        // voids.extra is not None`) - the synthetic-fallback
                        // void overlay has no `extra` at all, so there's no
                        // real per-void table to show for it either.
                        tile.voids && tile.voids.extra
                          ? {
                              rows: tile.voids.positions.map((_, i) => ({
                                radius: tile.voids!.radius[i],
                                density_contrast: tile.voids!.density_contrast[i],
                                ...tile.voids!.extra![i],
                              })),
                              columns: VOID_COLUMNS,
                              filter: null,
                              label: 'View void catalog',
                              itemNoun: 'voids',
                              footerNoun: 'voids',
                              csvFilename: `${tile.params.suite}_${tile.params.setName}_${tile.params.realization}_vide_voids.csv`,
                            }
                          : null
                      }
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'particle-cloud-3d') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="3D Particle Cloud"
                      chart={{
                        kind: 'plotly-3d',
                        content: (
                          <ParticleCloudChart
                            positions={tile.positions}
                            rulerMode={rulerMode && tile.id === focusedTileId}
                          />
                        ),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Particles', value: tile.positions.length.toLocaleString() },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'ic-particles-3d') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Initial Conditions"
                      chart={{
                        kind: 'plotly-3d',
                        content: (
                          <ParticleCloudChart
                            positions={tile.positions}
                            rulerMode={rulerMode && tile.id === focusedTileId}
                          />
                        ),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Particles', value: tile.positions.length.toLocaleString() },
                        { label: 'Files loaded', value: `${tile.filesLoaded}/${N_IC_FILES}` },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'camels-sam') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="CAMELS-SAM"
                      chart={{ kind: 'plotly-3d', content: <CamelsSamCharts rows={tile.rows} /> }}
                      readoutGroups={[
                        { label: 'Set', value: 'LH (Santa Cruz SAM)' },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Galaxies', value: tile.rows.length.toLocaleString() },
                        { label: 'Octants loaded', value: `${tile.octantsLoaded}/${SAM_OCTANTS.length}` },
                      ]}
                      halos={{
                        rows: tile.rows,
                        rawRows: tile.rawRows,
                        columns: SAM_COLUMNS,
                        filter: { key: 'Stellar Mass [Msun]', label: 'Minimum stellar mass', format: (v) => v.toExponential(2) },
                        label: 'View underlying galaxies',
                        itemNoun: 'galaxies',
                        footerNoun: 'galaxies',
                        csvFilename: `LH_${tile.params.realization}_camels-sam.csv`,
                      }}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'blackhole-mergers') {
                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title="Black Hole Mergers"
                      chart={{
                        series: [{
                          label: 'merger events',
                          x: tile.rows.map((r) => r.Redshift),
                          y: tile.rows.map((r) => r['Swallower BH Mass [Msun/h]'] + r['Swallowed BH Mass [Msun/h]']),
                        }],
                        xLabel: 'Redshift',
                        yLabel: 'Combined BH mass [Msun/h]',
                        logY: true,
                        mode: 'markers',
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Merger events', value: tile.rows.length.toLocaleString() },
                      ]}
                      halos={{
                        rows: tile.rows,
                        columns: BLACKHOLE_MERGERS_COLUMNS,
                        filter: null,
                        label: 'View merger events',
                        itemNoun: 'events',
                        footerNoun: 'events',
                        csvFilename: `${tile.params.suite}_${tile.params.setName}_${tile.params.realization}_blackhole_mergers.csv`,
                      }}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                if (tile.kind === 'custom') {
                  const { selection, result } = tile;
                  const filterSummary = [
                    selection.suite || 'Any suite',
                    selection.set || 'Any set',
                    selection.type,
                  ].join(' · ');
                  const fieldReadout = result === null ? [] : (() => {
                    switch (result.kind) {
                      case 'scatter': return [
                        { label: 'X field', value: selection.xField },
                        { label: 'Y field', value: selection.yField },
                      ];
                      case 'scatter3d': return [
                        { label: 'X field', value: selection.xField },
                        { label: 'Y field', value: selection.yField },
                        { label: 'Z field', value: selection.zField },
                      ];
                      case 'histogram': return [{ label: 'Field', value: selection.xField }];
                      case 'heatmap': return [
                        { label: 'X field', value: selection.xField },
                        { label: 'Y field', value: selection.yField },
                      ];
                      case 'boxplot': return [
                        { label: 'Bucket field', value: selection.xField },
                        { label: 'Value field', value: selection.yField },
                      ];
                      default: return [];
                    }
                  })();

                  // While `result` is still null (the placeholder tile,
                  // before its first real fetch resolves), render an empty
                  // 2D scatter shell rather than special-casing a "loading"
                  // chart kind - matches every other tile kind's own
                  // placeholder-then-replace pattern (see handleSubmitCustom).
                  const chart: PlotTileChart = !result
                    ? { series: [], xLabel: '', yLabel: '' }
                    : result.kind === 'scatter'
                      ? {
                          series: [{ label: 'rows', x: result.points.map((p) => p.x), y: result.points.map((p) => p.y) }],
                          xLabel: result.xLabel,
                          yLabel: result.yLabel,
                          logX: selection.logX,
                          logY: selection.logY,
                          mode: 'markers',
                          markerColor: selection.colorField
                            ? { values: result.points.map((p) => p.color ?? 0), title: result.colorLabel }
                            : undefined,
                        }
                      : result.kind === 'scatter3d'
                        ? {
                            kind: 'plotly-3d',
                            content: (
                              <Plotly3DChart
                                xLabel={result.xLabel}
                                yLabel={result.yLabel}
                                zLabel={result.zLabel}
                                pinEnabled={false}
                                data={[{
                                  type: 'scatter3d',
                                  mode: 'markers',
                                  x: result.points.map((p) => p.x),
                                  y: result.points.map((p) => p.y),
                                  z: result.points.map((p) => p.z),
                                  marker: selection.colorField
                                    ? {
                                        color: result.points.map((p) => p.color ?? 0),
                                        colorscale: 'Viridis',
                                        showscale: true,
                                        // Real fix (2026-08-06, direct user feedback: "illegible font
                                        // colors"): a colorbar's title/tick font is trace-level, not
                                        // layout-level, so it doesn't inherit Plotly3DChart's own dark-
                                        // scene AXIS_TEXT_COLOR - without this it defaulted to Plotly's
                                        // near-black default text color, unreadable against this dark
                                        // scene. Same literal DensityFieldChart's own colorbar already
                                        // uses (COLORBAR_TEXT_COLOR) for the identical reason.
                                        colorbar: {
                                          title: { text: result.colorLabel, font: { color: '#e5e7eb' } },
                                          tickfont: { color: '#e5e7eb' },
                                        },
                                        size: 3,
                                      }
                                    : { size: 3, color: '#7B2D8E' },
                                }]}
                              />
                            ),
                          }
                        : {
                            kind: 'plotly-3d',
                            content: <CustomAggregateChart
                              data={
                                result.kind === 'histogram'
                                  ? { kind: 'histogram', xLabel: result.xLabel, logX: selection.logX, buckets: result.buckets }
                                  : result.kind === 'heatmap'
                                    ? {
                                        kind: 'heatmap', xLabel: result.xLabel, yLabel: result.yLabel,
                                        logX: selection.logX, logY: selection.logY, buckets: result.buckets,
                                      }
                                    : { kind: 'boxplot', xLabel: result.xLabel, valueLabel: result.valueLabel, logX: selection.logX, buckets: result.buckets }
                              }
                            />,
                          };

                  return (
                    <PlotTile
                      key={tile.id}
                      error={tile.error}
                      title={customTileTitle(result)}
                      chart={chart}
                      readoutGroups={[
                        { label: 'Suite / Set / Type', value: filterSummary },
                        ...fieldReadout,
                        { label: 'Rows matched', value: tile.matchedCount.toLocaleString() },
                      ]}
                      halos={null}
                      {...commonPlotTileProps(tile)}
                    />
                  );
                }

                return <Tile key={tile.id} title={tile.title} onAddPlot={() => openAddPlotModal(tile.id)} />;
              })
            )}
          </Viewer>
        </div>
      </div>
      <AddPlotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitCurated={handleSubmitCurated}
        onSubmitCustom={handleSubmitCustom}
      />
    </div>
  );
}
