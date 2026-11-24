// URL-hash state as an external store. The snapshot is cached (stable reference per hash) and, when
// only the look changes (season / scheme), the commit runs inside a View Transition so the whole
// console cross-fades instead of flashing.
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { readState, subscribe as subscribeHash, type LabState } from '@shared/urlState';

let snapshot: LabState = readState();
let snapshotHash = window.location.hash;
const listeners = new Set<() => void>();
let detach: (() => void) | null = null;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function sync(): void {
  if (window.location.hash === snapshotHash) return;
  snapshotHash = window.location.hash;
  const next = readState();
  const prev = snapshot;
  if (next.view === prev.view && next.locale === prev.locale && next.season === prev.season && next.scheme === prev.scheme) return;

  const commit = () => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const lookChanged = next.season !== prev.season || next.scheme !== prev.scheme;
  if (lookChanged && 'startViewTransition' in document && !prefersReducedMotion() && document.visibilityState === 'visible') {
    const transition = document.startViewTransition(() => {
      flushSync(commit);
    });
    // A newer transition (fast clicking, or the gallery driving the hash) skips this one; that is fine.
    transition.ready.catch(() => undefined);
    transition.finished.catch(() => undefined);
  } else {
    commit();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!detach) detach = subscribeHash(sync);
  sync();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
    }
  };
}

const getSnapshot = (): LabState => snapshot;

export function useLabState(): LabState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
