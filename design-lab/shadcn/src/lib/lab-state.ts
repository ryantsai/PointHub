import { useSyncExternalStore } from 'react';
import { readState, subscribe, writeState, type LabState } from '@shared/urlState';

// useSyncExternalStore needs a referentially stable snapshot, so cache it per hash string.
let cachedHash: string | null = null;
let cachedState: LabState | null = null;

function getSnapshot(): LabState {
  const hash = window.location.hash;
  if (cachedState === null || hash !== cachedHash) {
    cachedHash = hash;
    cachedState = readState();
  }
  return cachedState;
}

/** View / locale / season / scheme from the URL hash; reacts to changes made by the gallery too. */
export function useLabState(): LabState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Mirrors the state onto <html> so shadcn's CSS variables (and :lang font stacks) follow it. */
export function applyToDocument(state: LabState): void {
  const root = document.documentElement;
  root.classList.toggle('dark', state.scheme === 'dark');
  root.dataset.season = state.season;
  root.lang = state.locale;
}

export { writeState, readState };
