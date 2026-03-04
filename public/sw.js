// Gaza Price — Service Worker v1
// Pure manual SW: cache-first for static, stale-while-revalidate for API, network-first for pages

const CACHE_VERSION = 1;
const STATIC_CACHE = `static-v${CACHE_VERSION}`;
const API_CACHE = `api-v${CACHE_VERSION}`;
const PAGES_CACHE = `pages-v${CACHE_VERSION}`;

const ALL_CACHES = [STATIC_CACHE, API_CACHE, PAGES_CACHE];

// App shell to pre-cache on install
const APP_SHELL = [
  '/',
  '/categories',
  '/submit',
  '/reports',
  '/onboarding',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// ─── Install: pre-cache app shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) =>
      cache.addAll(APP_SHELL).catch((err) => {
        // Don't fail install if a single resource fails (e.g. dev mode)
        console.warn('[SW] Pre-cache partial failure:', err);
      })
    )
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ─── Activate: clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// ─── Message: handle SKIP_WAITING from client ───────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch: route through strategy table ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // POST requests → network-only
  if (request.method !== 'GET') return;

  // Auth & admin API → network-only (never cache)
  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/admin')) return;

  // Static assets (_next/static) → cache-first, 30 days
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Fonts (next/font generates files under _next/static, already covered above)
  // but also handle any font files served from other paths
  if (/\.(woff2?|ttf|otf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Icons & manifest → cache-first, 7 days
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // API routes → stale-while-revalidate with varying max ages
  if (url.pathname.startsWith('/api/')) {
    const maxAge = getApiMaxAge(url.pathname);
    event.respondWith(staleWhileRevalidate(request, API_CACHE, maxAge));
    return;
  }

  // Page navigations → network-first, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // Everything else (images, etc.) → cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ─── Strategy: cache-first ──────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Strategy: network-first (for pages) ────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback: try to return cached homepage
    const fallback = await caches.match('/');
    if (fallback) return fallback;

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ─── Strategy: stale-while-revalidate (for API) ─────────────────────────────
async function staleWhileRevalidate(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        // Store with timestamp header for age checking
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.set('sw-cached-at', Date.now().toString());
        const timedResponse = new Response(cloned.body, {
          status: cloned.status,
          statusText: cloned.statusText,
          headers,
        });
        cache.put(request, timedResponse);
      }
      return response;
    })
    .catch(() => cached); // If fetch fails, return cached (may be undefined)

  // If we have a cached version and it's not too stale, return it immediately
  if (cached) {
    const cachedAt = Number(cached.headers.get('sw-cached-at') || 0);
    const age = Date.now() - cachedAt;

    if (age < maxAgeMs) {
      // Fresh enough — return cached, revalidate in background
      return cached;
    }

    // Stale — try network first, but return stale cache if network fails
    try {
      const response = await fetchPromise;
      return response || cached;
    } catch {
      return cached;
    }
  }

  // No cache — must wait for network
  try {
    const response = await fetchPromise;
    if (response) return response;
  } catch {
    // Nothing we can do
  }

  return new Response(JSON.stringify({ error: 'offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── API max-age table ──────────────────────────────────────────────────────
function getApiMaxAge(pathname) {
  if (pathname === '/api/areas') return 24 * 60 * 60 * 1000; // 24h
  if (pathname.startsWith('/api/categories') || pathname.startsWith('/api/sections'))
    return 60 * 60 * 1000; // 1h
  if (pathname.startsWith('/api/stores')) return 60 * 60 * 1000; // 1h
  if (pathname.startsWith('/api/products') || pathname.startsWith('/api/prices'))
    return 5 * 60 * 1000; // 5 min
  if (pathname.startsWith('/api/reports') || pathname === '/api/stats')
    return 5 * 60 * 1000; // 5 min

  // Default for any other API
  return 5 * 60 * 1000; // 5 min
}
