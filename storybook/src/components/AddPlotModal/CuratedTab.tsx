import { useEffect, useState } from 'react';
import { SelectField } from '../SelectField/SelectField';
import { SingleRealizationFields } from '../SingleRealizationFields/SingleRealizationFields';
import type { Catalog } from '../../lib/useCatalogMetadata';

export type CuratedSelection = {
  suite: string;
  set: string;
  realization: number | string;
  statistic: string;
};

// Dev-only, matches api/main.py's own CORS allowlist comment - revisit
// before any real deployment/packaging (see desktop.py's eventual rewrite).
const API_BASE = 'http://localhost:8010/api';

export type CuratedTabProps = {
  selection: CuratedSelection;
  onChange: (selection: CuratedSelection) => void;
};

/** The real, wired tab - Suite/Set/Realization/Statistic options are
 * fetched live from GET /api/metadata (backed directly by backend.py's own
 * SUITES/SET_REALIZATIONS/STATISTICS constants), not hardcoded here.
 *
 * Suite/Set/Realization itself is `SingleRealizationFields` (2026-08-05) -
 * this tab used to hand-roll its own copy of that block against a smaller
 * local `Catalog` type that didn't know about SB's per-suite realization
 * count or 1P's parameter+variation naming, so picking either here (before
 * a tile even existed) produced a realization no real fetch could resolve.
 * Reusing the shared component - which already handles both - fixes that
 * and means a future third special-cased set only needs fixing once. */
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
          realization: selection.realization || 0,
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

  // Real (added 2026-08-07, direct user request) - CAMELS-SAM has no
  // Suite/Set concept at all (backend.py's get_sam_catalog is hardcoded to
  // the LH set), so it's appended client-side rather than through
  // GET /api/metadata's own `statistics` list (which mirrors backend.py's
  // STATISTICS - every other entry there genuinely is suite/set-bound).
  // Selecting it hides SingleRealizationFields entirely - same real
  // "no value editing inside a modal" policy `hideRealizationValueControls`
  // already applies elsewhere, just extended to Suite/Set too since there's
  // nothing suite/set-shaped to select for this statistic.
  const isCamelsSam = selection.statistic === 'CAMELS-SAM';
  // Real (added 2026-08-07, direct user request) - a genuinely new
  // statistic (app.py never had this), also appended client-side since
  // GET /api/metadata has no concept of it either. Unlike CAMELS-SAM, this
  // one IS suite/set-bound - just to exactly one real suite (confirmed via
  // a direct directory listing: SIMBA/Astrid have no blackhole_mergers/
  // folder at all) - so SingleRealizationFields stays shown, just suite-
  // restricted the same way `catalog.statistic_suites` restricts every
  // other statistic there, since this one isn't in that map at all.
  const isBlackholeMergers = selection.statistic === 'Black Hole Mergers';

  return (
    <>
      {!isCamelsSam && (
        <SingleRealizationFields
          catalog={catalog}
          value={{ suite: selection.suite, setName: selection.set, realization: selection.realization }}
          onChange={(v) => onChange({ ...selection, suite: v.suite, set: v.setName, realization: v.realization })}
          allowedSuites={isBlackholeMergers ? ['IllustrisTNG'] : catalog.statistic_suites[selection.statistic]}
          allowedSets={catalog.statistic_sets[selection.statistic]}
          hideRealizationValueControls
        />
      )}
      <SelectField
        label="Statistic"
        value={selection.statistic}
        options={[...catalog.statistics, 'CAMELS-SAM', 'Black Hole Mergers']}
        onChange={(statistic) => onChange({ ...selection, statistic })}
      />
      {isCamelsSam && (
        <p className="curated-tab__loading">
          CAMELS-SAM is a separate dataset (Santa Cruz Semi-Analytic Model), not tied to a suite/set — real for the LH set only. Realization defaults to 0, adjustable in the tile's own sidebar after adding.
        </p>
      )}
      {isBlackholeMergers && (
        <p className="curated-tab__loading">
          Black hole merger events are real, but genuinely undocumented by CAMELS itself and only published for IllustrisTNG.
        </p>
      )}
    </>
  );
}
