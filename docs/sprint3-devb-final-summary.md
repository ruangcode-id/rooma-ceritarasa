# Sprint 3 Dev B Final Summary — VIP, Gallery, Career API

## Branch

`feat/sprint3-devb-vip-gallery-career`

## Commit Terakhir

`f0f11b1 feat: add sprint 3 dev b career application api`

## Ringkasan Fitur Selesai

- VIP Card System
- Gallery Management
- Career Job Listings
- Career Apply + CV Upload
- Resend Email fallback

## Endpoint Selesai

### VIP

- `POST /api/admin/vip/assign`
- `GET /api/admin/vip`
- `GET /api/vip/[token]`

### Gallery

- `POST /api/admin/gallery`
- `GET /api/admin/gallery`
- `PUT /api/admin/gallery/[id]`
- `DELETE /api/admin/gallery/[id]`
- `GET /api/gallery`

### Career Jobs

- `POST /api/admin/careers`
- `GET /api/admin/careers`
- `GET /api/admin/careers/[id]`
- `PUT /api/admin/careers/[id]`
- `DELETE /api/admin/careers/[id]`
- `GET /api/careers`
- `GET /api/careers/[id]`

### Career Applications

- `POST /api/careers/[id]/apply`
- `GET /api/admin/careers/applications`
- `GET /api/admin/careers/applications/[id]`

## Testing Summary

- VIP assign sukses.
- Duplicate VIP untuk guest yang sama ditolak.
- Public VIP token sukses.
- Public VIP endpoint tidak expose phone, email, atau guestId internal.
- Gallery upload sukses.
- Gallery update sukses.
- Gallery soft delete sukses.
- Public gallery hanya image aktif.
- Upload gallery tanpa image ditolak.
- Upload gallery non-image ditolak.
- Public gallery tidak expose `publicId`.
- Career job create/list/detail/update/close sukses.
- Public career list hanya menampilkan job `isOpen=true`.
- Public career detail untuk closed job return 404 dengan pesan `Lowongan tidak ditemukan atau sudah ditutup.`.
- Admin career detail tetap bisa melihat job closed.
- Apply lamaran sukses.
- CV upload Cloudinary sukses dengan `resourceType: raw` ke folder `rooma/careers/cv`.
- CareerApplication tersimpan ke database dengan status default `NEW`.
- Admin applications list/detail sukses.
- Apply closed job ditolak.
- Apply tanpa CV ditolak.
- Apply non-PDF ditolak.
- Resend fallback sukses: jika env email belum lengkap, application tetap tersimpan dan response berisi warning email tidak dikirim.
- DB check sukses:
  - `vip_cards`: 1 row
  - `gallery_images`: 2 rows
  - `career_jobs`: 2 rows
  - `career_applications`: 1 row

## Env Production

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CAREER_ADMIN_EMAIL`
- `NEXT_PUBLIC_APP_URL` jika dipakai untuk QR/public URL

## Catatan Production

- Cloudinary wajib diisi agar gallery dan CV upload berjalan.
- Resend wajib diisi agar email benar-benar terkirim.
- Jika Resend belum lengkap, apply lamaran tetap tersimpan, tetapi email tidak dikirim.
- Jangan commit `.env`, `.env.local`, atau secret.
- Pastikan session/admin auth aktif di production.

## Final Validation

- `git status`: clean sebelum dokumentasi dibuat.
- `npx prisma validate`: passed.
- `npx prisma migrate status`: database schema up to date.
- `npx prisma generate`: passed.
- `npm run build`: passed.
- `npm run lint`: masih gagal karena existing lint issue di luar scope Dev B, tetapi `npm run build` berhasil.

## Status Akhir

Dev B Sprint 3 aman untuk dibuat Pull Request ke `develop` setelah dokumentasi final ini direview dan dicommit. Tidak ada perubahan schema atau migration pada Tahap 7.
