import { useState } from 'react';
import { IconRail } from './components/IconRail/IconRail';
import type { IconRailPanel } from './components/IconRail/IconRail';
import { TopNav } from './components/TopNav/TopNav';
import { Toolbar } from './components/Toolbar/Toolbar';
import type { ViewMode } from './components/Toolbar/Toolbar';
import { Viewer } from './components/Viewer/Viewer';
import { Tile } from './components/Tile/Tile';
import { CanvasStatsRow } from './components/CanvasStatsRow/CanvasStatsRow';
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

  // The ONLY real action that adds a tile to the canvas — this is TopNav's
  // "Add Plot" button. Derives the tile number from the array itself rather
  // than a mutable module-level counter — React 18 StrictMode double-invokes
  // setState updaters to catch exactly this kind of impurity.
  const addTile = () => {
    setTiles((prev) => [...prev, { id: `tile-${prev.length + 1}`, title: `Panel ${prev.length + 1}` }]);
  };

  // A tile's OWN "Add a plot or simulation" click is real estate reserved
  // for opening a per-tile statistic picker (see Tile.mdx's Code sample:
  // `onAddPlot={() => openAddPlotFlow()}`) — that flow isn't built yet, so
  // this is deliberately inert rather than fabricating "spawn another tile"
  // behavior for it. Wiring it to `addTile` was the bug: every existing
  // tile's own click created a new sibling tile instead of doing nothing.
  const openAddPlotFlow = () => {};

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
        <TopNav folderName="Untitled" projectName="Project 1" onAddPlot={addTile} />
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
              <Tile
                title="Panel 1"
                onAddPlot={openAddPlotFlow}
                footer={<CanvasStatsRow stats={CANVAS_STATS} />}
              />
            ) : (
              tiles.map((tile) => <Tile key={tile.id} title={tile.title} onAddPlot={openAddPlotFlow} />)
            )}
          </Viewer>
        </div>
      </div>
    </div>
  );
}
