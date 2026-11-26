/**
 * The folder the app is served from, without a trailing slash: `''` at the site root, `'/PointHub'` when it runs
 * in an application folder such as https://intranet.example.com/PointHub/. It comes from the page's
 * `<base href>`, which the API fills in when it serves index.html (Vite leaves it at "/" in development).
 */
export const basePath = new URL(document.baseURI).pathname.replace(/\/+$/, '');

/** A site-relative path (`/api/...`, `/uploads/...`) as a URL the browser can use from inside the app's folder. */
export function appUrl(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? basePath + path : path;
}
