import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

// List filters live in the page's query string, so a filtered list can be bookmarked, shared and survives a
// refresh. `page` is one of them and goes back to 1 (is dropped) whenever any other filter changes.

export type FilterPatch = Record<string, string | number | null | undefined>;

/** The address bar right now. The router writes it synchronously, before React has rendered the change. */
const liveParams = () => new URLSearchParams(window.location.search);

/** The query string as filter state. `patch({ type: 'reversal' })` sets, `patch({ type: null })` removes. */
export function useUrlFilters() {
  const [urlParams, setParams] = useSearchParams();
  // The router applies a URL change as a transition, a moment after the event that caused it. A controlled
  // select or date field would snap back to its old value in between, so the change is shown at once from
  // here; the overlay stops counting as soon as the router's own value has moved on.
  const [pending, setPending] = useState<{ base: URLSearchParams; next: URLSearchParams } | null>(null);
  const params = pending && pending.base === urlParams ? pending.next : urlParams;

  const latest = useRef({ urlParams, setParams });
  useEffect(() => {
    latest.current = { urlParams, setParams };
  });

  const patch = useCallback((changes: FilterPatch) => {
    // Built on the address bar, not on what this render saw: a search box that fires late, or another filter
    // hook on the same page, must not undo a filter chosen in the meantime.
    const current = liveParams();
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    if (next.toString() === current.toString()) return;
    setPending({ base: latest.current.urlParams, next });
    latest.current.setParams(next, { replace: true });
  }, []);

  return { params, patch };
}

/**
 * A search box bound to a query-string key. `text` follows the keyboard at once; the URL (and with it `q`,
 * what the server is asked for) follows after `delay` ms of quiet. Clearing the box applies immediately.
 */
export function useUrlSearch(key = 'q', delay = 250) {
  const { params, patch } = useUrlFilters();
  const q = (params.get(key) ?? '').trim();
  const [text, setText] = useState(q);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The URL changed from outside (back button, "clear filters", a link): the box follows it.
  const [seen, setSeen] = useState(q);
  if (seen !== q) {
    setSeen(q);
    if (text.trim() !== q) setText(q);
  }

  const onChange = useCallback(
    (value: string) => {
      setText(value);
      window.clearTimeout(timer.current);
      const commit = () => {
        if (value.trim() !== (liveParams().get(key) ?? '').trim()) patch({ [key]: value.trim() });
      };
      if (value.trim() === '') commit();
      else timer.current = window.setTimeout(commit, delay);
    },
    [key, delay, patch],
  );

  return { text, onChange, q };
}

export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function readId(params: URLSearchParams, key: string): number | null {
  const value = params.get(key);
  const id = Number(value);
  return value !== null && Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * A `YYYY-MM-DD` value, or `''`. Only the shape is checked here; whether it is a real day is the server's
 * call (`400 validation_failed`), which the list and the export then show.
 */
export function readDate(params: URLSearchParams, key: string): string {
  const value = params.get(key) ?? '';
  return /^\d{4,6}-\d{2}-\d{2}$/.test(value) ? value : '';
}

/** Matched case-insensitively, like the API does for enum values in a query string. */
export function readEnum<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T | null {
  const value = params.get(key)?.toLowerCase();
  return allowed.find((item) => item.toLowerCase() === value) ?? null;
}
