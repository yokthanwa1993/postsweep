export function isFacebookURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['www.facebook.com', 'web.facebook.com', 'facebook.com'].includes(url.hostname);
  } catch { return false; }
}
