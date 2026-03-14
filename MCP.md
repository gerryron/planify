# Planify Product Requirements Document

## 1. Ringkasan Produk

- **Nama Produk:** Planify
- **Jenis Produk:** Local-first financial planning and budgeting dashboard
- **Visi Produk:** Menjadi pusat pengelolaan anggaran, transaksi, wallet, dan struktur kategori keuangan dalam satu aplikasi yang sederhana, modular, dan mudah dikembangkan.
- **Tujuan Utama:** Membantu pengguna merencanakan anggaran bulanan, mencatat arus kas aktual, dan menjaga konsistensi saldo wallet tanpa harus bergantung pada spreadsheet terpisah.

## 2. Latar Belakang Masalah

Pengguna personal finance sering menghadapi beberapa masalah berikut:

- Perencanaan anggaran dan pencatatan transaksi dilakukan di tempat yang berbeda.
- Saldo aktual antar wallet sulit dipantau secara konsisten.
- Pengelompokan pemasukan dan pengeluaran sering tidak terstruktur.
- Surplus atau carry over antar bulan tidak tercatat dengan rapi.
- Proses evaluasi realisasi versus rencana anggaran memakan waktu.

Planify dirancang untuk menyatukan seluruh alur tersebut ke dalam satu aplikasi lokal yang ringan, dengan peluang migrasi ke deployment online pada tahap berikutnya.

## 3. Tujuan Produk

### Tujuan Bisnis

- Menyediakan fondasi aplikasi budgeting personal yang terstruktur.
- Mempercepat proses iterasi fitur finansial secara modular.
- Menjaga kemungkinan migrasi dari SQLite ke PostgreSQL atau MySQL.

### Tujuan Pengguna

- Membuat dan mengelola budget bulanan.
- Mencatat transaksi aktual dengan kategori dan wallet.
- Melihat total saldo wallet dengan cepat.
- Mengatur kategori income dan outcome secara hirarkis sederhana.
- Menyiapkan rencana bulan berikutnya termasuk carry over.

## 4. Target Pengguna

### Pengguna Utama

- Individu yang mengelola keuangan pribadi bulanan.
- Pengguna yang ingin mencatat pemasukan, pengeluaran, dan distribusi saldo wallet.

### Pengguna Sekunder

- Rumah tangga kecil yang membutuhkan alat budgeting sederhana.
- Pengguna yang memulai dari local app sebelum berpindah ke sistem online.

## 5. Nilai Produk

Planify memberikan nilai utama berikut:

- Satu tempat untuk budget plan dan cash movement aktual.
- Struktur data sederhana namun cukup kuat untuk berkembang.
- Pengelolaan wallet dan saldo yang terhubung langsung ke transaksi.
- UI modular berbasis fitur sehingga mudah dipelihara.
- Local-first sehingga setup awal ringan dan cepat.

## 6. Ruang Lingkup Produk

### In Scope Saat Ini

- Dashboard landing page
- Sidebar navigation
- Dark mode toggle
- Monthly budget management
- Cash log management
- Wallet management
- Category management
- SQLite database melalui Prisma
- Next.js API routes
- Unit test untuk backend route utama

### Planned Scope / Belum Lengkap

- Daily cash log sebagai fitur khusus harian
- Todo list
- Plan management
- Dashboard analytics yang lebih kaya
- Export/reporting
- Authentication dan multi-user
- Deployment online

## 7. Fitur Produk

## 7.1 Dashboard / Home

### Tujuan

Memberikan titik masuk utama ke aplikasi serta memperjelas positioning produk kepada pengguna.

### Kebutuhan Fungsional

- Menampilkan nama aplikasi.
- Menampilkan deskripsi singkat aplikasi.
- Menjadi pintu masuk ke modul-modul utama melalui sidebar.

### Status Implementasi

- Sudah ada dalam bentuk landing page sederhana.
- Belum ada KPI summary, chart, atau ringkasan finansial.

### Acceptance Criteria

- Pengguna dapat membuka aplikasi dan memahami fungsi utama produk.
- Pengguna dapat menuju fitur utama melalui navigasi samping.

## 7.2 Sidebar Navigation dan Theme

### Tujuan

Memudahkan pengguna berpindah antar modul dan mengubah tema tampilan.

### Kebutuhan Fungsional

- Menampilkan menu utama:
  - Home
  - Monthly Budget
  - Cash Log
