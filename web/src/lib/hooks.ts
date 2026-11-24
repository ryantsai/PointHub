import { useCallback, useEffect, useState } from 'react';

/** Replaces `useDisclosure` from @mantine/hooks. */
export function useDisclosure(initial = false) {
  const [opened, setOpened] = useState(initial);
  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((value) => !value), []);
  return [opened, { open, close, toggle }] as const;
}

/** Replaces `useDebouncedValue` from @mantine/hooks: `[debounced]` follows `value` after `delay` ms of quiet. */
export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return [debounced] as const;
}
