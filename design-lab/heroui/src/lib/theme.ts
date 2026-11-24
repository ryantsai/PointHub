import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { LabState } from '@shared/urlState';
import { readState, subscribe } from '@shared/urlState';

// ---- URL state -------------------------------------------------------------------------------
// readState() builds a new object every call, so cache the snapshot by the hash it was read from.
let cachedHash: string | null = null;
let cachedState: LabState;

function getSnapshot(): LabState {
  const hash = window.location.hash;
  if (hash !== cachedHash) {
    cachedHash = hash;
    cachedState = readState();
  }
  return cachedState;
}

/** View / locale / season / scheme from the URL hash; re-renders on `hashchange` (ours or the gallery's). */
export const useLabState = (): LabState => useSyncExternalStore(subscribe, getSnapshot);

// ---- HeroUI theme switching ------------------------------------------------------------------
// HeroUI v3 has no provider: dark mode is the `dark` class + data-theme on <html>, and the season is
// our own data-season attribute that overrides HeroUI's CSS variables (see styles.css).
export function applyTheme(state: Pick<LabState, 'scheme' | 'season' | 'locale'>): void {
  const root = document.documentElement;
  root.classList.toggle('dark', state.scheme === 'dark');
  root.classList.toggle('light', state.scheme === 'light');
  root.dataset.theme = state.scheme;
  root.dataset.season = state.season;
  root.lang = state.locale;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function useDocumentTheme(state: LabState): void {
  const { scheme, season, locale } = state;
  const previousScheme = useRef(scheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const schemeChanged = previousScheme.current !== scheme;
    previousScheme.current = scheme;

    if (!schemeChanged) {
      // Season change: the registered colour properties tween on their own.
      applyTheme({ scheme, season, locale });
      return;
    }

    // Light <-> dark flips every surface at once, so cross-fade the whole page instead.
    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.switching = '';
    const done = () => requestAnimationFrame(() => delete root.dataset.switching);
    if (doc.startViewTransition && !reduce && !document.hidden) {
      const transition = doc.startViewTransition(() => applyTheme({ scheme, season, locale }));
      // a skipped transition (tab hidden mid-way, a newer one started) rejects `ready`; the update still ran
      transition.ready.catch(() => undefined);
      transition.finished.then(done, done);
    } else {
      applyTheme({ scheme, season, locale });
      done();
    }
  }, [scheme, season, locale]);

  // Ambient animation is pointless in a hidden tab: pause it.
  useEffect(() => {
    const sync = () => {
      if (document.hidden) document.documentElement.dataset.paused = '';
      else delete document.documentElement.dataset.paused;
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
}
