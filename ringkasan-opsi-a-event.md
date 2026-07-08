# Ringkasan Pengerjaan: Redirect Event Request ke WhatsApp (Opsi A)

Dokumen ini merangkum seluruh perubahan yang telah dilakukan untuk mengubah alur pengajuan *Event* agar langsung dialihkan ke WhatsApp Admin, serta pembersihan total fitur *Event Request* dari sisi Backend (Database & Dashboard Admin).

## 1. Perubahan Frontend (Sisi Tamu)
- **File Diperbarui**:
  - `src/app/(public)/event/page.tsx`
  - `src/components/public/PublicEventsClient.tsx`
  - `src/components/public/EventRequestForm.tsx`
- **Detail Perubahan**:
  - Mengambil nomor WhatsApp restoran langsung dari `SettingsUseCase` di halaman utama publik.
  - Menghapus fetch/pemanggilan ke API backend (`/api/events/request`).
  - Mengubah logika *submit* form agar merakit data form (Nama, HP, Email, Jenis Acara, Tanggal, Pax, Preferensi Sesi, Kebutuhan Tambahan) menjadi teks terstruktur.
  - Mengarahkan tamu secara otomatis ke WhatsApp menggunakan URL `https://wa.me/` dengan teks yang sudah di-*encode*.

## 2. Pembersihan Dashboard Admin & API
- **File Diperbarui**:
  - `src/components/layout/AdminSidebar.tsx`
- **File/Folder Dihapus**:
  - Menghapus menu "Event Requests" dari sidebar Admin.
  - Menghapus keseluruhan halaman dashboard admin untuk event requests (`src/app/(admin)/admin/event-requests`).
  - Menghapus keseluruhan UI pelacakan status guest (`src/app/(public)/event/request/[accessToken]/page.tsx`).
  - Menghapus endpoint API (`src/app/api/events/request` & `src/app/api/admin/event-requests`).
  - Menghapus komponen `src/components/admin/EventOfferForm.tsx`.

## 3. Pembersihan Database & Service Backend
- **File Diperbarui**:
  - `prisma/schema.prisma`
  - `src/infrastructure/repositories/event.repository.ts`
  - `src/types/index.ts`
  - `src/infrastructure/notifications/guest-notification.service.ts`
  - `src/app/api/webhooks/midtrans/route.ts`
- **File/Folder Dihapus**:
  - `src/features/event/admin-event.service.ts`
  - `src/features/event/admin-event.validation.ts`
  - `src/features/event/public-event.service.ts`
  - `src/infrastructure/services/notification.service.ts`
  - `src/domain/event/notification.types.ts`
  - `src/application/use-cases/event/submit-event-request.usecase.ts`
- **Detail Perubahan Database & Refactoring**:
  - Menghapus model `EventRequest`, `EventOffer`, dan `EventPayment` berserta seluruh relasinya di Prisma Schema.
  - Menghapus logic *webhook* Midtrans yang sebelumnya memproses pembayaran DP/Lunas untuk pengajuan *Event*.
  - Membersihkan *Guest Notification Service* dari kode pengiriman template email dan pengingat WA yang bersangkutan dengan alur CRM event lama.
  - Memastikan *type definitions* (di `src/types/index.ts` dan `src/domain/event/types.ts`) bersih dari tipe data request yang dihapus.
  - Telah menjalankan `npx prisma generate` dan `npx prisma db push --accept-data-loss` untuk sinkronisasi Database.
  - Telah menjalankan validasi `npx tsc --noEmit` yang mengonfirmasi bahwa seluruh proyek terbebas dari error dependensi maupun impor file yang salah. 

**Status**: Siap di-commit dan push.
