import { useEffect, useState } from 'react';

// Dev-only, matches AddPlotModal/CuratedTab.tsx's own API_BASE.
const API_BASE = 'http://localhost:8010/api';

export type CatalogSet = { name: string; label: string; realizations: number; description: string };
export type Catalog = { suites: string[]; sets: CatalogSet[]; statistics: string[] };

/** Shared `GET /api/metadata` fetch - was duplicated identically inside
 * MassRangeSidebar and about to be duplicated 3 more times for
 * PowerSpectrumSidebar/BispectrumSidebar/SFRHistorySidebar, so extracted
 * once real usage went from 1 to 4. Every per-statistic sidebar's own
 * Suite/Set fields are built from this same real catalog. */
export function useCatalogMetadata(): Catalog | null {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/metadata`)
      .then((res) => res.json())
      .then((data: Catalog) => !cancelled && setCatalog(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
