import type { CardReadHandler } from './types';

/**
 * Third card source: the local PC/SC bridge (`tools/PointHub.CardBridge`).
 *
 * Browsers cannot reach PC/SC readers such as the ACR122U, so a small program on the station PC reads the card
 * and pushes each tap to this page over a loopback WebSocket. Protocol: docs/api.md, "Card bridge".
 * Messages only flow bridge → page; this side never sends anything.
 */
export const CARD_BRIDGE_URL: string = import.meta.env.VITE_CARD_BRIDGE_URL ?? 'ws://127.0.0.1:47615/';

export type BridgeState =
  /** Not trying: no card-reading screen is open. */
  | 'off'
  /** First connection attempt in progress. */
  | 'connecting'
  /** Handshake done; `readers` lists the plugged-in readers. */
  | 'connected'
  /** The bridge is not running (or refused this origin). Retrying in the background. */
  | 'unavailable';

export interface BridgeStatus {
  state: BridgeState;
  /** Names of the PC/SC readers the bridge sees. Empty unless connected. */
  readers: string[];
  /** Last problem the bridge reported (e.g. a reader that failed), cleared by the next successful read. */
  error: string | null;
}

export const BRIDGE_OFF: BridgeStatus = { state: 'off', readers: [], error: null };

type BridgeMessage =
  | { type: 'hello'; version: number; readers: string[] }
  | { type: 'readers'; readers: string[] }
  | { type: 'card'; uid: string; reader: string }
  | { type: 'error'; message: string; reader: string | null };

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Accepts only well-formed frames; anything else from the socket is ignored. */
function parseMessage(data: unknown): BridgeMessage | null {
  if (typeof data !== 'string') return null;
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const message = raw as Record<string, unknown>;
  switch (message.type) {
    case 'hello':
    case 'readers':
      return isStringArray(message.readers) ? (message as BridgeMessage) : null;
    case 'card':
      return typeof message.uid === 'string' && message.uid !== '' ? (message as BridgeMessage) : null;
    case 'error':
      return typeof message.message === 'string' ? (message as BridgeMessage) : null;
    default:
      return null;
  }
}

/**
 * Connects to the bridge and keeps reconnecting (1 s, 2 s, 4 s, 8 s, then every 15 s) until the returned
 * function is called. Call it only while a card-reading screen is open.
 */
export function connectCardBridge(onRead: CardReadHandler, onStatus: (status: BridgeStatus) => void): () => void {
  let socket: WebSocket | null = null;
  let retryTimer: number | undefined;
  let failures = 0;
  let stopped = false;
  let status: BridgeStatus = { state: 'connecting', readers: [], error: null };

  const publish = (next: Partial<BridgeStatus>) => {
    status = { ...status, ...next };
    if (!stopped) onStatus(status);
  };

  const scheduleRetry = () => {
    if (stopped) return;
    const delay = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)];
    failures += 1;
    retryTimer = window.setTimeout(open, delay);
  };

  function open() {
    if (stopped) return;
    try {
      socket = new WebSocket(CARD_BRIDGE_URL);
    } catch {
      // Malformed VITE_CARD_BRIDGE_URL: retrying cannot help.
      publish({ state: 'unavailable', readers: [], error: null });
      return;
    }
    const current = socket;

    current.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (!message || current !== socket) return;
      switch (message.type) {
        case 'hello':
          failures = 0;
          publish({ state: 'connected', readers: message.readers, error: null });
          break;
        case 'readers':
          publish({ readers: message.readers });
          break;
        case 'card':
          publish({ error: null });
          onRead({ uid: message.uid, source: 'bridge' });
          break;
        case 'error':
          publish({ error: message.message });
          break;
      }
    };
    // `close` always follows a failed connect or a dropped connection, so it is the one place that retries.
    current.onclose = () => {
      if (current !== socket) return;
      socket = null;
      publish({ state: 'unavailable', readers: [], error: null });
      scheduleRetry();
    };
  }

  onStatus(status);
  open();

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    const current = socket;
    socket = null;
    current?.close();
  };
}
