import { useState } from 'react';
import '../PlotChart/PlotChart.css';

export type StaticImageChartProps = {
  /** Real, server-rendered matplotlib PNG URL. */
  imageUrl: string;
  alt: string;
};

/** The static-image half of `PlotChart`, without the Static/Interactive
 * toggle - for statistics `app.py` renders exclusively via `st.pyplot()`,
 * with no Plotly equivalent at all (Galaxy Scaling Relations' 2x2 panel,
 * 2D Field Map's heatmap, X-ray Halo Profiles/Halo Gas Profiles' colored-
 * by-mass multi-line + colorbar, Color-Mass Diagram's scatter, Field
 * PDF's band+fill, Lyman-alpha's dual-panel). Building a full Plotly
 * equivalent for each of these shapes (a continuous-colormap multi-line
 * chart, a 2x2 grid, a heatmap, ...) would mean re-implementing six
 * different chart types Plotly doesn't have a drop-in match for, for a
 * toggle `app.py` itself never offers on any of them - so this shows the
 * real render only, with the same real image-load error handling
 * `PlotChart`'s own static mode has. Reuses `PlotChart.css`'s
 * `.plot-chart`/`.plot-chart__image`/`.plot-chart__error` classes rather
 * than duplicating the same card/error styling a third time. */
export function StaticImageChart({ imageUrl, alt }: StaticImageChartProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="plot-chart">
      {imageError ? (
        <p className="plot-chart__error">
          Couldn't load the chart image — is the API server running?
          <br />
          <code>uvicorn api.main:app --port 8010</code>
        </p>
      ) : (
        <img
          className="plot-chart__image"
          src={imageUrl}
          alt={alt}
          onLoad={() => setImageError(false)}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
}
