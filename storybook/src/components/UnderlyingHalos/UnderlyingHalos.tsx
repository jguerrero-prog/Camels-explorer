import { useMemo, useState } from 'react';
import { Slider } from '../Slider/Slider';
import chevronIcon from './assets/chevron.svg';
import './UnderlyingHalos.css';

export type HaloRow = {
  subfindId: number;
  stellarMass: number;
  gasMass: number;
  dmMass: number;
  bhMass: number;
  sfr: number;
  vmax: number;
};

export type UnderlyingHalosProps = {
  rows: HaloRow[];
  defaultExpanded?: boolean;
};

const VISIBLE_ROWS = 5;

function formatMass(value: number) {
  return value.toExponential(2);
}

export function UnderlyingHalos({ rows, defaultExpanded = false }: UnderlyingHalosProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const maxStellarMass = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.stellarMass), 0),
    [rows],
  );
  const [minStellarMass, setMinStellarMass] = useState(0);

  const filtered = useMemo(
    () => rows.filter((row) => row.stellarMass >= minStellarMass),
    [rows, minStellarMass],
  );

  function downloadCsv() {
    const header = ['SubfindID', 'Stellar Mass [Msun/h]', 'Gas Mass [Msun/h]', 'DM Mass [Msun/h]', 'BH Mass [Msun/h]', 'SFR [Msun/yr]', 'Vmax [km/s]'];
    const lines = [header.join(',')];
    for (const row of filtered) {
      lines.push([row.subfindId, row.stellarMass, row.gasMass, row.dmMass, row.bhMass, row.sfr, row.vmax].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'halos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const visibleRows = filtered.slice(0, VISIBLE_ROWS);
  const remaining = filtered.length - visibleRows.length;

  return (
    <div className="underlying-halos">
      <button
        type="button"
        className="underlying-halos__header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <img
          className="underlying-halos__chevron"
          src={chevronIcon}
          alt=""
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="underlying-halos__label">View underlying halos</span>
        <span className="underlying-halos__count">{filtered.length.toLocaleString()} halos</span>
      </button>

      {expanded && (
        <div className="underlying-halos__reveal">
          <div className="underlying-halos__controls">
            <Slider
              label="Minimum stellar mass"
              min={0}
              max={maxStellarMass}
              value={minStellarMass}
              onChange={setMinStellarMass}
              formatValue={formatMass}
            />
            <button type="button" className="underlying-halos__add-finder" disabled>
              + Add a halo finder
            </button>
          </div>

          <div className="underlying-halos__table-wrap">
            <table className="underlying-halos__table">
              <thead>
                <tr>
                  <th>Subfind ID</th>
                  <th>Stellar Mass</th>
                  <th>Gas Mass</th>
                  <th>DM Mass</th>
                  <th>BH Mass</th>
                  <th>SFR</th>
                  <th>Vmax</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.subfindId}>
                    <td>{row.subfindId}</td>
                    <td>{formatMass(row.stellarMass)}</td>
                    <td>{formatMass(row.gasMass)}</td>
                    <td>{formatMass(row.dmMass)}</td>
                    <td>{formatMass(row.bhMass)}</td>
                    <td>{row.sfr.toFixed(2)}</td>
                    <td>{row.vmax.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="underlying-halos__footer">
            <span className="underlying-halos__remaining">
              {remaining > 0 ? `and ${remaining.toLocaleString()} more halos…` : ''}
            </span>
            <button type="button" className="underlying-halos__download" onClick={downloadCsv}>
              Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
