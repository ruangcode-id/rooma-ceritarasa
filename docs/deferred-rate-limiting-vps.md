# [DEFERRED] Urutan #3: Rate Limiting & Payload Limit

**Status:** Ditangguhkan — akan dikerjakan saat project dipindahkan ke VPS pribadi.
**Dibuat:** 12 Juli 2026
**Branch target (nanti):** ``fix/api-payload-handling``, ``feat/reservation-core``, lalu merge ke ``develop``

---

## Latar Belakang

Pekerjaan ini ditunda karena implementasi terbaik **berbeda tergantung platform**:

- **Di Vercel (Serverless):** Memerlukan solusi eksternal (misalnya Upstash Redis) karena tiap request bisa ditangani oleh instance server yang berbeda. In-memory counter tidak bisa diandalkan.
- **Di VPS (Persistent Server):** Bisa memanfaatkan Nginx secara langsung, yang jauh lebih efisien dan **gratis** tanpa dependency tambahan.

---

## Rencana Implementasi di VPS (Nanti)

### Lapisan 1: Nginx (Diutamakan)

```nginx
limit_req_zone $binary_remote_addr zone=api_public:10m rate=10r/m;

location /api/public/ {
    limit_req zone=api_public burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://localhost:3000;
}

client_max_body_size 100k;
```

Efek:
- Setiap IP hanya bisa 10 request per menit ke endpoint publik.
- Payload di atas 100KB ditolak dengan status 413.

### Lapisan 2: Kode Next.js (Defense-in-depth)

Buat file: ``src/lib/request-guards.ts``

```typescript
const MAX_PAYLOAD_BYTES = 100 * 1024; // 100KB

export function checkPayloadSize(req: Request): Response | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({ success: false, error: "Payload too large." }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}
```

Terapkan di: ``src/app/api/public/reservations/route.ts``

---

## Definition of Done (Saat Nanti Dikerjakan)

- [ ] Nginx ``limit_req_zone`` aktif dan terbukti mengembalikan 429 saat dispam.
- [ ] Nginx ``client_max_body_size`` aktif dan mengembalikan 413 untuk payload besar.
- [ ] Helper ``src/lib/request-guards.ts`` dibuat sebagai lapisan backup.
- [ ] Diterapkan minimal di ``POST /api/public/reservations``.
- [ ] Request reservasi normal (payload valid, tidak spam) tetap berhasil (201).
- [ ] ``npm run lint`` dan ``npm run build`` lulus.

---

## Referensi

- Dokumen utama: ``docs/rekomendasi-pengerjaan-audit-keamanan-dev-a-dev-b.md`` (A4 & A5)
- Nginx rate limiting docs: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
