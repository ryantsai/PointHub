// Light / dark. One source of truth for the whole app: the class on <html> that Chakra's `_dark` / `_light`
// conditions read. No stored choice means "follow the operating system".
import { useSyncExternalStore } from 'react';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'pointhub.colorScheme';
/** Written by the Mantine version of the app; still honoured so nobody's choice is lost by the port. */
const OLD_STORAGE_KEY = 'mantine-color-scheme-value';

const isMode = (value: unknown): value is ColorMode => value === 'light' || value === 'dark';

function readStored(): ColorMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
    return isMode(value) ? value : null;
  } catch {
    return null; // storage blocked
  }
}

const system = window.matchMedia('(prefers-color-scheme: dark)');
let stored = readStored();
const listeners = new Set<() => void>();

export function getColorMode(): ColorMode {
  return stored ?? (system.matches ? 'dark' : 'light');
}

function apply() {
  const mode = getColorMode();
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
  root.style.colorScheme = mode;
  for (const listener of listeners) listener();
}

export function setColorMode(mode: ColorMode) {
  stored = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

system.addEventListener('change', apply);
apply();

export function useColorMode() {
  const colorMode = useSyncExternalStore(subscribe, getColorMode);
  return {
    colorMode,
    setColorMode,
    toggleColorMode: () => setColorMode(colorMode === 'dark' ? 'light' : 'dark'),
  };
}
