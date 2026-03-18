const STATIC_CACHE = 'planify-static-v3';
const DATA_CACHE = 'planify-data-v3';
const OFFLINE_FALLBACK_URL = '/offline';
const WRITE_SYNC_DB = 'planify-sync-db';
const WRITE_SYNC_STORE = 'write-queue';
const FAILED_SYNC_STORE = 'failed-write-log';
const WRITE_SYNC_TAG = 'planify-sync-writes';
const FAILED_LOG_LIMIT = 20;
const OFFLINE_URLS = [
  '/',
  OFFLINE_FALLBACK_URL,
  '/cash-log',
  '/wallets',
  '/categories',
  '/monthly-budget',
  '/settings',
  '/brand/pwa-192.png',
  '/brand/pwa-512.png',
  '/brand/pwa-maskable-512.png',
];

const CACHE_PREFIX = 'planify-';
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const sameOrigin = (url) => {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
};

const openWriteSyncDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(WRITE_SYNC_DB, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WRITE_SYNC_STORE)) {
        db.createObjectStore(WRITE_SYNC_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains(FAILED_SYNC_STORE)) {
        db.createObjectStore(FAILED_SYNC_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const addQueuedRequest = async (record) => {
  const db = await openWriteSyncDb();
  const tx = db.transaction(WRITE_SYNC_STORE, 'readwrite');
  tx.objectStore(WRITE_SYNC_STORE).add(record);
  await txDone(tx);
  db.close();
};

const getQueuedRequests = async () => {
  const db = await openWriteSyncDb();
  const tx = db.transaction(WRITE_SYNC_STORE, 'readonly');
  const store = tx.objectStore(WRITE_SYNC_STORE);
  const request = store.getAll();

  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });

  await txDone(tx);
  db.close();
  return rows;
};

const deleteQueuedRequest = async (id) => {
  const db = await openWriteSyncDb();
  const tx = db.transaction(WRITE_SYNC_STORE, 'readwrite');
  tx.objectStore(WRITE_SYNC_STORE).delete(id);
  await txDone(tx);
  db.close();
};

const getFailedWriteLogs = async () => {
  const db = await openWriteSyncDb();
  const tx = db.transaction(FAILED_SYNC_STORE, 'readonly');
  const store = tx.objectStore(FAILED_SYNC_STORE);
  const request = store.getAll();

  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });

  await txDone(tx);
  db.close();
  return rows;
};

const pruneFailedWriteLogs = async () => {
  const rows = await getFailedWriteLogs();
  if (rows.length <= FAILED_LOG_LIMIT) {
    return;
  }

  const sorted = [...rows].sort((a, b) => b.lastAttemptAt - a.lastAttemptAt);
  const staleRows = sorted.slice(FAILED_LOG_LIMIT);

  const db = await openWriteSyncDb();
  const tx = db.transaction(FAILED_SYNC_STORE, 'readwrite');
  const store = tx.objectStore(FAILED_SYNC_STORE);

  staleRows.forEach((item) => {
    store.delete(item.id);
  });

  await txDone(tx);
  db.close();
};

const addFailedWriteLog = async (record) => {
  const db = await openWriteSyncDb();
  const tx = db.transaction(FAILED_SYNC_STORE, 'readwrite');
  tx.objectStore(FAILED_SYNC_STORE).add(record);
  await txDone(tx);
  db.close();
  await pruneFailedWriteLogs();
};

const registerWriteSync = async () => {
  if (!self.registration.sync) {
    return;
  }

  try {
    await self.registration.sync.register(WRITE_SYNC_TAG);
  } catch {
    // Ignore sync registration errors and rely on manual retry.
  }
};

const queueWriteRequest = async (request) => {
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value;
  }

  const body = await request.clone().text();
  await addQueuedRequest({
    url: request.url,
    method: request.method,
    headers,
    body,
    createdAt: Date.now(),
  });

  await registerWriteSync();
};

const replayQueuedWrites = async () => {
  const queued = await getQueuedRequests();

  for (const item of queued) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (!response.ok) {
        await addFailedWriteLog({
          url: item.url,
          method: item.method,
          status: response.status,
          statusText: response.statusText,
          lastAttemptAt: Date.now(),
        });
        continue;
      }

      await deleteQueuedRequest(item.id);
    } catch {
      await addFailedWriteLog({
        url: item.url,
        method: item.method,
        status: -1,
        statusText: 'Network error while replaying queued request',
        lastAttemptAt: Date.now(),
      });
      return;
    }
  }
};

const putInCache = async (cacheName, request, response) => {
  if (!response || !response.ok || !sameOrigin(request.url)) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      void putInCache(cacheName, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) {
    void networkFetch;
    return cached;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
};

const networkFirst = async (request, cacheName, fallbackUrl) => {
  try {
    const networkResponse = await fetch(request);
    void putInCache(cacheName, request, networkResponse);
    return networkResponse;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) {
        return fallback;
      }
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
};

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    void putInCache(cacheName, request, response);
    return response;
  } catch {
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(OFFLINE_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX))
            .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() => replayQueuedWrites()),
  );
});

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'REPLAY_WRITE_QUEUE') {
    event.waitUntil(replayQueuedWrites());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag !== WRITE_SYNC_TAG) {
    return;
  }

  event.waitUntil(replayQueuedWrites());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isLocalRequest = requestUrl.origin === self.location.origin;

  if (
    isLocalRequest &&
    requestUrl.pathname.startsWith('/api/') &&
    WRITE_METHODS.includes(event.request.method)
  ) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        await queueWriteRequest(event.request);
        return new Response(
          JSON.stringify({
            queued: true,
            offline: true,
            message: 'Request queued and will sync when online',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }),
    );
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE, OFFLINE_FALLBACK_URL),
    );
    return;
  }

  if (isLocalRequest && requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  const staticDestinations = ['style', 'script', 'font', 'image'];
  if (
    isLocalRequest &&
    staticDestinations.includes(event.request.destination)
  ) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  if (isLocalRequest) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
  }
});
