// RistoMenu service worker
// Caches product images so the menu stays usable when the restaurant's
// internet drops out (common in older restaurants with patchy Wi-Fi).
// Bump this when changing cache rules so existing clients re-init.
const CACHE_NAME = 'menu-images-v1';
const MAX_ENTRIES = 300;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop old cache versions
      const names = await caches.keys();
      await Promise.all(
        names.filter(n => n.startsWith('menu-images-') && n !== CACHE_NAME)
             .map(n => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// Match image requests by destination OR file extension. The Django backend
// serves images at /api/v2/image/<id>/ and /media/... — neither always has an
// extension, so we also check the `destination` and Accept header.
function isImageRequest(req) {
  if (req.destination === 'image') return true;
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(new URL(req.url).pathname)) return true;
  const accept = req.headers.get('Accept') || '';
  if (accept.startsWith('image/')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only GETs are cacheable
  if (req.method !== 'GET') return;
  if (!isImageRequest(req)) return;

  event.respondWith(handleImage(req));
});

// Cache-first with background refresh — if we have the image, serve it
// immediately (fast + works offline). Quietly refresh in the background so
// updated images eventually replace the cached copy.
async function handleImage(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  if (cached) {
    // Refresh asynchronously, ignore failures (we're offline or rate-limited).
    fetch(req).then(async (res) => {
      if (res && res.ok) {
        await cache.put(req, res.clone());
        trimCache(cache).catch(() => {});
      }
    }).catch(() => {});
    return cached;
  }

  try {
    const res = await fetch(req);
    if (res && res.ok) {
      // Clone before storing — Response bodies are single-use.
      cache.put(req, res.clone()).then(() => trimCache(cache).catch(() => {}));
    }
    return res;
  } catch (err) {
    // No network and no cache — return a transparent 1x1 PNG so the layout
    // doesn't break and `<img onError>` fallbacks can kick in.
    return new Response(
      Uint8Array.from(
        atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
        c => c.charCodeAt(0)
      ),
      { status: 200, headers: { 'Content-Type': 'image/png' } }
    );
  }
}

// Cap the cache size so we don't fill up the user's storage. Cheap LRU:
// the Cache API preserves insertion order, so the oldest entries are at the
// front of the keys() list.
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  const excess = keys.length - MAX_ENTRIES;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

// Message-based pre-cache trigger. The page can post a list of URLs to warm
// the cache (e.g. as soon as the menu JSON loads).
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'PRECACHE_IMAGES') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(precacheImages(urls));
});

async function precacheImages(urls) {
  const cache = await caches.open(CACHE_NAME);
  // Fetch sequentially-ish to avoid hammering the network. Promise.all with
  // a small batch size is good enough.
  const BATCH = 6;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    await Promise.all(slice.map(async (url) => {
      try {
        const already = await cache.match(url);
        if (already) return;
        const res = await fetch(url, { cache: 'no-cache' });
        if (res && res.ok) await cache.put(url, res.clone());
      } catch { /* network down, skip */ }
    }));
  }
  trimCache(cache).catch(() => {});
}
