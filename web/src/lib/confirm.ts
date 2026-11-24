import { useSyncExternalStore, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: ReactNode;
  /** Body of the dialog. */
  children?: ReactNode;
  labels: { confirm: string; cancel: string };
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

// A one-slot store, so any event handler can ask for confirmation without owning dialog state.
// <ConfirmHost /> (mounted once in main.tsx) renders whatever is in the slot.
let current: ConfirmOptions | null = null;
const listeners = new Set<() => void>();

function set(next: ConfirmOptions | null) {
  current = next;
  for (const listener of listeners) listener();
}

/** Replaces `modals.openConfirmModal` from @mantine/modals. */
export function openConfirm(options: ConfirmOptions) {
  set(options);
}

export function closeConfirm() {
  set(null);
}

export function useConfirmRequest(): ConfirmOptions | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
  );
}
