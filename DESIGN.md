# DESIGN.md — Rooma Ceritarasa Design System

> Dokumen ini mendeskripsikan design language, komponen visual, dan pola interaksi yang digunakan di seluruh aplikasi Rooma Ceritarasa. Semua halaman baru **wajib** mengikuti panduan ini.

---

## Filosofi Desain

Rooma Ceritarasa adalah restoran dengan konsep **"Refined Comfort Dish, Intimate Casual Dining"**. Desainnya harus mencerminkan:

- **Elegan tapi hangat** — bukan mewah yang kaku, tapi premium yang bisa dirasakan
- **Tenang dan immersive** — minim clutter, biarkan konten dan foto bicara
- **Responsive & alive** — animasi halus yang memberi feedback tanpa mengganggu

---

## Color Palette

Semua warna sudah di-define sebagai CSS custom properties di `src/app/globals.css` via `@theme {}`:

| Token | Nilai | Penggunaan |
|---|---|---|
| `--color-primary` | `#e63946` | CTA, badge aktif, aksen penting |
| `--color-primary-dark` | `#d62828` | Hover state pada primary |
| `--color-secondary` | `#f4a261` | Aksen hangat, highlight sekunder |
| `--color-dark` | `#1d3557` | Teks heading gelap |
| `--color-light` | `#f8f9fa` | Background terang/section |
| `--color-bg-dark` | `#0f172a` | Background dark mode |

### Penggunaan Warna

- Background umum halaman publik: `bg-white` atau `#fcfbf9` (off-white) untuk kesan bersih & lega (minimalist vibe).
- Background admin/dark: `bg-bg-dark` atau `bg-[#fcfbf9]` + `.bg-texture`
- Surface card pada dark: `.glass` utility class
- Teks utama: `text-slate-900` (light) / `text-gray-100` (dark)
- Teks sekunder/subtitle: `text-slate-500`, `text-gray-600`
- **Aksen (Merah/Orange):** Gunakan **sangat minimalis** hanya untuk tombol CTA utama, badge aktif, atau hover state, agar desain tetap terasa elegan dan tidak mendominasi.
- Aksen berbahaya/cancel: `text-red-500`, `bg-red-50`
- Aksen warning/expiry: `text-amber-600`

---

## Typography

### Font Utama

```css
--font-sans: 'Times New Roman Condensed', 'Times New Roman', Times, serif;
font-stretch: condensed;
```

Font ini memberikan karakter **editorial** yang khas. Gunakan konsisten di seluruh halaman.

### Skala Tipografi

| Ukuran | Class | Penggunaan |
|---|---|---|
| `text-xs` + `tracking-[0.25em]` + `uppercase` | Label/eyebrow text | Section subtitle, breadcrumb |
| `text-sm` | Body kecil | Deskripsi, meta info |
| `text-base` | Body utama | Konten paragraf |
| `text-xl` / `text-2xl` | Subheading | Card title, section header kecil |
| `text-3xl` / `text-4xl` | Heading halaman | H1 per page |

### Pola Heading Halaman

```tsx
<p className="text-xs uppercase tracking-[0.25em] text-slate-500">Section Name</p>
<h1 className="mt-2 text-3xl font-semibold">Page Title</h1>
<p className="mt-2 text-sm text-slate-600">Deskripsi singkat.</p>
```

---

## Layout & Spacing

### Container

```tsx
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
```

- Max width: `max-w-7xl`
- Padding horizontal: responsive `px-4 sm:px-6 lg:px-8`

### Grid Layout Admin

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
```

- Gunakan grid 3 kolom untuk halaman admin yang lebar
- Gap antar kolom: `gap-6` (kompak) atau `gap-12` (spacious)

### Section Spacing

- **Negative Space (Penting):** Berikan ruang bernapas yang ekstra lega antar elemen untuk mencapai estetika *minimalist premium*.
- Padding atas/bawah section publik: `py-32` (ekstra lega) atau minimal `py-24`.
- Padding atas/bawah admin: `py-10`
- Margin bawah antar elemen section: `mb-12` (jarak heading ke konten) atau `mb-8`.

---

## Komponen Visual

### Card / Panel

```tsx
// Light mode (publik)
<section className="rounded-2xl border border-slate-200 p-5">

// Dark mode / glass (admin)
<section className="glass rounded-xl p-6">
```

### Badge Status

```tsx
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
  {status}
</span>
```

Warna badge berdasarkan status:
| Status | Background | Teks |
|---|---|---|
| `confirmed` | `bg-green-100` | `text-green-700` |
| `pending` | `bg-amber-100` | `text-amber-700` |
| `cancelled` | `bg-red-100` | `text-red-700` |
| `checked_in` | `bg-blue-100` | `text-blue-700` |
| `no_show` | `bg-slate-100` | `text-slate-500` |

### Tombol

```tsx
// Primary (CTA utama)
<button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
  Aksi
</button>

// Primary merah (untuk publik)
<button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
  Reservasi
</button>

// Secondary / outline
<button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
  Reset
</button>

// Destructive
<button className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100">
  Hapus
