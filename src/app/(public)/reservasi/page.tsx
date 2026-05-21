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

const RESTAURANT_TABLES = [
  {
    id: "76214d69-549f-4103-858d-be099cac84f0",
    label: "T01 - Kapasitas 6",
  },
];

const PARTY_SIZE_OPTIONS = [2, 3, 4, 5, 6];

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

    const tableIds = formData.getAll("tableIds").map(String);

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
          tableIds,
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
      localStorage.setItem("partySize", String(partySize));

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
                defaultValue="3"
              >
                {PARTY_SIZE_OPTIONS.map((partySize) => (
                  <option key={partySize} value={partySize}>
                    {partySize} Orang
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-medium">Pilih Meja</legend>

            <div className="mt-2 space-y-2">
              {RESTAURANT_TABLES.map((table) => (
                <label
                  key={table.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="tableIds"
                    value={table.id}
                    defaultChecked
                  />
                  <span>{table.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="text-sm">
            Permintaan Khusus
            <textarea
              className="mt-2 min-h-25 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="Contoh: Meja dekat jendela"
              name="specialRequest"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Kebijakan Reservasi
            </p>
            <div className="mt-3 space-y-1">
              <p>2 tamu: tanpa deposit.</p>
              <p>3-4 tamu: deposit Rp 150.000.</p>
              <p>5+ tamu: deposit Rp 300.000.</p>
              <p>10+ tamu: minimum order Rp 1.000.000.</p>
            </div>
          </div>

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