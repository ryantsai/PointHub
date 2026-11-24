export type CardReadSource = 'keyboard' | 'webNfc' | 'bridge';

/** One card tap. `uid` is the raw string from the reader; the server normalizes and validates it. */
export interface CardRead {
  uid: string;
  source: CardReadSource;
}

export type CardReadHandler = (read: CardRead) => void;