</button>
```

### Input & Form

```tsx
<input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
<select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
```

### Tabel Admin

```tsx
<section className="overflow-hidden rounded-2xl border border-slate-200">
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
        <tr><th className="px-4 py-3">Kolom</th></tr>
      </thead>
      <tbody>
        <tr className="border-t border-slate-100 align-top">
          <td className="px-4 py-4">Data</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

---

## Animasi & Interaksi

### Utility Classes (sudah di-define di `globals.css`)

| Class | Efek |
|---|---|
| `.animate-fade-in-up` | Fade + slide up saat mount (1.2s cubic-bezier) |
| `.reveal` + `.reveal.active` | Scroll-triggered fade + slide up (pakai IntersectionObserver) |
| `.glass` | Glassmorphism card — `backdrop-blur` + border transparan |
| `.bg-texture` | Overlay noise SVG halus di background |
| `.mask-edge-fading` | Horizontal fading mask (untuk horizontal scroll/slider) |

### Hover Effects

- Tombol: `hover:scale-105`, `transition-all duration-300`
- Social icon: `hover:scale-110 hover:bg-primary hover:text-white`
- List item: `hover:translate-x-2 transition-transform duration-300`
- Card: `hover:shadow-2xl transition-shadow duration-500`

### Parallax (Gallery)

Gunakan CSS custom property `--px` + `will-change-transform` untuk parallax yang performan:
```tsx
style={{ '--px': '0px' } as React.CSSProperties}
className="translate-x-(--px) will-change-transform"
```

---

## Hero Section

```
[ VIDEO BACKGROUND full-screen ]
       ↓ fixed / sticky
[ Overlay gradient from-black/60 via-black/10 to-black/30 ]
[ CTA button — glassmorphism, centered ]
```

- Video: harus tersedia versi `.mp4` / `.webm` di `public/assets/`
- CTA di-centering dengan `grid place-items-center`
- Button style: glassmorphism (`bg-white/15`, `backdrop-blur-md`, `border-white/30`)

---

## Halaman Publik — Layout Standar

Layout dipertahankan ringkas tanpa banyak section, berfokus pada ruang lapang (*negative space*).

```
[ Navbar (transparent -> solid) ]
[ Hero Section — full screen video ]
[ Section Info — dengan reveal animation & padding besar (py-32) ]
[ Gallery — horizontal scroll + parallax ]
[ Footer — 3 kolom: Brand | Contact | Session Times ]
```

---

## Halaman Reservasi — Layout Booking (Sevenrooms Style)

Fokus utama halaman ini adalah **fungsionalitas murni** tanpa distraksi.

```
[ Navbar (Solid / bersih) ]
[ Background: bg-slate-50 atau bg-white polos ]
[ Centered Card (max-w-3xl) — Menampung Wizard Booking ]
  ├── Step 1: Pilih Jumlah Tamu & Tanggal (Kalender ringkas)
  ├── Step 2: Pilih Jam (Grid ketersediaan sesi)
  └── Step 3: Isi Data Diri & Konfirmasi (Form minimalis)
[ Footer (Ringkas) ]
```

- **Clean UI:** Hindari gambar hero promo atau elemen grafis besar di halaman ini. Biarkan pengguna fokus menyelesaikan *booking*.
- **Progressive Disclosure:** Tampilkan form secara bertahap (*step-by-step*) di dalam satu *card* agar pengguna tidak merasa kewalahan melihat form panjang.

---

## Halaman Admin — Layout Standar

```
[ Sidebar navigasi (akan dibuat Sprint 4) ]
[ Main content area ]
  ├── Header: eyebrow text + H1 + description
  ├── Filter panel — rounded-2xl border
  ├── Tabel data — rounded-2xl border overflow-x-auto
  └── Modal / Drawer untuk form/detail
```

---

## Icons

Gunakan [`@phosphor-icons/react`](https://phosphoricons.com/) yang sudah terpasang:

```tsx
import { MapPin, Phone, InstagramLogo, WhatsappLogo } from '@phosphor-icons/react';
<MapPin size={18} weight="fill" className="text-primary" />
```

---

## Asset Path Convention

```
public/
├── assets/
│   ├── hero.mov          # Video hero (tambah .mp4/.webm)
│   ├── hero.mp4          # ← Wajib ada untuk cross-browser
│   ├── logo_no_background.png
│   ├── slider1.webp      # Gallery images
│   ├── slider2.webp
│   └── ...
```

---

## Dos & Don'ts

| ✅ Lakukan | ❌ Hindari |
|---|---|
| Gunakan CSS token (`text-primary`, `bg-primary`) | Hard-code warna hex langsung di JSX |
| Gunakan `rounded-xl` atau `rounded-2xl` untuk cards | `rounded-md` atau `rounded` saja |
| Animasi dengan `transition-all duration-300` | Animasi abrupt tanpa transition |
| `font-semibold` untuk label/heading | `font-bold` (terlalu tebal untuk serif condensed) |
| Komponen kecil, fokus, reusable | Satu komponen 500+ baris |
| `next/image` untuk gambar statis | Tag `<img>` HTML native langsung |
| Semantic HTML (`<section>`, `<article>`, `<nav>`) | Semua `<div>` |
