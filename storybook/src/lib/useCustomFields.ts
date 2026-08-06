import { useEffect, useState } from 'react';
import { fetchCustomFields, fetchCustomFieldTree, fetchCustomCount } from './api';
import type { CustomField, CustomFieldTreeNode, CustomFilters } from './api';

/** Shared `GET /api/custom/fields` fetch - both CustomTab (creation) and
 * CustomSidebar (post-creation edit) need the identical real field list
 * (241 fields, live min/max/avg stats), and duplicating the fetch/loading/
 * error dance in each would drift the moment one changed - see
 * useCatalogMetadata's own identical reasoning for GET /api/metadata. */
export function useCustomFields(): { fields: CustomField[] | null; error: boolean } {
  const [fields, setFields] = useState<CustomField[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCustomFields()
      .then((data) => !cancelled && setFields(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { fields, error };
}

/** Shared `GET /api/custom/field-tree` fetch - the real, nested schema
 * that powers CustomFilterTree (the modal's and sidebar's browsable
 * Filters tree), fetched independently from `useCustomFields` (the flat
 * list powering X/Y/Color axis pickers) since they're genuinely different
 * shapes of the same underlying fields, not derivable from one another
 * client-side without re-inventing the live grouping. */
export function useCustomFieldTree(): { tree: CustomFieldTreeNode[] | null; error: boolean } {
  const [tree, setTree] = useState<CustomFieldTreeNode[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCustomFieldTree()
      .then((data) => !cancelled && setTree(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { tree, error };
}

// FlatHUB counts over the ~2.9B-row ensemble are slow enough that an older
// in-flight response can land after a newer one (e.g. rapidly toggling
// suite then set) - real bug caught directly, not hypothetical. A debounce
// alone (matching Slider's own COMMIT_DEBOUNCE_MS) isn't enough once two
// requests are both in flight; a monotonic sequence number discards any
// response that isn't for the *latest* filters, the same pattern App.tsx's
// own requestSeqRef uses for tile refetches.
const COUNT_DEBOUNCE_MS = 400;

export type CustomCountStatus = 'idle' | 'loading' | 'error';

/** Live row-count preview for the current filters - "Filtered to N out of
 * 2,927,443,277 total rows", matching FlatHUB's own UI. Keyed off
 * `JSON.stringify(filters)` rather than `filters` itself since a fresh
 * object is built on every render (see buildCustomFilters) - comparing by
 * value, not reference, is required for the effect to only actually
 * re-fetch when the real filter content changes. */
export function useCustomCount(filters: CustomFilters): { count: number | null; status: CustomCountStatus } {
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<CustomCountStatus>('idle');
  const key = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const timeout = setTimeout(() => {
      fetchCustomCount(JSON.parse(key))
        .then((n) => {
          if (cancelled) return;
          setCount(n);
          setStatus('idle');
        })
        .catch(() => {
          if (cancelled) return;
          setStatus('error');
        });
    }, COUNT_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { count, status };
}
