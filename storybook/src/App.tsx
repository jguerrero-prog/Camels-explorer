import { useState } from 'react';
import { IconRail } from './components/IconRail/IconRail';
import type { IconRailPanel } from './components/IconRail/IconRail';
import { TopNav } from './components/TopNav/TopNav';
import { Toolbar } from './components/Toolbar/Toolbar';
import type { ViewMode } from './components/Toolbar/Toolbar';
import { Viewer } from './components/Viewer/Viewer';
import { Tile } from './components/Tile/Tile';
import { CanvasStatsRow } from './components/CanvasStatsRow/CanvasStatsRow';
import { AddPlotModal } from './components/AddPlotModal/AddPlotModal';
import type { CuratedSelection } from './components/AddPlotModal/CuratedTab';
import './App.css';

type CanvasTile = { id: string; title: string };

/** Real product facts, not filler — see CanvasStatsRow.mdx. */
const CANVAS_STATS = [
  { value: '1,000', label: 'LH Realizations' },
  { value: '4', label: 'suites' },
  { value: '15', label: 'Statistics' },
  { value: '5', label: 'Halo finders' },
];

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

  const openAddPlotModal = (tileId: string | null) => {
    setPendingTileId(tileId);
    setIsModalOpen(true);
  };

  const handleSubmit = (selection: CuratedSelection) => {
    if (pendingTileId) {
      setTiles((prev) => prev.map((t) => (t.id === pendingTileId ? { ...t, title: selection.statistic } : t)));
    } else {
      setTiles((prev) => [...prev, { id: `tile-${prev.length + 1}`, title: selection.statistic }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="app-shell">
      <IconRail activePanel={activePanel} onSelectPanel={setActivePanel} />
      {activePanel && (
        <div className="app-shell__side-panel">
          {/* Project/Files panel content isn't designed yet — see
              STUDIO_PLAN.md's "Left icon rail" section. */}
          {activePanel === 'project' ? 'Project panel — not yet designed.' : 'Files panel — not yet designed.'}
        </div>
      )}
      <div className="app-shell__main">
        <TopNav folderName="Untitled" projectName="Project 1" onAddPlot={() => openAddPlotModal(null)} />
        {/* Real evidence (Figma node 1113:1583's header): the toolbar isn't
            present at all in the zero-plots skeleton — it only shows once a
            plot exists on the canvas. */}
        {tiles.length > 0 && (
          <div className="app-shell__toolbar-row">
            <Toolbar viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        )}
        <div className="app-shell__canvas">
          <Viewer mode={viewMode}>
            {tiles.length === 0 ? (
              // Real nesting (Figma node 1113:1609 "stats-row" is the last
              // child inside Panel 1's own card, not a separate row above
              // it) — see Tile.mdx / CanvasStatsRow.mdx.
              // The starter tile isn't a real entry in `tiles` yet (it's
              // just the visual placeholder for "nothing exists"), so its
              // click adds a new tile too, same as TopNav's button.
              <Tile
                title="Panel 1"
                onAddPlot={() => openAddPlotModal(null)}
                footer={<CanvasStatsRow stats={CANVAS_STATS} />}
              />
            ) : (
              tiles.map((tile) => (
                <Tile key={tile.id} title={tile.title} onAddPlot={() => openAddPlotModal(tile.id)} />
              ))
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