- Menampilkan menu sekunder:
  - Wallets
  - Categories
- Menandai halaman aktif.
- Menyediakan toggle dark mode.
- Menyimpan preferensi dark mode di local storage.
- Menyediakan grup menu Options yang bisa dibuka dan ditutup.

### Acceptance Criteria

- Navigasi aktif selalu ter-highlight.
- Dark mode bertahan setelah reload halaman.
- Menu sekunder dapat dibuka dan ditutup tanpa reload.

## 7.3 Monthly Budget Management

### Tujuan

Membantu pengguna menyusun rencana keuangan bulanan sebelum realisasi transaksi terjadi.

### User Stories

- Sebagai pengguna, saya ingin menambahkan item budget bulanan agar saya bisa merencanakan pemasukan dan pengeluaran.
- Sebagai pengguna, saya ingin mengedit dan menghapus budget agar rencana saya tetap relevan.
- Sebagai pengguna, saya ingin menyusun urutan budget agar prioritas lebih mudah dibaca.
- Sebagai pengguna, saya ingin mengatur budget untuk bulan mendatang.
- Sebagai pengguna, saya ingin melakukan carry over surplus ke bulan berikutnya.

### Data Utama

- name
- amount
- month
- category
- type

### Tipe Budget

- income
- outcome
- carryover

### Kebutuhan Fungsional

- Pengguna dapat membuat budget bulanan baru.
- Pengguna dapat mengedit budget bulanan.
- Pengguna dapat menghapus budget bulanan.
- Pengguna dapat mengurutkan budget dengan drag and drop.
- Sistem menyimpan urutan menggunakan sortOrder.
- Pengguna dapat memfilter budget berdasarkan:
  - beberapa bulan terakhir
  - bulan berjalan
  - future
  - month picker manual
- Sistem menghitung total transaksi bulanan dari item budget.
- Sistem menampilkan persentase alokasi terhadap basis income.
- Pengguna dapat menyembunyikan atau menampilkan nominal.
- Pengguna dapat menjalankan carry over jika terdapat surplus.

### Aturan Bisnis

- Field wajib: name, amount, month, category, type.
- type hanya boleh bernilai income, outcome, atau carryover.
- Reorder dilakukan melalui PATCH dengan orderedIds.
- Filter future mengambil budget setelah bulan berjalan.
- Jika month yang diminta lebih besar dari current month, API saat ini mengembalikan seluruh budget.
- Carry over hanya tersedia jika total transaksi bulan terpilih bernilai positif.
- Proses carry over membuat dua entri:
  - outcome pada bulan saat ini
  - carryover income pada bulan berikutnya

### Acceptance Criteria

- Budget valid dapat disimpan ke database.
- Budget dapat diedit tanpa reload penuh.
- Budget dapat dihapus dari daftar.
- Urutan hasil drag and drop tetap konsisten setelah refresh.
- Carry over menghasilkan entri bulan ini dan bulan berikutnya sesuai surplus.

## 7.4 Cash Log Management

### Tujuan

Mencatat transaksi aktual dan menjaga saldo wallet tetap sinkron dengan aktivitas finansial.

### User Stories

- Sebagai pengguna, saya ingin mencatat transaksi pemasukan atau pengeluaran.
- Sebagai pengguna, saya ingin memilih wallet untuk setiap transaksi.
- Sebagai pengguna, saya ingin memilih kategori agar transaksi lebih terstruktur.
- Sebagai pengguna, saya ingin memfilter transaksi berdasarkan bulan dan wallet.
- Sebagai pengguna, saya ingin mengedit transaksi tanpa merusak konsistensi saldo.

### Data Utama

- date
- description
- amount
- walletName
- categoryId
- excludeFromReport

### Kebutuhan Fungsional

- Pengguna dapat membuat cash log.
- Pengguna dapat melihat seluruh cash log.
- Pengguna dapat memfilter log berdasarkan:
  - month
  - future
  - date pada level API
  - wallet pada level UI
- Pengguna dapat mengedit cash log.
- Pengguna dapat menghapus cash log.
- Log dikelompokkan berdasarkan tanggal.
- Pengguna dapat menambah transaksi dari konteks wallet yang dipilih.
- Pengguna dapat menyembunyikan nominal saldo.
- Sistem meng-update saldo wallet ketika transaksi dibuat, diubah, atau dihapus.

### Aturan Bisnis

