// What a scanned QR code may do: open a PointHub check-in page, and nothing else.

/** Check-in tokens are base64url (docs/api.md: `/c/{token}`); the rotating code `k` travels as a query value. */
const CHECK_IN_PATH = /^\/c\/([A-Za-z0-9_-]{1,128})$/;
const MAX_CODE_LENGTH = 256;

function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Turns the text of a scanned QR code into an in-app path (`/c/{token}` or `/c/{token}?k={code}`), or `null`
 * when it is anything other than a check-in link of this site. Only http(s) links on this page's origin or on
 * the configured `publicBaseUrl` are accepted, and only the token and `k` are carried over: the result is
 * always a path of this app, never the scanned URL itself.
 */
export function parseCheckInLink(raw: string, publicBaseUrl: string | null | undefined, currentOrigin: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username !== '' || url.password !== '') return null;
  const allowed = [currentOrigin, originOf(publicBaseUrl)].filter((origin): origin is string => origin !== null && origin !== 'null');
  if (!allowed.includes(url.origin)) return null;
  const token = CHECK_IN_PATH.exec(url.pathname)?.[1];
  if (!token) return null;
  const code = url.searchParams.get('k');
  if (code !== null && code.length > MAX_CODE_LENGTH) return null;
  return code ? `/c/${token}?k=${encodeURIComponent(code)}` : `/c/${token}`;
}
