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
import {
  fetchMassRangeResult, fetchHaloCatalog, toHaloRows, massRangeImageUrl,
  fetchPowerSpectrum, powerSpectrumImageUrl,
  fetchBispectrum, bispectrumImageUrl,
  fetchSFRHistory, sfrHistoryImageUrl,
} from './lib/api';
import type { Result } from './lib/api';
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

/** Every other statistic still adds this title-only tile - see
 * PlotTile.mdx's Usecase for which statistics have a real wired chart
 * so far. */
type EmptyTileState = { id: string; kind: 'empty'; title: string };

type CanvasTile = PlotTileState | PowerSpectrumTileState | BispectrumTileState | SFRHistoryTileState | EmptyTileState;

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
