/**
 * Register the image-caching service worker once on app boot.
 * Silently no-ops in browsers without service workers.
 *
 * The SW intercepts ordinary image fetches and caches the responses,
 * which means a brief Wi-Fi blip after a customer has already scrolled
 * past a product still lets them tap it without a broken image. We
 * removed the eager precacheImages() flow that postMessage'd a full
 * URL list to the SW on every menu_updated push — on a tablet running
 * for hours that was a chunk of background fetching the SW does just
 * as well lazily, and the postMessage churn was a candidate for the
 * "stuck taps after a while" investigation.
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
