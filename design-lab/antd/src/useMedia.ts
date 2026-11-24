// Synchronous media-query hook (antd's Grid.useBreakpoint starts empty and would flash the phone layout).
import { useCallback, useSyncExternalStore } from 'react';

export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', listener);
      return () => list.removeEventListener('change', listener);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
