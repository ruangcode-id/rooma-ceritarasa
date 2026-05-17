"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RESTAURANT_SESSIONS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    label: "15:00 - 17:00",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    label: "17:30 - 19:30",
  },
  {
    id: "21d72603-76c5-423b-a4f5-58246455cdbe",
    label: "20:00 - 22:00",
  },
];

export default function ReservationFormPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const partySizeValue = formData.get("partySize") as string;
    const partySize = Number.parseInt(partySizeValue, 10);

    try {
      const response = await fetch("/api/public/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestName: formData.get("name"),
          guestPhone: formData.get("phone"),
          guestEmail: formData.get("email") || undefined,
          sessionId: formData.get("sessionId"),
          date: formData.get("date"),
          partySize: Number.isNaN(partySize) ? 2 : partySize,
          specialRequest: formData.get("specialRequest") || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Gagal membuat reservasi");
      }

      const { reservationId } = data.data;

      localStorage.setItem("reservationId", reservationId);
      localStorage.setItem("guestName", formData.get("name") as string);

      router.push(`/reservasi/payment?reservationId=${reservationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

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

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 p-6"
        >
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Nama
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                placeholder="Nama lengkap"
                name="name"
                minLength={2}
                required
              />
            </label>

            <label className="text-sm">
              Nomor HP
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                placeholder="08xxxxxxxx"
                name="phone"
                type="tel"
                minLength={8}
                required
              />
            </label>
          </div>

          <label className="text-sm">
            Email (opsional)
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="nama@email.com"
              name="email"
              type="email"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              Tanggal
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="date"
                required
              />
            </label>

            <label className="text-sm">
              Sesi
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="sessionId"
                required
                defaultValue={RESTAURANT_SESSIONS[0].id}
              >
                {RESTAURANT_SESSIONS.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Jumlah Tamu
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="partySize"
                required
                defaultValue="2"
              >
                <option value="2">2 Orang</option>
                <option value="4">4 Orang</option>
                <option value="6">6 Orang</option>
                <option value="8">8 Orang</option>
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

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? "Memproses..." : "Lanjut ke Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}