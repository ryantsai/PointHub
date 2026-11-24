import { useSyncExternalStore } from 'react';
import { readState, subscribe, writeState, type LabState } from '@shared/urlState';

// useSyncExternalStore needs a referentially stable snapshot, so cache it per hash string.
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

/** View / locale / season / scheme from the URL hash; reacts to changes made by the gallery too. */
export function useLabState(): LabState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export const setLabState = writeState;
