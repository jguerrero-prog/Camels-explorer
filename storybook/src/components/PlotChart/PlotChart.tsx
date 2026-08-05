import { useMemo, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import './PlotChart.css';

const Plot = createPlotlyComponent(Plotly);

export type PlotSeries = {
  label: string;
  x: number[];
  y: number[];
};

export type PlotChartProps = {
  series: PlotSeries[];
  xLabel: string;
  yLabel: string;
  logX?: boolean;
  logY?: boolean;
  /** URL of a real, server-rendered matplotlib PNG for this exact chart
   * (see PlotChart.mdx). When present, this is the default render and a
   * Static/Interactive toggle appears; when absent, this component always
   * renders the Plotly chart and shows no toggle. */
  imageUrl?: string;
};

const LINE_COLORS = ['#7B2D8E', '#E8A030', '#3D8BE8', '#E63946'];

export function PlotChart({ series, xLabel, yLabel, logX = true, logY = true, imageUrl }: PlotChartProps) {
  const [mode, setMode] = useState<'static' | 'interactive'>(imageUrl ? 'static' : 'interactive');
  const [imageError, setImageError] = useState(false);

  const data = useMemo(
    () =>
      series.map((s, i) => ({
        x: s.x,
        y: s.y,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: s.label,
        line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
      })),
    [series],
  );

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { l: 56, r: 16, t: 16, b: 48 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'var(--font-ui)', size: 12, color: '#1A1A1A' },
      xaxis: { title: { text: xLabel }, type: logX ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
      yaxis: { title: { text: yLabel }, type: logY ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
      showlegend: series.length > 1,
      legend: { orientation: 'h' as const, y: 1.1 },
    }),
    [xLabel, yLabel, logX, logY, series.length],
  );

  const showStatic = imageUrl && mode === 'static';

  return (
    <div className="plot-chart">
      {imageUrl && (
        <div className="plot-chart__toggle">
          <button
            type="button"
            className={`plot-chart__toggle-btn ${mode === 'static' ? 'plot-chart__toggle-btn--active' : ''}`}
            onClick={() => setMode('static')}
          >
            Static
          </button>
          <button
            type="button"
            className={`plot-chart__toggle-btn ${mode === 'interactive' ? 'plot-chart__toggle-btn--active' : ''}`}
            onClick={() => setMode('interactive')}
          >
            Interactive
          </button>
        </div>
      )}

      {showStatic ? (
        imageError ? (
          <p className="plot-chart__error">
            Couldn't load the chart image — is the API server running?
            <br />
            <code>uvicorn api.main:app --port 8010</code>
          </p>
        ) : (
          <img
            className="plot-chart__image"
            src={imageUrl}
            alt={`${yLabel} vs ${xLabel}`}
            onLoad={() => setImageError(false)}
            onError={() => setImageError(true)}
          />
        )
      ) : (
        <Plot
          data={data}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      )}
    </div>
  );
}