- Field wajib saat create: date, description, amount, walletName, categoryId.
- categoryId harus valid.
- walletName harus valid.
- Jika kategori bertipe income, amount menambah saldo wallet.
- Jika kategori bertipe outcome, amount mengurangi saldo wallet.
- Saat edit transaksi:
  - dampak transaksi lama harus dibalik lebih dulu
  - dampak transaksi baru harus diterapkan
- Jika wallet berubah, saldo wallet lama dan baru harus disesuaikan.
- Jika kategori berubah, arah perhitungan saldo harus dihitung ulang.
- month=future mengembalikan transaksi mulai bulan depan.
- Jika month yang diminta lebih besar dari current month, API saat ini mengembalikan seluruh log.
- excludeFromReport tidak otomatis berarti transaksi tidak memengaruhi saldo.
- Transaksi penyesuaian saldo seperti Adjust Balance dengan excludeFromReport=true tidak boleh menyebabkan perhitungan ganda.

### Acceptance Criteria

- Income menambah saldo wallet.
- Outcome mengurangi saldo wallet.
- Edit transaksi menjaga saldo akhir tetap benar.
- Delete transaksi mengembalikan saldo wallet seperti semula.
- Wallet atau category yang tidak valid ditolak oleh API.

## 7.5 Wallet Management

### Tujuan

Memungkinkan pengguna mengelola sumber dana seperti cash, bank, atau e-wallet.

### User Stories

- Sebagai pengguna, saya ingin membuat beberapa wallet berbeda.
- Sebagai pengguna, saya ingin menentukan apakah wallet dihitung ke total saldo utama.
- Sebagai pengguna, saya ingin memindahkan wallet antar grup include/exclude.
- Sebagai pengguna, saya ingin saldo wallet bisa disesuaikan dan tetap tercatat jejaknya.

### Data Utama

- name
- balance
- excludeFromTotal
- sortOrder

### Kebutuhan Fungsional

- Pengguna dapat menambah wallet.
- Pengguna dapat mengedit wallet.
- Pengguna dapat menghapus wallet.
- Pengguna dapat mengurutkan wallet dengan drag and drop.
- Pengguna dapat memindahkan wallet ke area included atau excluded.
- Wallet menampilkan:
  - nama
  - saldo
  - persentase alokasi untuk wallet yang included
- Pengguna dapat menyembunyikan nominal wallet.

### Aturan Bisnis

- Nama wallet harus unik.
- Minimal harus ada 1 wallet tersisa di sistem.
- Reorder disimpan melalui sortOrder.
- Wallet yang excludeFromTotal tidak masuk perhitungan total utama.
- Jika saldo wallet diubah manual, sistem membuat cash log penyesuaian.
- Penyesuaian saldo menggunakan kategori sistem:
  - Transfer In untuk kenaikan saldo
  - Transfer Out untuk penurunan saldo
- Adjustment log diberi excludeFromReport=true.
- Fitur adjustment membutuhkan kategori Transfer In dan Transfer Out tersedia.

### Acceptance Criteria

- Wallet baru dapat dibuat dan ditampilkan.
- Wallet tidak bisa dihapus jika itu wallet terakhir.
- Wallet dapat dipindahkan antar grup include/exclude.
- Update saldo wallet membuat adjustment trail otomatis.

## 7.6 Category Management

### Tujuan

Menyediakan struktur kategori income dan outcome agar pencatatan transaksi lebih rapi dan konsisten.

### User Stories

- Sebagai pengguna, saya ingin memisahkan kategori pemasukan dan pengeluaran.
- Sebagai pengguna, saya ingin membuat parent category dan subcategory.
- Sebagai pengguna, saya ingin struktur kategori tetap sederhana dan tidak terlalu dalam.

### Data Utama

- name
- type
- parentId

### Tipe Category

- income
- outcome

### Kebutuhan Fungsional

- Pengguna dapat membuat kategori root.
- Pengguna dapat membuat subcategory.
- Pengguna dapat mengedit kategori.
- Pengguna dapat menghapus kategori.
- UI kategori dipisah dengan tab:
  - income
  - outcome
- UI menampilkan hierarchy parent-child.

### Aturan Bisnis

- Parent category harus ada.
- Tipe parent dan child harus sama.
- Maksimal hierarchy hanya 1 level child.
- Subcategory tidak boleh punya child lagi.
- Category tidak boleh menjadi parent dirinya sendiri.
- Parent category yang memiliki child tidak boleh diubah tipenya.
- Parent category yang masih punya subcategory tidak boleh dihapus.
- Kombinasi name, type, parentId harus unik.

