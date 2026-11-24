import type { CardReadHandler } from './types';

// Web NFC is not in TypeScript's DOM lib. Only the parts used here are declared.
interface NDEFReadingEvent extends Event {
  /** Tag UID as colon-separated lower-case hex, e.g. "04:a2:3b:1c". Empty when the tag hides it. */
  readonly serialNumber: string;
}
interface NDEFReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
}
declare global {
  interface Window {
    NDEFReader?: new () => NDEFReader;
  }
}

/** Chrome on Android only (HTTPS or localhost). Says nothing about whether the phone has NFC hardware. */
export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.NDEFReader === 'function';
}

/**
 * Starts scanning with the phone's NFC antenna. Must be called from a user gesture (button click),
 * because the browser shows a permission prompt. Resolves with a stop function once scanning is active;
 * rejects when permission is denied or NFC is switched off.
 */
export async function startWebNfc(onRead: CardReadHandler, onError: () => void): Promise<() => void> {
  if (!window.NDEFReader) throw new Error('Web NFC is not supported in this browser');
  const reader = new window.NDEFReader();
  const controller = new AbortController();

  reader.addEventListener(
    'reading',
    (event) => {
      const { serialNumber } = event as NDEFReadingEvent;
      if (serialNumber) onRead({ uid: serialNumber, source: 'webNfc' });
      else onError();
    },
    { signal: controller.signal },
  );
  // Fired for tags the phone cannot parse as NDEF. No UID is exposed in that case.
  reader.addEventListener('readingerror', onError, { signal: controller.signal });

  await reader.scan({ signal: controller.signal });
  return () => controller.abort();
}
