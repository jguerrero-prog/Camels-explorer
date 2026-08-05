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
import { fetchMassRangeResult, fetchHaloCatalog, toHaloRows, massRangeImageUrl } from './lib/api';
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

/** Every other statistic still adds this title-only tile - see
 * PlotTile.mdx's Usecase for which statistics have a real wired chart
 * so far (the three in massRangeConfig.ts). */
type EmptyTileState = { id: string; kind: 'empty'; title: string };

type CanvasTile = PlotTileState | EmptyTileState;

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

  const refetchTile = (id: string, statistic: MassRangeStatistic, params: MassRangeParams) => {
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

  const handleSubmit = (selection: CuratedSelection) => {
    setIsModalOpen(false);
    const id = pendingTileId ?? `tile-${tiles.length + 1}`;

    if (!isMassRangeStatistic(selection.statistic)) {
      // Real, honest gap (see PlotTile.mdx's Usecase): only the three
      // statistics in massRangeConfig.ts have a wired chart so far - every
      // other statistic still adds a title-only tile with no chart, rather
      // than fabricate one.
      const emptyTile: EmptyTileState = { id, kind: 'empty', title: selection.statistic };
      setTiles((prev) => (pendingTileId ? prev.map((t) => (t.id === pendingTileId ? emptyTile : t)) : [...prev, emptyTile]));
      return;
    }

    const statistic = selection.statistic;
    const config = MASS_RANGE_CONFIGS[statistic];
    const params: MassRangeParams = {
      suite: selection.suite,
      setName: selection.set,
      compareMode: false,
      realizations: [selection.realization],
      min: config.defaultMin,
      max: config.defaultMax,
      bins: config.defaultBins,
    };
    const placeholder: PlotTileState = {
      id, kind: 'mass-range', statistic, params,
      series: [], xLabel: '', yLabel: '', logX: true, logY: config.logY, haloRows: [], haloRawRows: null, loading: true,
    };
    setTiles((prev) => (pendingTileId ? prev.map((t) => (t.id === pendingTileId ? placeholder : t)) : [...prev, placeholder]));
    focusTile(id);
    refetchTile(id, statistic, params);
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
          onChange={(params) => refetchTile(focusedTile.id, focusedTile.statistic, params)}
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
              tiles.map((tile) =>
                tile.kind === 'mass-range' ? (
                  <PlotTile
                    key={tile.id}
                    title={tile.statistic}
                    chart={{
                      series: tile.series,
                      xLabel: tile.xLabel,
                      yLabel: tile.yLabel,
                      logX: tile.logX,
                      logY: tile.logY,
                      imageUrl: massRangeImageUrl(MASS_RANGE_CONFIGS[tile.statistic], {
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
                      { label: MASS_RANGE_CONFIGS[tile.statistic].rangeLabel, value: `${tile.params.min.toExponential()} – ${tile.params.max.toExponential()}` },
                      { label: 'Bins', value: String(tile.params.bins) },
                    ]}
                    haloRows={tile.haloRows}
                    haloRawRows={tile.haloRawRows}
                    // Halo Mass Function/Baryon Fraction are binned by
                    // FoF group mass, which has no column in this
                    // per-subhalo table - see UnderlyingHalos.mdx.
                    haloMassContextNote={
                      tile.statistic !== 'Stellar Mass Function'
                        ? `${tile.statistic} bins by each halo's total FoF group mass, a different (and coarser) quantity than any column shown below - this table is the same real per-subhalo Subfind catalog Stellar Mass Function uses, not a halo-level one.`
                        : undefined
                    }
                    onFocus={() => focusTile(tile.id)}
                  />
                ) : (
                  <Tile key={tile.id} title={tile.title} onAddPlot={() => openAddPlotModal(tile.id)} />
                ),
              )
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
