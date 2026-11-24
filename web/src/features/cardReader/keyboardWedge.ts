import type { CardReadHandler } from './types';

/** Mark an <input> with this attribute to let reader bursts through while it has focus. */
export const SCAN_FIELD_ATTRIBUTE = 'data-card-scan';

const MAX_KEY_GAP_MS = 50; // readers type a UID in a few ms per key; people do not
const MIN_UID_LENGTH = 8; // 4-byte UID as hex; also fits 10-digit decimal output
const UID_CHARACTER = /^[0-9a-fA-F]$/;

function isOtherTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.hasAttribute(SCAN_FIELD_ATTRIBUTE)) return false;
  return target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/**
 * Keyboard-wedge (USB HID) readers "type" the card UID followed by Enter.
 * This listens globally for a fast burst of hex/decimal characters terminated by Enter and reports it as a card read.
 * Slow (human) typing never forms a burst, so normal keyboard use is unaffected.
 * Returns the unsubscribe function.
 */
export function listenForKeyboardWedge(onRead: CardReadHandler): () => void {
  let buffer = '';
  let lastKeyAt = 0;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'Shift') return; // some readers hold Shift for upper-case hex
    if (isOtherTextField(event.target)) {
      buffer = '';
      return;
    }

    const now = performance.now();
    if (now - lastKeyAt > MAX_KEY_GAP_MS) buffer = '';
    lastKeyAt = now;

    if (event.key === 'Enter') {
      if (buffer.length >= MIN_UID_LENGTH) {
        // Swallow the Enter so it does not also submit a form or click the focused button.
        event.preventDefault();
        event.stopPropagation();
        onRead({ uid: buffer, source: 'keyboard' });
      }
      buffer = '';
    } else if (UID_CHARACTER.test(event.key)) {
      buffer += event.key;
    } else {
      buffer = '';
    }
  };

  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
}