### Acceptance Criteria

- Category income dan outcome dapat dibuat.
- Root category dan subcategory dapat ditampilkan sebagai tree sederhana.
- Struktur hierarchy tidak valid ditolak.
- Parent category dengan child tidak dapat dihapus.

## 7.7 Daily Cash Log

### Tujuan

Menyediakan tampilan khusus untuk monitoring transaksi per hari.

### Status Saat Ini

- Sudah disebut dalam struktur proyek.
- Folder fitur sudah ada tetapi belum memiliki implementasi penuh.
- Belum ada page, service, dan API yang benar-benar selesai.

### Planned Requirements

- Menampilkan transaksi per tanggal.
- Menampilkan ringkasan inflow dan outflow harian.
- Filter per wallet dan category.
- Quick add transaction untuk tanggal tertentu.
- Closing balance harian.

## 7.8 Todo List dan Plan Management

### Tujuan

Membantu pengguna mengelola tindakan dan rencana finansial di luar pencatatan transaksi langsung.

### Status Saat Ini

- Disebut pada deskripsi proyek awal.
- Belum ditemukan model database, page, route, atau komponen yang mengimplementasikan fitur ini.

### Planned Requirements

- Membuat todo item.
- Mengubah status todo.
- Menghapus todo.
- Mengelompokkan plan berdasarkan goal atau periode.
- Menghubungkan plan dengan target finansial atau budget tertentu.

## 8. Non-Functional Requirements

### Performance

- Interaksi CRUD harus responsif pada penggunaan lokal normal.
- Drag and drop reorder harus terasa ringan.
- Filter bulan tidak boleh menyebabkan pengalaman yang lambat pada skala penggunaan personal.

### Reliability

- Saldo wallet dan perubahan cash log harus konsisten.
- Operasi penting yang memengaruhi saldo harus diproses secara transaksional.
- API harus mengembalikan error yang jelas untuk input tidak valid.

### Maintainability

- Arsitektur harus tetap modular berdasarkan feature.
- Types, services, components, dan API dipisah dengan jelas.
- Shared response helper dipakai konsisten.

### Portability

- Database default adalah SQLite untuk local usage.
- Skema harus tetap memungkinkan migrasi ke PostgreSQL atau MySQL.

### Testability

- Backend API utama wajib memiliki unit test.
- Flow kritis yang harus diuji:
  - monthly budget CRUD dan reorder
  - wallet CRUD dan balance adjustment
  - cash log CRUD dan balance recalculation

## 9. Ringkasan Model Data

### Entitas Utama

- MonthlyBudget
- Wallet
- Category
- CashLog

### Relasi Utama

- CashLog dapat terhubung ke Category.
- Category memiliki relasi parent-child.
- Wallet direferensikan dari cash log melalui walletName.
- MonthlyBudget berdiri terpisah sebagai data planning.

### Catatan Desain

- Saat ini CashLog menggunakan walletName, bukan walletId.
- Pendekatan ini sederhana untuk MVP tetapi berisiko lebih rapuh jika struktur data berkembang.

## 10. API Requirements

### Endpoint Saat Ini

- /api/monthly-budget
- /api/cash-log
- /api/wallets
- /api/wallets/transfer
- /api/categories
- /api/swagger (OpenAPI JSON)
- Swagger UI standalone: http://localhost:3010

### Operasi Standar

- GET
- POST
- PATCH
- DELETE

### Perilaku Tambahan

- Reorder dilakukan dengan PATCH dan payload orderedIds.
- Filter month tersedia pada monthly-budget dan cash-log.
- Filter date tersedia pada cash-log.
- Cash log default diurutkan terbaru berdasarkan id (descending).

### Swagger and API Contract Governance

- Swagger/OpenAPI source of truth berada di:
  - `src/lib/openapi.ts`
  - `src/app/api/swagger/route.ts`
  - `scripts/swagger-server.mjs`
- Setiap API baru WAJIB ditambahkan ke Swagger (paths, request schema, response schema, examples).
- Setiap perubahan API eksisting (URL, query, body, validation, response, error message penting) WAJIB diperbarui di Swagger pada commit yang sama.
- PR dianggap belum selesai jika implementasi API sudah berubah tetapi Swagger belum disinkronkan.
- Endpoint dokumentasi:
  - OpenAPI JSON: `/api/swagger`
  - Swagger UI: `http://localhost:3010`

