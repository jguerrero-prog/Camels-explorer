import { useEffect, useState } from 'react';
import { SelectField } from '../SelectField/SelectField';
import { TextField } from '../TextField/TextField';

export type CuratedSelection = {
  suite: string;
  set: string;
  realization: string;
  statistic: string;
};

type CatalogSet = { name: string; label: string; realizations: number; description: string };
type Catalog = { suites: string[]; sets: CatalogSet[]; statistics: string[] };

// Dev-only, matches api/main.py's own CORS allowlist comment - revisit
// before any real deployment/packaging (see desktop.py's eventual rewrite).
const API_BASE = 'http://localhost:8010/api';

export type CuratedTabProps = {
  selection: CuratedSelection;
  onChange: (selection: CuratedSelection) => void;
};

/** The real, wired tab - Suite/Set/Realization/Statistic options are
 * fetched live from GET /api/metadata (backed directly by backend.py's own
 * SUITES/SET_REALIZATIONS/STATISTICS constants), not hardcoded here. */
export function CuratedTab({ selection, onChange }: CuratedTabProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/metadata`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Catalog) => {
        if (cancelled) return;
        setCatalog(data);
        // Seed real defaults once, the first time metadata loads.
        onChange({
          suite: selection.suite || data.suites[0],
          set: selection.set || data.sets[0].name,
          realization: selection.realization || '0',
          statistic: selection.statistic || data.statistics[0],
        });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <p className="curated-tab__error">
        Couldn't load catalog metadata — is the API server running?
        <br />
        <code>uvicorn api.main:app --port 8010</code>
      </p>
    );
  }

  if (!catalog) {
    return <p className="curated-tab__loading">Loading real suite/set/statistic data…</p>;
  }

  const activeSet = catalog.sets.find((s) => s.name === selection.set) ?? catalog.sets[0];

  return (
    <>
      <SelectField
        label="Suite"
        value={selection.suite}
        options={catalog.suites}
        onChange={(suite) => onChange({ ...selection, suite })}
      />
      <SelectField
        label="Set"
        value={activeSet.label}
        options={catalog.sets.map((s) => s.label)}
        onChange={(label) => {
          const next = catalog.sets.find((s) => s.label === label)!;
          onChange({ ...selection, set: next.name, realization: '0' });
        }}
        caption={`${activeSet.realizations.toLocaleString()} realizations, ${activeSet.description.split(': ')[1] ?? activeSet.description}`}
      />
      <TextField
        label="Realization"
        type="number"
        value={selection.realization}
        onChange={(realization) => onChange({ ...selection, realization })}
        caption={`0–${activeSet.realizations - 1}`}
      />
      <SelectField
        label="Statistic"
        value={selection.statistic}
        options={catalog.statistics}
        onChange={(statistic) => onChange({ ...selection, statistic })}
      />
    </>
  );
}
