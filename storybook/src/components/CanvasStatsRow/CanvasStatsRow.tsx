import './CanvasStatsRow.css';

export type CanvasStat = { value: string; label: string };

export type CanvasStatsRowProps = {
  /** Real product facts (statistic count, suite count, etc.), not filler -
   * see CanvasStatsRow.mdx Usecase for where these numbers should come from. */
  stats: CanvasStat[];
};

export function CanvasStatsRow({ stats }: CanvasStatsRowProps) {
  return (
    <div className="canvas-stats-row">
      {stats.map((stat) => (
        <span className="canvas-stats-row__chip" key={stat.label}>
          <span className="canvas-stats-row__value">{stat.value}</span>
          <span className="canvas-stats-row__label">{stat.label}</span>
        </span>
      ))}
    </div>
  );
}
