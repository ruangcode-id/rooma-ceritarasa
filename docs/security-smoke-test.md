# Security Smoke Test — B2 dan B3

Tanggal pemeriksaan: 13 Juli 2026
Branch kerja: `fix/security-a2-a3`

## Perintah regresi

```bash
npm run test:security
npm run lint
npm run build
```

`test:security` menjalankan pemeriksaan matcher Proxy, guard API, envelope 401/403,
penanganan UI 401/403/413/429, validasi reservasi publik, signature webhook
Midtrans, dan perlindungan cron.

## Hasil yang dapat diverifikasi tanpa mengubah data

| Area / branch asal | Pemeriksaan | Status |
| --- | --- | --- |
| `feat/login` | Halaman dan API admin/owner masuk matcher Proxy | Lulus otomatis |
| `feat/reservation-admin`, `feat/session-table`, `feat/user-crud` | Seluruh method API admin/owner mempunyai guard server-side dan envelope error konsisten | Lulus otomatis |
| `fe/guest-reservation` | UI mempunyai copy khusus 413 dan 429; respons internal disanitasi | Lulus otomatis |
| `fe/admin-reservations`, `fe/admin-table-sessions`, `fe/admin-dashboard-crm` | Protected fetch menangani 401 dengan redirect login dan 403 dengan akses ditolak | Lulus otomatis |
| `fe/owner-dashboard` | Protected fetch owner memakai handler error bersama | Lulus otomatis |
| `feat/payment-midtrans`, `fe/guest-payment` | Webhook berada di luar Proxy dan signature diperiksa sebelum transaksi database | Lulus otomatis |
| `feat/reservation-core` | Zod dijalankan sebelum pembuatan reservasi/payment dan sukses tetap berstatus 201 | Lulus otomatis |
| Cron reminder | `CRON_SECRET` diperiksa sebelum reminder dikirim dan route berada di luar Proxy | Lulus otomatis |

## Hasil smoke runtime lokal

Server production lokal dijalankan sementara dari hasil `npm run build`. Semua request di
bawah ini memakai payload invalid/tanpa session sehingga tidak membuat atau mengubah record:

| Skenario | Ekspektasi | Hasil |
| --- | ---: | ---: |
| `GET /api/debug-guests` | 404 | 404 |
| `GET /api/admin/reservations` tanpa session | 401 | 401 |
| `GET /api/owner/users` tanpa session | 401 | 401 |
| `POST /api/public/reservations` dengan `{}` | 400 | 400 |
| `POST /api/webhooks/midtrans` dengan signature invalid | 401 | 401 |
| `GET /api/cron/reminders` dengan secret invalid | 401 | 401 |

## Skenario staging yang masih diperlukan

Skenario berikut tidak dijalankan terhadap environment saat ini karena dapat membuat atau
mengubah record nyata. Jalankan di staging dengan database disposable:

- Reservasi valid menghasilkan 201 dan satu record reservasi/payment yang sesuai.
- Payment Snap dapat dibuat dan status pembayaran dapat dibaca kembali.
- Webhook dengan signature Midtrans valid memperbarui payment tepat satu kali.
- Cron dengan secret valid menjalankan reminder tanpa duplikasi.
- Session admin yang kedaluwarsa diarahkan ke login dari browser sebenarnya.
- User admin ditolak saat membuka route owner, sedangkan owner dapat membuka route admin.

## Prasyarat audit yang belum tersedia

- Respons 429 backend belum dapat diuji sampai A4 rate limiting selesai.
- Respons 413 backend belum dapat diuji sampai A5 pembatasan payload selesai.

UI untuk kedua status tersebut sudah diuji. B3 baru dapat dinyatakan lulus penuh setelah
A4/A5 diterapkan dan dua skenario di atas dijalankan di staging.
