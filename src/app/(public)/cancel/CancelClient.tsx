"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, WarningCircle, CircleNotch } from "@phosphor-icons/react";
import Link from "next/link";

export default function CancelReservationClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <WarningCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">Token Tidak Valid</h1>
        <p className="text-slate-600 mb-6">Link pembatalan yang Anda gunakan tidak valid atau tidak lengkap.</p>
        <Link href="/" className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelToken: token }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Gagal membatalkan reservasi");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <CheckCircle size={48} weight="fill" className="mx-auto text-green-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">Pembatalan Berhasil</h1>
        <p className="text-slate-600 mb-6">Reservasi Anda telah berhasil dibatalkan. Terima kasih telah mengabari kami.</p>
        <Link href="/reservasi" className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors inline-block">
          Buat Reservasi Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Batal Reservasi?</h1>
      <p className="text-slate-600 mb-8">
        Apakah Anda yakin ingin membatalkan reservasi Anda? Tindakan ini tidak dapat diurungkan dan meja Anda akan dilepas ke sistem publik.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex items-center justify-center gap-2 text-sm">
          <WarningCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full py-3 bg-[#1f0609] text-white rounded-md font-semibold hover:bg-[#3a0d13] transition-all disabled:opacity-70 flex justify-center items-center h-12"
        >
          {loading ? <CircleNotch size={20} className="animate-spin" /> : "Ya, Batalkan Reservasi"}
        </button>
        <Link 
          href="/" 
          className="w-full py-3 bg-white text-slate-700 border border-slate-300 rounded-md font-semibold hover:bg-slate-50 transition-all flex justify-center items-center"
        >
          Tidak, Kembali
        </Link>
      </div>
    </div>
  );
}
