import { useState } from 'react';
import { IconRail } from './components/IconRail/IconRail';
import type { IconRailPanel } from './components/IconRail/IconRail';
import { TopNav } from './components/TopNav/TopNav';
import { Toolbar } from './components/Toolbar/Toolbar';
import type { ViewMode } from './components/Toolbar/Toolbar';
import { Viewer } from './components/Viewer/Viewer';
import { Tile } from './components/Tile/Tile';
import { PlotTile } from './components/PlotTile/PlotTile';
import { CanvasStatsRow } from './components/CanvasStatsRow/CanvasStatsRow';
import { AddPlotModal } from './components/AddPlotModal/AddPlotModal';
import type { CuratedSelection } from './components/AddPlotModal/CuratedTab';
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
import { DensityField3DSidebar } from './components/DensityField3DSidebar/DensityField3DSidebar';
import type { DensityField3DParams } from './components/DensityField3DSidebar/DensityField3DSidebar';
import { ParticleCloud3DSidebar } from './components/ParticleCloud3DSidebar/ParticleCloud3DSidebar';
import type { ParticleCloud3DParams } from './components/ParticleCloud3DSidebar/ParticleCloud3DSidebar';
import { DensityFieldChart } from './components/DensityFieldChart/DensityFieldChart';
import { ParticleCloudChart } from './components/ParticleCloudChart/ParticleCloudChart';
import {
  fetchMassRangeResult, fetchHaloCatalog, toHaloRows, massRangeImageUrl,
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
} from './lib/api';
import type { Result, VoidCatalog } from './lib/api';
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
 * Galaxy Scaling Relations/2D Field Map are static-image (always have a
 * value - both have real synthetic fallbacks); 3D Density Field/3D
 * Particle Cloud are plotly-3d (also always have a value) and store their
 * own raw fetched data (density grid, positions, void overlay) rather
 * than a pre-built chart node, so the tile-render switch below can build
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
  | EmptyTileState;

async function loadMassRangeTile(id: string, statistic: MassRangeStatistic, params: MassRangeParams): Promise<PlotTileState> {
  const config = MASS_RANGE_CONFIGS[statistic];
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const results = await Promise.all(
    realizations.map((realization) =>
      fetchMassRangeResult(config, {
        suite: params.suite, setName: params.setName, realization,
        snapnum: DEFAULT_SNAPNUM, min: params.min, max: params.max, bins: params.bins,
      }),
    ),
  );
  const catalog = await fetchHaloCatalog({
    suite: params.suite, setName: params.setName, realization: realizations[0], snapnum: DEFAULT_SNAPNUM,
  });
  const first = results[0];
  return {
    id,
    kind: 'mass-range',
    statistic,
    params,
    series: results.map((r, i) => ({ label: `${params.setName}_${realizations[i]}`, x: r.x, y: r.y })),
    xLabel: first.x_label,
    yLabel: first.y_label,
    logX: first.log_x,
    logY: first.log_y,
    haloRows: toHaloRows(catalog),
    haloRawRows: catalog?.raw_frame ?? null,
    loading: false,
  };
}

