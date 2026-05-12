import { IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

/**
 * Register the image-caching service worker once on app boot.
 * Silently no-ops in browsers without service workers.
 */
export function registerImageCacheWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Register after load so it doesn't compete with initial render.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration can fail in strict CSP or insecure contexts — that's fine,
      // images just won't be cached by the SW (browser HTTP cache still applies).
    });
  });
}

/**
 * Walk a menu response and return the absolute URLs of every product (and
 * category) image. Used to warm the SW cache as soon as the menu loads.
 */
export function collectMenuImageUrls(menu: any): string[] {
  if (!menu) return [];
  const urls = new Set<string>();
  const add = (raw?: string | number | null, isId = false) => {
    if (raw == null) return;
    if (isId) {
      urls.add(IMAGE_ADDRESS(raw));
      return;
    }
    const s = String(raw);
    if (s.startsWith('/')) urls.add(`${IMAGE_SERVER_ADDRESS}${s}`);
    else if (s.startsWith('http')) urls.add(s);
  };

  for (const p of (menu?.menu?.products || [])) {
    add(p.uri);
    if (p.image) add(p.image, true);
  }
  for (const c of (menu?.menu?.categories || [])) {
    add(c.uri);
    if (c.image) add(c.image, true);
  }
  return Array.from(urls);
}

/**
 * Ask the service worker to pre-cache the given image URLs. Fire-and-forget;
 * if the SW isn't ready yet we wait for it once and then send.
 */
export function precacheImages(urls: string[]) {
  if (!urls.length) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const send = (worker: ServiceWorker | null) => {
    worker?.postMessage({ type: 'PRECACHE_IMAGES', urls });
  };
  if (navigator.serviceWorker.controller) {
    send(navigator.serviceWorker.controller);
    return;
  }
  // SW not yet activated — wait for it once.
  navigator.serviceWorker.ready
    .then(reg => send(reg.active))
    .catch(() => { /* ignore */ });
}
