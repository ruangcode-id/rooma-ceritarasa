"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Crown, CircleNotch } from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

interface GuestReservationFormProps {
  date: Date;
  sessionId: string;
  tableIds: string[];
  guestCount: number;
  vipToken?: string;
  onSuccess: (result: CreateReservationResult) => void | Promise<void>;
  onBack: () => void;
}

type CreateReservationResult = {
  reservationId: string;
  guestId: string;
  status: string;
  tableIds: string[];
  expiresAt: string | null;
  cancelToken: string;
  paymentToken: string;
  checkInToken: string;
};

export function GuestReservationForm({ date, sessionId, tableIds, guestCount, vipToken, onSuccess, onBack }: GuestReservationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vipLoading, setVipLoading] = useState(!!vipToken);
  const [vipData, setVipData] = useState<{name: string} | null>(null);

  useEffect(() => {
    if (!vipToken) return;
    
    async function fetchVip() {
      try {
        const res = await fetch(`/api/public/vip/${vipToken}`);
        const data = await res.json();
        if (data.success && data.data) {
          setVipData({
            name: data.data.guestName,
          });
        }
      } catch (err) {
        console.error("Failed to fetch VIP:", err);
      } finally {
        setVipLoading(false);
      }
    }
    
    fetchVip();
  }, [vipToken]);

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
      vipToken,
    };

    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Add a simulated loading delay to improve UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!res.ok) {
        const errorMsg = await handleApiError(res);
        setError(errorMsg);
        return;
      }

      const data = await res.json();
      if (data.success) {
        await onSuccess(data.data as CreateReservationResult);
      } else {
        setError(data.error || "Gagal membuat reservasi.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border-2 border-slate-900 p-6 md:p-10 w-full max-w-2xl mx-auto shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold uppercase tracking-widest text-slate-900 mb-8 text-center">Guest Details</h3>
      
      {vipToken && (
        <div className="mb-8 p-4 bg-slate-900 text-white rounded-xl flex items-center gap-3 shadow-lg transform -translate-y-2">
          <Crown weight="fill" className="text-yellow-500 text-3xl" />
          <div>
            <p className="font-bold tracking-wider">VIP MEMBER RESERVATION</p>
            <p className="text-xs text-slate-300">Fast-track booking enabled. No deposit required.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {vipLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
          <CircleNotch className="animate-spin text-3xl" />
          <p className="text-sm font-semibold animate-pulse">Memuat data VIP...</p>
        </div>
      ) : (
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
            readOnly={!!vipData}
            defaultValue={vipData?.name}
            className={`w-full border-b-2 px-0 py-2 text-base outline-none transition-all ${vipData ? "border-transparent bg-slate-50 text-slate-500 px-3 rounded" : "border-slate-200 bg-transparent text-slate-900 focus:border-slate-900"} placeholder:text-slate-300`}
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
              className="w-full border-b-2 px-0 py-2 text-base outline-none transition-all border-slate-200 bg-transparent text-slate-900 focus:border-slate-900 placeholder:text-slate-300"
              placeholder="081234567890"
            />
          </div>
          <div>
            <label htmlFor="guestEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Email <span className="text-slate-400 normal-case font-normal">(Opsional)</span>
            </label>
            <input
              id="guestEmail"
              name="guestEmail"
              type="email"
              className="w-full border-b-2 px-0 py-2 text-base outline-none transition-all border-slate-200 bg-transparent text-slate-900 focus:border-slate-900 placeholder:text-slate-300"
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
      )}
    </div>
  );
}
