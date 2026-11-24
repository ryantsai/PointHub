/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket URL of the local PC/SC card bridge. Defaults to ws://127.0.0.1:47615/. */
  readonly VITE_CARD_BRIDGE_URL?: string;
}