async function loadPowerSpectrumTile(id: string, params: PowerSpectrumParams): Promise<PowerSpectrumTileState> {
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const ptype = PTYPE_OPTIONS[params.ptypeLabel];
  const rsdAxis = rsdAxisFromLabel(params.rsdLabel);
  const results = await Promise.all(
    realizations.map((realization) =>
      fetchPowerSpectrum({
        suite: params.suite, setName: params.setName, realization, snapnum: DEFAULT_SNAPNUM,
        grid: params.grid, MAS: params.MAS, threads: params.threads, ptype,
        kRange: params.kRange, rsdAxis, multipole: params.multipole,
      }),
    ),
  );
  const first = results[0];
  return {
    id, kind: 'power-spectrum', params,
    series: results.map((r, i) => ({ label: `${params.setName}_${realizations[i]}`, x: r.x, y: r.y })),
    xLabel: first.x_label, yLabel: first.y_label, logX: first.log_x, logY: first.log_y,
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
      }).then((r) => ({ realization, r })),
    ),
  );
  // Real gap, not a bug: Bispectrum has no synthetic fallback, so some
  // (or all) selected realizations can come back null - matches app.py's
  // own generic block filtering None results before plotting.
  const withData = fetched.filter((f): f is { realization: number; r: Result } => f.r !== null);
  if (withData.length === 0) {
    throw new Error(
      'No real data for this suite/set/realization - Bispectrum has no synthetic fallback. ' +
      'Try IllustrisTNG or SIMBA, LH set.',
    );
  }
  const first = withData[0].r;
  return {
    id, kind: 'bispectrum', params,
    series: withData.map(({ realization, r }) => ({ label: `${params.setName}_${realization}`, x: r.x, y: r.y })),
    xLabel: first.x_label, yLabel: first.y_label, logX: first.log_x, logY: first.log_y,
    loading: false,
  };
}

async function loadSFRHistoryTile(id: string, params: SFRHistoryParams): Promise<SFRHistoryTileState> {
  const realizations = params.compareMode ? params.realizations : [params.realizations[0]];
  const results = await Promise.all(
    realizations.map((realization) =>
      fetchSFRHistory({
        suite: params.suite, setName: params.setName, realization,
        zMin: params.zMin, zMax: params.zMax, bins: params.bins,
      }),
    ),
  );
  const first = results[0];
  return {
    id, kind: 'sfr-history', params,
    series: results.map((r, i) => ({ label: `${params.setName}_${realizations[i]}`, x: r.x, y: r.y })),
    xLabel: first.x_label, yLabel: first.y_label, logX: first.log_x, logY: first.log_y,
    loading: false,
  };
}

async function loadXrayHaloProfilesTile(id: string, params: XrayHaloProfilesParams): Promise<XrayHaloProfilesTileState> {
  const meta = await fetchXrayProfilesMeta(params);
  if (meta === null) {
    throw new Error(
      'No real X-ray profile data for this suite/set/realization - real-data only, no synthetic ' +
      'fallback. Try IllustrisTNG or SIMBA.',
    );
  }
  return { id, kind: 'xray-halo-profiles', params, note: meta.note, nHalos: meta.nHalos, loading: false };
}

async function loadHaloGasProfilesTile(id: string, params: HaloGasProfilesParams): Promise<HaloGasProfilesTileState> {
  const meta = await fetchHaloProfilesMeta(params);
  if (meta === null) {
    throw new Error(
      'No real halo gas profile data for this suite/set/realization - real-data only, no ' +
      'synthetic fallback. Try IllustrisTNG or SIMBA, LH or CV set.',
    );
  }
  return { id, kind: 'halo-gas-profiles', params, note: meta.note, nHalos: meta.nHalos, loading: false };
}

async function loadColorMassDiagramTile(id: string, params: ColorMassDiagramParams): Promise<ColorMassDiagramTileState> {
  const meta = await fetchColorMassDiagramMeta(params);
  if (meta === null) {
    throw new Error(
      'No real photometry data for this suite/set/realization/band combination - real-data ' +
      'only, no synthetic fallback. Try IllustrisTNG, SIMBA, Astrid, or Swift-EAGLE.',
    );
  }
  return { id, kind: 'color-mass-diagram', params, note: meta.note, nGalaxies: meta.nGalaxies, loading: false };
}

async function loadFieldPDFTile(id: string, params: FieldPDFParams): Promise<FieldPDFTileState> {
  const meta = await fetchFieldPDFMeta(params);
  if (meta === null) {
    throw new Error(
      'No real PDF data for this suite/field/grid/redshift combination - real-data only, no ' +
      'synthetic fallback. Try IllustrisTNG or SIMBA.',
    );
  }
  return { id, kind: 'field-pdf', params, note: meta.note, loading: false };
}

