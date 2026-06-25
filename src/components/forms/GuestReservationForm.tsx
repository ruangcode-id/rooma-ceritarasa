"use client";

import { useState } from "react";
import { format } from "date-fns";

interface GuestReservationFormProps {
  date: Date;
  sessionId: string;
  tableIds: string[];
  guestCount: number;
  onSuccess: () => void;
  onBack: () => void;
}

export function GuestReservationForm({ date, sessionId, tableIds, guestCount, onSuccess, onBack }: GuestReservationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      date: format(date, "yyyy-MM-dd"),
      sessionId,
      tableIds,
      partySize: guestCount,
      guestName: formData.get("guestName"),
      guestPhone: formData.get("guestPhone")?.toString().replace(/\D/g, ''),
      guestEmail: formData.get("guestEmail"),
      specialRequest: formData.get("specialRequest") || "",
    };

    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Add a simulated loading delay to improve UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Gagal membuat reservasi.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border-2 border-slate-900 p-6 md:p-10 w-full max-w-2xl mx-auto shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold uppercase tracking-widest text-slate-900 mb-8 text-center">Guest Details</h3>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8">
        <div>
          <label htmlFor="guestName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Nama Lengkap *
          </label>
          <input
            id="guestName"
            name="guestName"
            type="text"
            required
            className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 text-base text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300"
            placeholder="John Doe"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label htmlFor="guestPhone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              WhatsApp *
            </label>
            <input
              id="guestPhone"
              name="guestPhone"
              type="tel"
              required
              className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 text-base text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300"
              placeholder="08123456789"
            />
          </div>
          <div>
            <label htmlFor="guestEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Email (Opsional)
            </label>
            <input
              id="guestEmail"
              name="guestEmail"
              type="email"
              className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 text-base text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="specialRequest" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            id="specialRequest"
            name="specialRequest"
            rows={3}
            className="w-full border-2 border-slate-200 bg-transparent px-3 py-3 text-base text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300 resize-none"
            placeholder="Alergi, acara khusus, request tempat..."
          />
        </div>

        <div className="mt-6 flex flex-col-reverse md:flex-row gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-4 border-2 border-slate-900 text-slate-900 font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            Kembali
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 bg-slate-900 border-2 border-slate-900 text-white font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Konfirmasi"}
          </button>
        </div>
      </form>
    </div>
  );
}
