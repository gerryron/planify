# PWA and Offline

Sumber utama:

- `src/app/manifest.ts`
- `public/sw.js`
- `src/shared/pwa/PWARegister.tsx`
- `src/shared/pwa/PWAInstallButton.tsx`
- `src/shared/pwa/writeQueueClient.ts`
- `src/app/offline/page.tsx`

## Manifest

Manifest disediakan oleh `src/app/manifest.ts` dengan informasi:

- nama app: Planify
- display mode: standalone
- icon PWA 192/512/maskable
- theme color hijau (`#059669`)

## Service Worker Strategy

`public/sw.js` mengelola:

- Cache static (`planify-static-v3`)
- Cache data API (`planify-data-v3`)
- Fallback offline page (`/offline`)

Strategi fetch:

- Navigasi dokumen: `networkFirst` + fallback offline
- API GET lokal: `networkFirst`
- Asset static: `staleWhileRevalidate`
- Request lokal lain: `cacheFirst`

## Offline Write Queue

Write method API (`POST`, `PUT`, `PATCH`, `DELETE` ke `/api/*`) saat offline:

1. Request disimpan ke IndexedDB (`planify-sync-db`, store `write-queue`).
2. Service worker merespons `202` dengan status queued.
3. Replay dilakukan saat:
   - Background sync (`planify-sync-writes`)
   - Service worker activate
   - Perintah manual `REPLAY_WRITE_QUEUE`
4. Kegagalan replay dicatat di store `failed-write-log` (maks 20 item terbaru).

## UI Integrasi PWA

- `PWARegister`:
  - Register service worker (production)
  - Trigger replay queue saat online/visibilitychange
  - Menampilkan prompt update app jika ada SW baru
  - Menampilkan hint instalasi iOS Safari
- `PWAInstallButton`:
  - Menangani event `beforeinstallprompt`
  - Menyembunyikan tombol jika app sudah terpasang

## Offline Page

- Halaman `/offline` memberi informasi kondisi offline dan tombol retry ke root.
