// Mantine colour scheme manager backed by the lab's URL hash instead of localStorage, so the
// gallery (or a pasted link) decides light / dark and Mantine's own `setColorScheme` writes it back.
import type { MantineColorScheme, MantineColorSchemeManager } from '@mantine/core';
import { readState, subscribe, writeState } from '@shared/urlState';

export function urlColorSchemeManager(): MantineColorSchemeManager {
  let stop: (() => void) | undefined;
  return {
    get: () => readState().scheme,
    set: (value: MantineColorScheme) => {
      const scheme = value === 'dark' ? 'dark' : 'light';
      if (readState().scheme !== scheme) writeState({ scheme });
    },
    subscribe: (onUpdate) => {
      stop?.();
      stop = subscribe(() => onUpdate(readState().scheme));
    },
    unsubscribe: () => {
      stop?.();
      stop = undefined;
    },
    clear: () => writeState({ scheme: 'light' }),
  };
}
