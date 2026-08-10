/*
 * Offline support for the productivity dashboard.
 *
 * Strategy:
 *   - navigation  → network-first, falling back to the cached shell so the
 *                   app boots with no connection at all
 *   - hashed /assets/* → cache-first (content-hashed, so they never change
 *                   under a given URL)
 *   - other static → stale-while-revalidate
 *   - /api/*      → never cached. Serving a stale state blob would let an
 *                   old copy overwrite newer local edits on the next push;
 *                   localStorage is the offline data source instead.
 */

const VERSION = 'xp-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const FONT_CACHE = `${VERSION}-fonts`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons.svg'];

// Static hosts (Vercel, `vite preview`) answer with `Vary: Origin`, and the
// worker's own precache fetches don't carry the same Origin header the page's
// requests do — without ignoreVary every lookup misses and the app breaks
// offline despite a fully populated cache.
const MATCH = { ignoreVary: true };

const offlineResponse = () =>
  new Response('Offline and no cached copy of this resource is available.', {
    status: 504,
    headers: { 'Content-Type': 'text/plain' },
  });

// The cached HTML points at content-hashed bundles. Pull those in too, or an
// offline reload would render a shell whose scripts are missing.
async function precacheReferencedAssets(response) {
  let html;
  try {
    html = await response.clone().text();
  } catch {
    return;
  }
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|mjs|css|svg|png|webp|woff2?))"/g)) {
    urls.add(match[1]);
  }
  if (!urls.size) return;
  const cache = await caches.open(ASSET_CACHE);
  await Promise.all(
    [...urls].map(async url => {
      if (await cache.match(url, MATCH)) return;
      try {
        const asset = await fetch(url, { cache: 'reload' });
        if (asset.ok) await cache.put(url, asset);
      } catch {
        /* best effort */
      }
    }),
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one missing file can't fail the whole install.
      await Promise.all(
        SHELL_URLS.map(async url => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (!response.ok) return;
            await cache.put(url, response.clone());
            if (url === '/' || url === '/index.html') await precacheReferencedAssets(response);
          } catch {
            /* best effort */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter(name => name.startsWith('xp-') && !CURRENT_CACHES.includes(name)).map(name => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/index.html', response.clone());
      // Don't block the response on warming the bundle cache.
      precacheReferencedAssets(response);
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cached = (await cache.match('/index.html', MATCH)) || (await cache.match('/', MATCH));
    return cached || offlineResponse();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return offlineResponse();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH);
  const network = fetch(request)
    .then(response => {
      // Cross-origin font responses come back opaque (status 0); they are
      // still usable from the cache, so store those too.
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || offlineResponse());
  return cached || network;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Google Fonts: the stylesheet and its woff2 files are the only
  // cross-origin resources the app needs. Cached so offline typography
  // matches online instead of dropping to a system fallback.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});
