import { useCallback, useEffect, useRef, useState } from 'react';
import { BRIDGE_OFF, connectCardBridge, type BridgeStatus } from './bridge';
import { listenForKeyboardWedge } from './keyboardWedge';
import type { CardRead, CardReadHandler } from './types';
import { isWebNfcSupported, startWebNfc } from './webNfc';

const DUPLICATE_WINDOW_MS = 1500; // a card held on the reader reports the same UID repeatedly

export type NfcState = 'unsupported' | 'idle' | 'scanning' | 'denied';

export interface CardReaderOptions {
  /** Called once per tap with the raw UID string. */
  onRead: CardReadHandler;
  /** Turn the reader off while a modal is closed, the event is not open, etc. Also disconnects the bridge. */
  enabled: boolean;
  /** A tag was presented but the phone could not read its UID (Web NFC only). */
  onUnreadable?: () => void;
}

export interface CardReaderControls {
  nfc: NfcState;
  /** Call from a click handler: the browser asks for NFC permission. */
  startNfc: () => void;
  stopNfc: () => void;
  /** Local PC/SC bridge connection and the readers it sees. `off` while `enabled` is false. */
  bridge: BridgeStatus;
  /** Feed a UID typed by hand through the same de-duplication as reader taps. */
  submit: (uid: string) => void;
}

/** Readers format the same UID differently (04:a2:3b:1c vs 04A23B1C); compare them without the formatting. */
const comparable = (uid: string) => uid.replace(/[^0-9a-z]/gi, '').toUpperCase();

/**
 * One hook for every way a card UID can reach the page:
 *  1. keyboard-wedge USB readers — always on while `enabled`;
 *  2. Web NFC on Android Chrome — opt-in via `startNfc()`;
 *  3. the local PC/SC bridge — connected while `enabled`, reconnects by itself.
 * All three end in the same `onRead`.
 */
export function useCardReader({ onRead, enabled, onUnreadable }: CardReaderOptions): CardReaderControls {
  const [nfc, setNfc] = useState<NfcState>(() => (isWebNfcSupported() ? 'idle' : 'unsupported'));
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(BRIDGE_OFF);
  const stopNfcRef = useRef<(() => void) | null>(null);
  const lastRead = useRef<{ uid: string; at: number }>({ uid: '', at: 0 });
  const handlerRef = useRef({ onRead, enabled, onUnreadable });

  useEffect(() => {
    handlerRef.current = { onRead, enabled, onUnreadable };
  }, [onRead, enabled, onUnreadable]);

  const emit = useCallback((read: CardRead) => {
    const uid = read.uid.trim();
    const key = comparable(uid);
    const now = performance.now();
    const { onRead: handler, enabled: isEnabled } = handlerRef.current;
    if (!isEnabled || key === '') return;
    if (key === lastRead.current.uid && now - lastRead.current.at < DUPLICATE_WINDOW_MS) return;
    lastRead.current = { uid: key, at: now };
    handler({ ...read, uid });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return listenForKeyboardWedge(emit);
  }, [enabled, emit]);

  // The bridge socket is only open while a card-reading screen is enabled.
  useEffect(() => {
    if (!enabled) return;
    return connectCardBridge(emit, setBridgeStatus);
  }, [enabled, emit]);

  const stopNfc = useCallback(() => {
    stopNfcRef.current?.();
    stopNfcRef.current = null;
    setNfc((state) => (state === 'scanning' ? 'idle' : state));
  }, []);

  const startNfc = useCallback(() => {
    if (!isWebNfcSupported() || stopNfcRef.current) return;
    startWebNfc(emit, () => handlerRef.current.onUnreadable?.())
      .then((stop) => {
        stopNfcRef.current = stop;
        setNfc('scanning');
      })
      .catch(() => setNfc('denied'));
  }, [emit]);

  // Release the NFC antenna when the component using the reader goes away.
  useEffect(
    () => () => {
      stopNfcRef.current?.();
      stopNfcRef.current = null;
    },
    [],
  );

  const submit = useCallback((uid: string) => emit({ uid, source: 'keyboard' }), [emit]);

  // A status left over from the last connection must not show once the reader is disabled.
  const bridge = enabled ? bridgeStatus : BRIDGE_OFF;
  return { nfc, startNfc, stopNfc, bridge, submit };
}
