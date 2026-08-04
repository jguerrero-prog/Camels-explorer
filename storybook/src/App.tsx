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

  // Both "Add Plot" entry points do the same real thing today: add an empty
  // tile to the canvas. There's no statistic-picker component yet, so a
  // tile's own empty-state button can't do anything more specific than the
  // canvas-level action — see Tile.mdx / STUDIO_PLAN.md's next build step.
  //
  // Derives the tile number from the array itself rather than a mutable
  // module-level counter — React 18 StrictMode double-invokes setState
  // updaters to catch exactly this kind of impurity.
  const addTile = () => {
    setTiles((prev) => [...prev, { id: `tile-${prev.length + 1}`, title: `Panel ${prev.length + 1}` }]);
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
        <TopNav folderName="Untitled" projectName="Project 1" onAddPlot={addTile} />
        <div className="app-shell__toolbar-row">
          <Toolbar viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        <div className="app-shell__canvas">
          {tiles.length === 0 && <CanvasStatsRow stats={CANVAS_STATS} />}
          <Viewer mode={viewMode}>
            {tiles.length === 0 ? (
              <Tile title="Panel 1" onAddPlot={addTile} />
            ) : (
              tiles.map((tile) => <Tile key={tile.id} title={tile.title} onAddPlot={addTile} />)
            )}
          </Viewer>
        </div>
      </div>
    </div>
  );
}
