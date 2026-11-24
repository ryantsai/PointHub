/** Only same-site paths are allowed as a post-login destination (no open redirects). */
export function safeReturnUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (raw.startsWith('/login')) return '/';
  return raw;
}

export function loginPath(returnUrl: string): string {
  const safe = safeReturnUrl(returnUrl);
  return safe === '/' ? '/login' : `/login?returnUrl=${encodeURIComponent(safe)}`;
}
