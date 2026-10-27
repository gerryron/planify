const LOOPBACK_ALIASES = new Set(['127.0.0.1', '::1', '0.0.0.0', '[::1]']);

export function canonicalizeLocalhostInBrowser() {
  if (typeof window === 'undefined') return false;

  const { location } = window;
  const hostname = location.hostname.toLowerCase();
  if (!LOOPBACK_ALIASES.has(hostname)) {
    return false;
  }

  const canonicalUrl = new URL(location.href);
  canonicalUrl.hostname = 'localhost';
  location.replace(canonicalUrl.toString());
  return true;
}
