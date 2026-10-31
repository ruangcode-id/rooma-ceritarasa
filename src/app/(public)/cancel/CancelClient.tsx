"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, WarningCircle, CircleNotch, WhatsappLogo } from "@phosphor-icons/react";
import Link from "next/link";

interface CancelReservationClientProps {
  whatsappNumber?: string;
}

export default function CancelReservationClient({
  whatsappNumber = "6285725539262",
}: CancelReservationClientProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanWa = whatsappNumber.replace(/[^0-9]/g, "");
  const waMessage = encodeURIComponent(
    "Halo Admin Rooma Ceritarasa, saya ingin menanyakan perihal perubahan jadwal (reschedule) untuk reservasi saya."
  );
  const waLink = `https://wa.me/${cleanWa}?text=${waMessage}`;

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <WarningCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">Token Tidak Valid</h1>
        <p className="text-slate-600 mb-6">Link pembatalan yang Anda gunakan tidak valid atau tidak lengkap.</p>
        <Link href="/" className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors inline-block">
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
    } catch {
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
        <p className="text-slate-600 mb-6">
          Reservasi Anda telah berhasil dibatalkan. Terima kasih telah mengabari kami.
        </p>
        <Link href="/reservasi" className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors inline-block">
          Buat Reservasi Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Batal Reservasi?</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Apakah Anda yakin ingin membatalkan reservasi Anda? Tindakan ini tidak dapat diurungkan dan meja Anda akan dilepas ke sistem publik.
      </p>

      {/* Non-refundable DP disclaimer alert */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 mb-6 text-left">
        <div className="flex items-start gap-3">
          <WarningCircle size={22} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold block text-sm mb-1 text-amber-950">Kebijakan DP Non-Refundable</span>
            Sesuai kebijakan Rooma Ceritarasa, uang muka (DP) yang telah dibayarkan <strong>bersifat non-refundable</strong> dan tidak dapat dikembalikan jika reservasi dibatalkan secara sepihak.
          </div>
        </div>
      </div>

      {/* CTA Reschedule via WhatsApp */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 mb-6 text-left">
        <div className="text-xs text-emerald-900 mb-3 leading-relaxed">
          <span className="font-bold block text-sm text-emerald-950 mb-1">Ingin Ganti Jadwal Saja?</span>
          Anda dapat melakukan <strong>reschedule</strong> (ganti tanggal atau sesi lain) maksimal H-1 tanpa kehilangan reservasi Anda. Hubungi tim admin kami via WhatsApp:
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white text-sm font-bold rounded-lg transition-colors shadow-xs"
        >
          <WhatsappLogo size={20} weight="fill" />
          Hubungi Admin via WhatsApp
        </a>
      </div>

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
          className="w-full py-3 bg-[#1f0609] text-white rounded-md font-semibold hover:bg-[#3a0d13] transition-all disabled:opacity-70 flex justify-center items-center h-12 text-sm"
        >
          {loading ? <CircleNotch size={20} className="animate-spin" /> : "Tetap Batalkan Reservasi (DP Hangus)"}
        </button>
        <Link 
          href="/" 
          className="w-full py-3 bg-white text-slate-700 border border-slate-300 rounded-md font-semibold hover:bg-slate-50 transition-all flex justify-center items-center text-sm"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
