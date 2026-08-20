import type { NextConfig } from "next";

// HTTP Security Headers — berlaku di semua route (Vercel & VPS)
const securityHeaders = [
  // Cegah clickjacking: halaman tidak boleh di-embed di iframe dari situs lain
  { key: "X-Frame-Options", value: "DENY" },
  // Cegah browser menebak tipe file (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Batasi info referrer saat pengguna klik link ke situs lain
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nonaktifkan fitur browser sensitif yang tidak digunakan aplikasi ini
  // Catatan: payment sengaja tidak diblokir agar Midtrans Snap bisa berjalan normal
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Paksa HTTPS selalu digunakan (HSTS) — hanya aktif bila sudah pakai HTTPS
  // max-age=63072000 = 2 tahun; includeSubDomains agar subdomain ikut terlindungi
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/**
 * Header khusus halaman reservasi & event payment.
 * Midtrans Snap membuat iframe di atas halaman kita.
 * Agar tombol "Download QRIS" di dalam iframe Snap bisa berfungsi,
 * kita perlu mengizinkan download dari cross-origin iframe (Midtrans).
 * Referensi: https://developer.chrome.com/blog/iframe-credentialless/#downloads
 */
const paymentPageHeaders = [
  ...securityHeaders.filter((h) => h.key !== "Permissions-Policy"),
  {
    key: "Permissions-Policy",
    // payment=* → izinkan Payment Request API (dipakai Midtrans)
    // downloads=* → izinkan download yang dipicu dari iframe cross-origin (tombol Download QRIS)
    value: "camera=(), microphone=(), geolocation=(), payment=*, downloads=*",
  },
];

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [400, 512, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 450, 512],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  async headers() {
    return [
      {
        // Header relaks khusus halaman pembayaran — Midtrans Snap + Download QRIS
        source: "/(reservasi|event/:path*)",
        headers: paymentPageHeaders,
      },
      {
        // Header ketat untuk semua route lain
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
