# Sprint 4 Execution Plan

## Dev A
Area Core UI, Guest Reservation & Admin Setup

**Hari 1 (Rabu) - Foundation**
- **Branch:** `fe/shared-components`
- **Files:** `src/components/layout/*`, `layout.tsx` (Admin & Owner)
- Membuat UI statis untuk Navbar (Publik) yang responsive.
- Menyusun AdminSidebar & OwnerSidebar dengan seluruh tautan navigasi.
- Memastikan layout wrapper (AdminLayout, OwnerLayout) rapi.

**Hari 2 (Kamis) - Public Reservation (Part 1)**
- **Branch:** `fe/guest-reservation`
- **Files:** `/reservasi/page.tsx`, `/cancel/page.tsx`
- Membuat UI Wizard Reservasi Step 1 (Pilih jumlah tamu dan tanggal).
- Mengonsumsi GET `/api/public/blocked-dates` agar tanggal libur di-disable.
- Step 2 (Pilih Jam) memanggil GET `/api/public/sessions` & GET `/api/public/tables`.
- Membangun halaman pembatalan mandiri yang memanggil POST `/api/public/reservations/cancel`.

**Hari 3 (Jumat) - Public Content**
- **Branch:** `fe/guest-content`
- **Files:** `/reservasi/page.tsx`, `/career`, `/gallery`, `/vip`
- Menyelesaikan Step 3 Reservasi (Data Diri) dan hit POST `/api/public/reservations`. (TIDAK menyentuh Midtrans).
- Tampilkan list lowongan pekerjaan publik (GET `/api/public/careers`).
- Tampilkan Galeri masonry (GET `/api/gallery`).
- Membangun landing page VIP (GET `/api/vip/[token]`).

**Hari 4 (Senin) - Admin Operations**
- **Branch:** `fe/admin-reservations`
- **Files:** `/admin/reservations/page.tsx`, `/admin/check-in/page.tsx`
- Tabel data reservasi harian (GET `/api/admin/reservations`) dengan fitur filter.
- UI fitur Check-in Manual (input kode / scan QR) ke POST `/api/admin/check-in`.

**Hari 5 (Selasa) - Admin Configurations**
- **Branch:** `fe/admin-tables-sessions`
- **Files:** `/admin/tables`, `/admin/sessions`, `/admin/blocked-dates`
- Form CRUD Manajemen Meja via GET/POST `/api/admin/tables`.
- Form Pengaturan Sesi Operasional via GET/POST `/api/admin/sessions`.
- Kalender Blocked Dates via GET/POST `/api/admin/blocked-dates`.

**Hari 6 (Rabu) - Admin Content & Owner Setup**
- **Branch:** `fe/admin-content` & `fe/owner-setup`
- **Files:** `/admin/gallery`, `/admin/careers`, `/owner/users`, `/owner/settings`
- Form unggah galeri & tambah lowongan kerja admin (POST `/api/admin/gallery`).
- UI Owner untuk menambah akun staf (GET/POST `/api/owner/users`).
- Pengaturan master restoran (PUT `/api/admin/settings`).

---

## Dev B
Area Payment, Analytics & CRM

**Hari 1 (Rabu) - Foundation & Tools**
- **Branch:** `fe/shared-components`
- **Files:** Komponen Shared UI
- Membantu styling global jika diperlukan bersama Dev A.
- Konfigurasi library chart (Recharts/Chart.js) untuk Dashboard.
- Membuat komponen DataTable reusable dengan paginasi.

**Hari 2 (Kamis) - Owner Analytics**
- **Branch:** `fe/owner-dashboard`
- **Files:** `/owner/dashboard/page.tsx`, `/owner/reports/page.tsx`
- Membangun Executive Dashboard untuk Owner (grafik pendapatan, okupansi).
- Tabel Laporan Keuangan dari agregrasi data pembayaran.

**Hari 3 (Jumat) - Admin CRM & Dashboard**
- **Branch:** `fe/admin-dashboard-crm`
- **Files:** `/admin/dashboard/page.tsx`, `/admin/guests/page.tsx`
- Dashboard operasional harian untuk staf.
- Sistem CRM Tamu: riwayat kunjungan (GET `/api/admin/guests`), tambah Label & Notes (POST `/api/admin/guests/[id]/notes`).

**Hari 4 (Senin) - Admin Event Requests**
- **Branch:** `fe/admin-dashboard-crm`
- **Files:** `/admin/event-requests/page.tsx`
- UI peninjauan pengajuan acara dari publik.
- Form admin mengirimkan penawaran harga secara sepihak (POST `/api/admin/event-requests/[id]/offer`).

**Hari 5 (Selasa) - Admin Payments & Refund**
- **Branch:** `fe/admin-payments`
- **Files:** `/admin/payments/page.tsx`
- Tabel rekapan pembayaran Midtrans (GET `/api/admin/payments`).
- Tombol Action status bayar manual.
- Tombol konfirmasi Refund dana ke tamu (POST `/api/admin/payments/[id]/refund`).

**Hari 6 (Rabu) - Midtrans Handover**
- **Branch:** `fe/guest-payment`
- **Files:** `/reservasi/page.tsx` (step akhir), `/event/request/[id]/page.tsx`
- Mengambil UI `/reservasi` dari Dev A. Setelah reservasi dibuat, panggil POST `/api/public/payments`.
- Menampilkan popup Midtrans Snap JS.
- Selesaikan form `/event/request/[id]` untuk tamu bayar DP Event via Snap JS (POST `/api/events/request/[id]/pay`).
