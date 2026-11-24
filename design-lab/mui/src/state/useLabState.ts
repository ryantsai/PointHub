// URL-hash state (view / locale / season / scheme) as an external store.
// One module-level `hashchange` subscription feeds every `useLabState()` caller, the snapshot is
// cached (so `useSyncExternalStore` never loops), and season / scheme changes are committed inside
// a view transition so the new colours sweep in instead of flashing – also when the gallery
// changes the hash from outside.
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { readState, subscribe, writeState } from '@shared/urlState';
import type { LabState } from '@shared/urlState';

const listeners = new Set<() => void>();
let snapshot: LabState = readState();
let detach: (() => void) | null = null;

const emit = () => {
  snapshot = readState();
  listeners.forEach((listener) => listener());
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function onHashChange() {
  const next = readState();
  const repaint = next.season !== snapshot.season || next.scheme !== snapshot.scheme;
  const unchanged = !repaint && next.view === snapshot.view && next.locale === snapshot.locale;
  if (unchanged) return;
  if (repaint && typeof document.startViewTransition === 'function' && document.visibilityState === 'visible') {
    const transition = document.startViewTransition(() => {
      flushSync(emit);
    });
    // A skipped transition (hidden tab, a newer transition) rejects; the state is applied anyway.
    transition.ready.catch(() => undefined);
    transition.finished.catch(() => undefined);
  } else if (repaint && !reducedMotion()) {
    // No View Transitions API: let every colour ease to its new value instead.
    const root = document.documentElement;
    root.classList.add('ph-theming');
    window.clearTimeout(themingTimer);
    themingTimer = window.setTimeout(() => root.classList.remove('ph-theming'), 520);
    emit();
  } else {
    emit();
  }
}

let themingTimer = 0;

function subscribeStore(listener: () => void) {
  listeners.add(listener);
  if (!detach) detach = subscribe(onHashChange);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
    }
  };
}

const getSnapshot = () => snapshot;

export function useLabState(): LabState {
  return useSyncExternalStore(subscribeStore, getSnapshot);
}

/** Write to the hash; `origin` is where the colour flood of a season / scheme change starts. */
export function setLabState(next: Partial<LabState>, origin?: { clientX: number; clientY: number }) {
  const root = document.documentElement.style;
  if (origin && (origin.clientX || origin.clientY)) {
    root.setProperty('--ph-vt-x', `${Math.round(origin.clientX)}px`);
    root.setProperty('--ph-vt-y', `${Math.round(origin.clientY)}px`);
  } else {
    root.removeProperty('--ph-vt-x');
    root.removeProperty('--ph-vt-y');
  }
  writeState(next);
}