## 11. UX Requirements

### Prinsip UX

- Aplikasi harus terasa seperti single workspace untuk kebutuhan finansial personal.
- Form create/edit dibuka melalui modal.
- Aksi destruktif harus dikonfirmasi.
- Loading state harus terlihat jelas.
- Nilai finansial positif dan negatif harus mudah dibedakan.
- Nominal bisa disembunyikan untuk kebutuhan privasi.

### Pola Interaksi

- Sticky header pada list yang memiliki filter dan tombol aksi.
- Month shortcuts untuk mempercepat perpindahan periode.
- Grouping data untuk mempercepat pembacaan.
- Drag and drop untuk modul yang butuh pengurutan.

## 12. Batasan dan Asumsi

### Batasan

- Sistem masih local-first.
- Belum ada authentication.
- Belum ada multi-user separation.
- Belum ada reporting kompleks.
- Beberapa fitur pada visi awal belum terimplementasi.

### Asumsi

- Pengguna saat ini adalah single user owner.
- Kategori Transfer In dan Transfer Out tersedia untuk proses adjustment wallet.
- Priority tertinggi saat ini adalah budgeting, wallet, category, dan cash log.

## 13. Risiko Produk

- Dokumen awal menyebut fitur yang belum diimplementasikan, sehingga rawan menimbulkan ekspektasi berlebih.
- Relasi wallet berbasis nama berpotensi menjadi titik lemah saat evolusi data.
- Query future month saat ini belum sepenuhnya ketat untuk semua skenario.
- Daily cash log dan todo/planning masih memerlukan definisi implementasi yang jelas.

## 14. Prioritas Rilis

### MVP

- Wallet management
- Category management
- Monthly budget management
- Cash log management
- Sidebar navigation
- Dark mode
- Backend route tests

### Post-MVP

- Daily cash log
- Dashboard analytics
- Todo list
- Plan management
- Reporting/export
- Online deployment
- Authentication

## 15. Open Questions

- Apakah CashLog sebaiknya menggunakan walletId alih-alih walletName?
- Apakah future month query harus mengembalikan seluruh data atau hanya bulan yang dipilih?
- Apakah carry over perlu relasi eksplisit antar entri untuk audit trail?
- Apakah kategori sistem perlu diproteksi agar tidak bisa dihapus?
- Apakah dashboard perlu KPI summary pada fase MVP?

## 16. Stack dan Tools

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Next.js API routes
- **Database:** SQLite untuk lokal
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **UI Components:** Material UI icons dan utility integration
- **Testing:** Jest
- **Interaction Utilities:** SweetAlert2, dnd-kit

## 17. Struktur Proyek

```text
planify/
|
+- src/
|  +- app/
|  |  +- page.tsx
|  |  +- monthly-budget/
|  |  +- cash-log/
|  |  +- wallets/
|  |  +- categories/
|  |  +- api/
|  +- features/
|  |  +- monthly-budget/
|  |  +- cash-log/
|  |  +- wallets/
|  |  +- categories/
|  |  +- daily-cash-log/
|  +- core/
|  +- shared/
+- prisma/
|  +- schema.prisma
|  +- migrations/
|  +- mock/
+- public/
+- package.json
+- tsconfig.json
+- README.md
+- MCP.md
```

## 18. Environment Variables

Contoh environment variable lokal:

```env
DATABASE_URL="file:./dev.db"
```

## 19. Setup dan Development Notes

### Inisialisasi dan Pengembangan

- Gunakan Next.js + TypeScript + Tailwind CSS.
- Gunakan Prisma sebagai ORM.
- Gunakan SQLite sebagai database lokal.
- Jalankan migration dan generate Prisma client sebelum menjalankan aplikasi.
- Unit test backend wajib tersedia untuk route utama.

### Perintah Umum

```bash
npm run dev
npm run test
npm run dev:seed-mock
npm run dev:clear-mock
```

## 20. Dokumentasi dan Governance

- Dokumen ini berfungsi sebagai gabungan konteks proyek dan PRD ringkas.
- Jika ada perubahan fitur, scope, atau arsitektur, dokumen ini harus ikut diperbarui.
- Fitur yang belum terimplementasi harus diberi status planned agar tidak mengaburkan kondisi produk saat ini.
