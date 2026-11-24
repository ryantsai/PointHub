import { useSyncExternalStore } from 'react';
import { type LabState, readState, subscribe } from '@shared/urlState';

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

/** View, locale, season and scheme from the URL hash; re-renders on `hashchange` (ours or the gallery's). */
export function useLabState(): LabState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
