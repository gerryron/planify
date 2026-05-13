# Product Requirements

## Ringkasan Produk

- Nama: Planify
- Jenis: Local-first personal finance planner
- Stack utama: Next.js App Router, Prisma, PostgreSQL

Planify menyatukan perencanaan budget bulanan, pencatatan transaksi aktual, manajemen wallet, dan struktur kategori dalam satu aplikasi yang modular.

## Masalah yang Diselesaikan

- Budget plan dan realisasi transaksi sering tersebar di banyak tools.
- Saldo wallet sulit konsisten jika mutasi tidak terhubung ke transaksi.
- Kategori pemasukan/pengeluaran sering tidak terstruktur.
- Monitoring bulan berjalan vs rencana bulanan memerlukan proses manual.

## Tujuan Produk

### Tujuan Pengguna

- Menyusun budget bulanan (income, outcome, carryover).
- Mencatat transaksi aktual per tanggal, wallet, dan kategori.
- Menjaga saldo wallet tetap akurat terhadap mutasi transaksi.
- Memakai aplikasi tetap nyaman saat koneksi tidak stabil.

### Tujuan Teknis

- Arsitektur modular berbasis feature folder.
- Backend API konsisten pada App Router endpoint (`src/app/api`).
- Data layer terpusat di Prisma schema.
- Fondasi PWA + offline write queue.

## Scope Saat Ini

- Auth berbasis JWT cookie (register, login, me, logout).
- Approval user oleh superadmin.
- Monthly budget CRUD + reorder.
- Cash log CRUD + sinkronisasi saldo wallet.
- Wallet CRUD, wallet type (basic/goal/credit_card), dan transfer antar wallet.
- Category CRUD dengan aturan hierarchy.
- Settings purge data per scope.
- Dashboard, halaman modul utama, layout responsive.
- PWA install, service worker cache, offline fallback, queued write replay.

## Planned / Backlog

- Daily cash log khusus dengan insight lebih dalam.
- Reporting/export yang lebih kaya.
- Analitik dashboard lanjutan.
- Alur kolaborasi multi-role yang lebih kompleks.

## Prinsip Aturan Bisnis Umum

- Semua mutasi data bisnis user memakai autentikasi.
- User status `pending` dibatasi sampai diset `active` oleh superadmin.
- Endpoint fitur non-auth harus menghormati user scope.
- Konsistensi saldo wallet diprioritaskan lewat update atomik transaksi.

## Acceptance Tingkat Sistem

- User dapat register, disetujui superadmin, lalu login.
- User dapat mengelola budget, cash log, wallet, category.
- Saldo wallet mengikuti perubahan cash log dan transfer.
- Saat offline, write request tidak hilang dan dapat direplay.
