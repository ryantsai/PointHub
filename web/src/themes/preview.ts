import { isThemeKey } from './registry';

const STORAGE_KEY = 'pointhub.themePreview';

/**
 * Local theme preview: open any page with `?theme=<key>` to see a theme without changing the site setting.
 * The choice sticks for the browser tab (sessionStorage) so it survives navigation; `?theme=off` clears it.
 */
function readPreviewKey(): string | null {
  try {
    const param = new URLSearchParams(window.location.search).get('theme');
    if (param !== null) {
      if (isThemeKey(param)) sessionStorage.setItem(STORAGE_KEY, param);
      else sessionStorage.removeItem(STORAGE_KEY);
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isThemeKey(stored) ? stored : null;
  } catch {
    return null; // storage blocked
  }
}

/** Resolved once at page load; changing it requires a reload (see `exitThemePreview`). */
export const previewThemeKey = readPreviewKey();

export function exitThemePreview() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: nothing was stored
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('theme');
  window.location.replace(url);
}
