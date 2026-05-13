# Operations

Sumber utama:

- `scripts/dev-runner.mjs`
- `scripts/swagger-server.mjs`
- `src/app/api/swagger/route.ts`

## Development Runtime

`npm run dev` menjalankan `scripts/dev-runner.mjs` untuk menyalakan dua proses bersamaan:

- `npm run dev:next`
- `npm run dev:swagger`

Karakteristik:

- Output log diprefix per proses (`next`, `swagger`).
- Jika salah satu proses error (exit code non-zero), runner akan shutdown semua child process.
- Menangani `SIGINT`/`SIGTERM` untuk cleanup proses.

## Swagger Standalone Helper

`scripts/swagger-server.mjs` menjalankan server HTTP sederhana (default port 3010) untuk menampilkan Swagger UI.

Perilaku:

- UI di root server helper (`/`).
- Spec diambil dari `PLANIFY_API_ORIGIN/api/swagger`.
- Proxy spec lokal di `/openapi.json`.
- Health check di `/health`.

## OpenAPI Source Endpoint

`GET /api/swagger` mengembalikan objek `openApiSpec` dari `src/lib/openapi.ts`.

## Checklist Operasional Perubahan

- Jika endpoint API berubah, sinkronkan `src/lib/openapi.ts`.
- Jika script dev berubah, cek kembali `npm run dev` tetap menjalankan Next + Swagger.
- Jika menambah endpoint penting, update `docs/api-reference.md`.