async function loadLymanAlphaSpectrumTile(id: string, params: LymanAlphaSpectrumParams): Promise<LymanAlphaSpectrumTileState> {
  const meta = await fetchLymanAlphaSpectrumMeta(params);
  if (meta === null) {
    throw new Error(
      'No real Lyman-alpha data for this suite/set/realization/snapshot - real-data only, no ' +
      'synthetic fallback. Try IllustrisTNG or SIMBA.',
    );
  }
  return { id, kind: 'lyman-alpha-spectrum', params, note: meta.note, loading: false };
}

async function loadGalaxyScalingRelationsTile(id: string, params: GalaxyScalingRelationsParams): Promise<GalaxyScalingRelationsTileState> {
  const meta = await fetchScalingRelationsMeta(params);
  return { id, kind: 'galaxy-scaling-relations', params, note: meta.note, source: meta.source, loading: false };
}

async function loadFieldMap2DTile(id: string, params: FieldMap2DParams): Promise<FieldMap2DTileState> {
  const meta = await fetchFieldMap2DMeta(params);
  return { id, kind: 'field-map-2d', params, note: meta.note, source: meta.source, loading: false };
}

async function loadDensityField3DTile(id: string, params: DensityField3DParams): Promise<DensityField3DTileState> {
  const result = await fetchDensityField3D(params);
  const voids = params.showVoids ? await fetchVoidCatalog(params) : null;
  return {
    id, kind: 'density-field-3d', params,
    density: result.density, boxSize: result.box_size, note: result.note, source: result.source,
    voids, loading: false,
  };
}

async function loadParticleCloud3DTile(id: string, params: ParticleCloud3DParams): Promise<ParticleCloud3DTileState> {
  const result = await fetchParticleCloud(params);
  return {
    id, kind: 'particle-cloud-3d', params,
    positions: result.positions, note: result.note, source: result.source, loading: false,
  };
}

