import Link from "next/link";

export default function ReservationFormPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Reservasi Publik
          </p>
          <h1 className="text-3xl font-semibold">Form Reservasi</h1>
          <p className="text-sm text-slate-600">
            Isi data singkat untuk membuat reservasi.
          </p>
        </header>

        <form className="mt-8 space-y-5 rounded-2xl border border-slate-200 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Nama
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                placeholder="Nama lengkap"
                name="name"
              />
            </label>
            <label className="text-sm">
              Nomor HP
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                placeholder="08xxxxxxxx"
                name="phone"
              />
            </label>
          </div>
          <label className="text-sm">
            Email (opsional)
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="nama@email.com"
              name="email"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              Tanggal
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="date"
              />
            </label>
            <label className="text-sm">
              Sesi
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="session"
              >
                <option>Lunch 12:00 - 14:00</option>
                <option>Afternoon 15:00 - 17:00</option>
                <option>Dinner 18:00 - 21:00</option>
              </select>
            </label>
            <label className="text-sm">
              Jumlah Tamu
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="partySize"
              >
                <option>2 Orang</option>
                <option>4 Orang</option>
                <option>6 Orang</option>
                <option>8 Orang</option>
              </select>
            </label>
          </div>
          <label className="text-sm">
            Permintaan Khusus
            <textarea
              className="mt-2 min-h-[100px] w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="Contoh: Meja dekat jendela"
              name="specialRequest"
            />
          </label>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">
              Dengan melanjutkan, kamu setuju dengan kebijakan reservasi.
            </p>
            <Link
              href="/reservasi/payment"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Lanjut ke Pembayaran
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
