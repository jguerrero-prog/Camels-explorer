import { useMemo } from 'react';
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
};

const LINE_COLORS = ['#7B2D8E', '#E8A030', '#3D8BE8', '#E63946'];

export function PlotChart({ series, xLabel, yLabel, logX = true, logY = true }: PlotChartProps) {
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

  return (
    <div className="plot-chart">
      <Plot
        data={data}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </div>
  );
}