export function App() {
  const [activePanel, setActivePanel] = useState<IconRailPanel>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [tiles, setTiles] = useState<CanvasTile[]>([]);
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
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, params, loading: true } : t)),
    );
    loadMassRangeTile(id, statistic, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'mass-range' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchPowerSpectrumTile = (id: string, params: PowerSpectrumParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'power-spectrum' ? { ...t, params, loading: true } : t)),
    );
    loadPowerSpectrumTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'power-spectrum' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchBispectrumTile = (id: string, params: BispectrumParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'bispectrum' ? { ...t, params, loading: true } : t)),
    );
    loadBispectrumTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'bispectrum' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchSFRHistoryTile = (id: string, params: SFRHistoryParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'sfr-history' ? { ...t, params, loading: true } : t)),
    );
    loadSFRHistoryTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'sfr-history' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchXrayHaloProfilesTile = (id: string, params: XrayHaloProfilesParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'xray-halo-profiles' ? { ...t, params, loading: true } : t)),
    );
    loadXrayHaloProfilesTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'xray-halo-profiles' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchHaloGasProfilesTile = (id: string, params: HaloGasProfilesParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'halo-gas-profiles' ? { ...t, params, loading: true } : t)),
    );
    loadHaloGasProfilesTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'halo-gas-profiles' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchColorMassDiagramTile = (id: string, params: ColorMassDiagramParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'color-mass-diagram' ? { ...t, params, loading: true } : t)),
    );
    loadColorMassDiagramTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'color-mass-diagram' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchFieldPDFTile = (id: string, params: FieldPDFParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'field-pdf' ? { ...t, params, loading: true } : t)),
    );
    loadFieldPDFTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'field-pdf' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchLymanAlphaSpectrumTile = (id: string, params: LymanAlphaSpectrumParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'lyman-alpha-spectrum' ? { ...t, params, loading: true } : t)),
    );
    loadLymanAlphaSpectrumTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'lyman-alpha-spectrum' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchGalaxyScalingRelationsTile = (id: string, params: GalaxyScalingRelationsParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'galaxy-scaling-relations' ? { ...t, params, loading: true } : t)),
    );
    loadGalaxyScalingRelationsTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'galaxy-scaling-relations' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchFieldMap2DTile = (id: string, params: FieldMap2DParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'field-map-2d' ? { ...t, params, loading: true } : t)),
    );
    loadFieldMap2DTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'field-map-2d' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchDensityField3DTile = (id: string, params: DensityField3DParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'density-field-3d' ? { ...t, params, loading: true } : t)),
    );
    loadDensityField3DTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'density-field-3d' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const refetchParticleCloud3DTile = (id: string, params: ParticleCloud3DParams) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id && t.kind === 'particle-cloud-3d' ? { ...t, params, loading: true } : t)),
    );
    loadParticleCloud3DTile(id, params)
      .then((updated) => setTiles((prev) => prev.map((t) => (t.id === id ? updated : t))))
      .catch((err) =>
        setTiles((prev) =>
          prev.map((t) => (t.id === id && t.kind === 'particle-cloud-3d' ? { ...t, loading: false, error: String(err) } : t)),
        ),
      );
  };

  const handleSubmit = (selection: CuratedSelection) => {
    setIsModalOpen(false);
    const id = pendingTileId ?? `tile-${tiles.length + 1}`;

    if (isMassRangeStatistic(selection.statistic)) {
      const statistic = selection.statistic;
      const config = MASS_RANGE_CONFIGS[statistic];
      const params: MassRangeParams = {
        suite: selection.suite, setName: selection.set, compareMode: false,
        realizations: [selection.realization],
        min: config.defaultMin, max: config.defaultMax, bins: config.defaultBins,
      };
      const placeholder: PlotTileState = {
        id, kind: 'mass-range', statistic, params,
        series: [], xLabel: '', yLabel: '', logX: true, logY: config.logY,
        haloRows: [], haloRawRows: null, loading: true,
      };
      replaceTile(placeholder);
      focusTile(id);
      refetchMassRangeTile(id, statistic, params);
      return;
    }

    if (selection.statistic === 'Power Spectrum') {
      const params: PowerSpectrumParams = {
        suite: selection.suite, setName: selection.set, compareMode: false,
        realizations: [selection.realization],
        grid: 512, MAS: 'CIC', threads: 1, ptypeLabel: 'DM [1]',
        kRange: 'standard', rsdLabel: 'Real space (none)', multipole: 'P0', showLinearPk: false,
      };
      const placeholder: PowerSpectrumTileState = {
        id, kind: 'power-spectrum', params,
        series: [], xLabel: '', yLabel: '', logX: true, logY: true, loading: true,
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
      };
      const placeholder: BispectrumTileState = {
        id, kind: 'bispectrum', params,
        series: [], xLabel: '', yLabel: '', logX: true, logY: true, loading: true,
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
        series: [], xLabel: '', yLabel: '', logX: false, logY: true, loading: true,
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

    // Real, honest gap (see PlotTile.mdx's Usecase): every other statistic
    // still adds a title-only empty tile, rather than fabricate a chart.
    replaceTile({ id, kind: 'empty', title: selection.statistic });
  };

  const removeTile = (id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
    setFocusedTileId((current) => (current === id ? null : current));
  };

  const focusedTile = tiles.find((t) => t.id === focusedTileId);

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
      <div className="app-shell__main">
        <TopNav
          folderName="Untitled"
          projectName="Project 1"
          onAddPlot={() => openAddPlotModal(null)}
          // Real evidence (Figma node 1113:1583's header, and 1012:1124's
          // merged header/toolbar): the toolbar isn't present at all in the
          // zero-plots skeleton, and lives in the SAME row as the
          // breadcrumbs/Add Plot button, not a separate row beneath it.
          toolbar={tiles.length > 0 ? <Toolbar viewMode={viewMode} onViewModeChange={setViewMode} /> : undefined}
        />
        <div className="app-shell__canvas">
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
                      title={tile.statistic}
                      chart={{
                        series: tile.series,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: massRangeImageUrl(config, {
                          suite: tile.params.suite,
                          setName: tile.params.setName,
                          realizations: tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]],
                          snapnum: DEFAULT_SNAPNUM,
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
                      halos={{
                        rows: tile.haloRows,
                        rawRows: tile.haloRawRows,
                        // Halo Mass Function/Baryon Fraction are binned by
                        // FoF group mass, which has no column in this
                        // per-subhalo table - see UnderlyingHalos.mdx.
                        massContextNote:
                          tile.statistic !== 'Stellar Mass Function'
                            ? `${tile.statistic} bins by each halo's total FoF group mass, a different (and coarser) quantity than any column shown below - this table is the same real per-subhalo Subfind catalog Stellar Mass Function uses, not a halo-level one.`
                            : undefined,
                      }}
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'power-spectrum') {
                  const ptype = PTYPE_OPTIONS[tile.params.ptypeLabel];
                  const realizations = tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]];
                  return (
                    <PlotTile
                      key={tile.id}
                      title="Power Spectrum"
                      chart={{
                        series: tile.series,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: powerSpectrumImageUrl({
                          suite: tile.params.suite, setName: tile.params.setName, realizations,
                          snapnum: DEFAULT_SNAPNUM, grid: tile.params.grid, MAS: tile.params.MAS,
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'bispectrum') {
                  const realizations = tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]];
                  return (
                    <PlotTile
                      key={tile.id}
                      title="Bispectrum"
                      chart={{
                        series: tile.series,
                        xLabel: tile.xLabel,
                        yLabel: tile.yLabel,
                        logX: tile.logX,
                        logY: tile.logY,
                        imageUrl: bispectrumImageUrl({
                          suite: tile.params.suite, setName: tile.params.setName, realizations,
                          field: tile.params.field, muIndex: tile.params.muIndex,
                        }),
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realizations (compare)', value: tile.params.realizations.join(', ') },
                        { label: 'Field', value: tile.params.field },
                        { label: 'Triangle shape (mu)', value: String(tile.params.muIndex) },
                      ]}
                      halos={null}
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'sfr-history') {
                  const realizations = tile.params.compareMode ? tile.params.realizations : [tile.params.realizations[0]];
                  return (
                    <PlotTile
                      key={tile.id}
                      title="SFR History"
                      chart={{
                        series: tile.series,
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'xray-halo-profiles') {
                  return (
                    <PlotTile
                      key={tile.id}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'halo-gas-profiles') {
                  return (
                    <PlotTile
                      key={tile.id}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'color-mass-diagram') {
                  return (
                    <PlotTile
                      key={tile.id}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'field-pdf') {
                  return (
                    <PlotTile
                      key={tile.id}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'lyman-alpha-spectrum') {
                  return (
                    <PlotTile
                      key={tile.id}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'galaxy-scaling-relations') {
                  return (
                    <PlotTile
                      key={tile.id}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'field-map-2d') {
                  return (
                    <PlotTile
                      key={tile.id}
                      title="2D Field Map"
                      chart={{
                        kind: 'static-image',
                        imageUrl: fieldMap2DImageUrl(tile.params),
                        alt: `${tile.params.field} 2D column-density-style projection`,
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Field', value: tile.params.field },
                      ]}
                      halos={null}
                      onFocus={() => focusTile(tile.id)}
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
                      onFocus={() => focusTile(tile.id)}
                    />
                  );
                }

                if (tile.kind === 'particle-cloud-3d') {
                  return (
                    <PlotTile
                      key={tile.id}
                      title="3D Particle Cloud"
                      chart={{
                        kind: 'plotly-3d',
                        content: <ParticleCloudChart positions={tile.positions} />,
                      }}
                      readoutGroups={[
                        { label: 'Suite / Set', value: `${tile.params.suite} · ${tile.params.setName}` },
                        { label: 'Realization', value: String(tile.params.realization) },
                        { label: 'Particles', value: tile.positions.length.toLocaleString() },
                      ]}
                      halos={null}
                      onFocus={() => focusTile(tile.id)}
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
        onSubmit={handleSubmit}
      />
    </div>
  );
}
