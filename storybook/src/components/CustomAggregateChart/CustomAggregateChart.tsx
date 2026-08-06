import { useMemo, useRef, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import '../PlotChart/PlotChart.css';

const Plot = createPlotlyComponent(Plotly);

const BAR_COLOR = '#7B2D8E'; // matches PlotChart's own LINE_COLORS[0]

export type CustomHistogramData = {
  kind: 'histogram';
  xLabel: string;
  logX: boolean;
  buckets: { x: number; count: number }[];
};

export type CustomHeatmapData = {
  kind: 'heatmap';
  xLabel: string;
  yLabel: string;
  logX: boolean;
  logY: boolean;
  buckets: { x: number; y: number; count: number }[];
};

export type CustomBoxplotData = {
  kind: 'boxplot';
  xLabel: string;
  valueLabel: string;
  logX: boolean;
  buckets: { x: number; min: number; q1: number; median: number; q3: number; max: number; count: number }[];
};

export type CustomAggregateChartProps = {
  data: CustomHistogramData | CustomHeatmapData | CustomBoxplotData;
};

/** Real FlatHUB-backed Histogram/Heatmap/Box Plot rendering (Custom tab's
 * remaining 3 non-scatter chart types) - shares PlotChart's own light-
 * surface styling (transparent paper/plot background, #1A1A1A text,
 * #E5E5E5 gridlines) so these sit visually consistent with Scatterplot's
 * card, rather than reusing Plotly3DChart's dark scene theme (built for a
 * different, volumetric context). All three plot the exact buckets
 * `/custom/histogram` returned - no client-side re-binning. */
export function CustomAggregateChart({ data }: CustomAggregateChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphDivRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (graphDivRef.current) Plotly.Plots.resize(graphDivRef.current);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { plotData, layout } = useMemo(() => {
    if (data.kind === 'histogram') {
      return {
        plotData: [
          {
            type: 'bar' as const,
            x: data.buckets.map((b) => b.x),
            y: data.buckets.map((b) => b.count),
            marker: { color: BAR_COLOR },
          },
        ],
        layout: {
          xaxis: { title: { text: data.xLabel }, type: data.logX ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
          yaxis: { title: { text: 'Count' }, gridcolor: '#E5E5E5' },
        },
      };
    }

    if (data.kind === 'boxplot') {
      return {
        plotData: [
          {
            type: 'box' as const,
            x: data.buckets.map((b) => b.x),
            q1: data.buckets.map((b) => b.q1),
            median: data.buckets.map((b) => b.median),
            q3: data.buckets.map((b) => b.q3),
            lowerfence: data.buckets.map((b) => b.min),
            upperfence: data.buckets.map((b) => b.max),
            boxpoints: false as const,
            marker: { color: BAR_COLOR },
          },
        ],
        layout: {
          xaxis: { title: { text: data.xLabel }, type: data.logX ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
          yaxis: { title: { text: data.valueLabel }, gridcolor: '#E5E5E5' },
        },
      };
    }

    // Heatmap: reshape the flat [{x, y, count}] bucket list FlatHUB
    // returns into Plotly's z-matrix-of-rows shape (one row per unique y,
    // one column per unique x) - the API gives buckets, not a grid.
    const xs = [...new Set(data.buckets.map((b) => b.x))].sort((a, b) => a - b);
    const ys = [...new Set(data.buckets.map((b) => b.y))].sort((a, b) => a - b);
    const countAt = new Map(data.buckets.map((b) => [`${b.x}|${b.y}`, b.count]));
    const z = ys.map((y) => xs.map((x) => countAt.get(`${x}|${y}`) ?? 0));

    return {
      plotData: [
        {
          type: 'heatmap' as const,
          x: xs,
          y: ys,
          z,
          colorscale: 'Viridis' as const,
          colorbar: { title: { text: 'Count' } },
        },
      ],
      layout: {
        xaxis: { title: { text: data.xLabel }, type: data.logX ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
        yaxis: { title: { text: data.yLabel }, type: data.logY ? ('log' as const) : ('linear' as const), gridcolor: '#E5E5E5' },
      },
    };
  }, [data]);

  return (
    <div className="plot-chart" ref={containerRef}>
      <Plot
        data={plotData}
        layout={{
          autosize: true,
          margin: { l: 56, r: data.kind === 'heatmap' ? 70 : 16, t: 16, b: 48 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'var(--font-ui)', size: 12, color: '#1A1A1A' },
          showlegend: false,
          ...layout,
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        onInitialized={(_figure, graphDiv) => {
          graphDivRef.current = graphDiv;
        }}
        onUpdate={(_figure, graphDiv) => {
          graphDivRef.current = graphDiv;
        }}
      />
    </div>
  );
}
