// What a scanned QR code may do: open a PointHub check-in page, and nothing else.

/** Check-in tokens are base64url (docs/api.md: `/c/{token}`); the rotating code `k` travels as a query value. */
const CHECK_IN_PATH = /^\/c\/([A-Za-z0-9_-]{1,128})$/;
const MAX_CODE_LENGTH = 256;

/** Origin and folder (no trailing slash) of an app address such as `https://intranet.example.com/PointHub`. */
function siteOf(url: string | null | undefined): { origin: string; folder: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin === 'null') return null;
    return { origin: parsed.origin, folder: parsed.pathname.replace(/\/+$/, '') };
  } catch {
    return null;
  }
}

/**
 * Turns the text of a scanned QR code into an in-app path (`/c/{token}` or `/c/{token}?k={code}`), or `null`
 * when it is anything other than a check-in link of this site. Only http(s) links on this page's origin or on
 * the configured `publicBaseUrl` are accepted, below the app's folder when it runs in one (`currentBase` is this
 * page's origin plus that folder, e.g. `https://host/PointHub`). Only the token and `k` are carried over: the
 * result is always a path of this app, never the scanned URL itself.
 */
export function parseCheckInLink(raw: string, publicBaseUrl: string | null | undefined, currentBase: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username !== '' || url.password !== '') return null;
  const site = [siteOf(currentBase), siteOf(publicBaseUrl)].find(
    (candidate) => candidate !== null && candidate.origin === url.origin && url.pathname.toLowerCase().startsWith(`${candidate.folder.toLowerCase()}/`),
  );
  if (!site) return null;
  const token = CHECK_IN_PATH.exec(url.pathname.slice(site.folder.length))?.[1];
  if (!token) return null;
  const code = url.searchParams.get('k');
  if (code !== null && code.length > MAX_CODE_LENGTH) return null;
  return code ? `/c/${token}?k=${encodeURIComponent(code)}` : `/c/${token}`;
}
