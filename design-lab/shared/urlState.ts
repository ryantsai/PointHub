// View state lives in the URL hash so the gallery can open every design in the same state and a
// design can be linked to directly:  #/admin?locale=ja&season=winter&scheme=dark
// Dependency-free on purpose; wrap it in a hook inside each design (see SPEC.md).
import type { Locale } from './data';
import type { SeasonKey } from './seasons';

export type View = 'employee' | 'admin';
export type Scheme = 'light' | 'dark';
export type LabState = { view: View; locale: Locale; season: SeasonKey; scheme: Scheme };

const defaults: LabState = { view: 'employee', locale: 'en', season: 'default', scheme: 'light' };

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function readState(): LabState {
  const [path = '', query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  return {
    view: oneOf(path, ['employee', 'admin'] as const, defaults.view),
    locale: oneOf(params.get('locale'), ['en', 'ja', 'zh-Hant'] as const, defaults.locale),
    season: oneOf(params.get('season'), ['default', 'lunarNewYear', 'midAutumn', 'winter'] as const, defaults.season),
    scheme: oneOf(params.get('scheme'), ['light', 'dark'] as const, defaults.scheme),
  };
}

export function writeState(next: Partial<LabState>): void {
  const state = { ...readState(), ...next };
  const params = new URLSearchParams({ locale: state.locale, season: state.season, scheme: state.scheme });
  window.location.hash = `/${state.view}?${params}`;
}

/** Calls `listener` whenever the hash changes (including changes made by the gallery). Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
