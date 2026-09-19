// Resolve redirects against a fixed origin; URL parsing also catches control characters.
export function safeNextPath(value: unknown, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://app.invalid');
    return url.origin === 'https://app.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
