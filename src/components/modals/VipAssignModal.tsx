"use client";

import { useState } from "react";
import { X, Crown, ShieldCheck, DownloadSimple } from "@phosphor-icons/react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Image from "next/image";
import type { GuestRow } from "@/components/admin/AdminVipClient";

type VipAssignModalProps = {
  guest: GuestRow;
  onClose: (wasAssigned: boolean) => void;
};

export default function VipAssignModal({ guest, onClose }: VipAssignModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [benefits, setBenefits] = useState("");
  
  // Track if we just successfully assigned VIP so we can show the card immediately
  const [newlyAssignedCard, setNewlyAssignedCard] = useState<GuestRow["vipCard"] | null>(null);

  const activeVipCard = newlyAssignedCard || guest.vipCard;
  const isVip = guest.isVip || !!newlyAssignedCard;

  const handleAssign = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/vip/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, benefits }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || "Gagal mendaftarkan VIP");
      }

      setNewlyAssignedCard(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose(!!newlyAssignedCard);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isVip ? "Kartu Member Digital" : "Daftar VIP"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="p-6">
          {!isVip ? (
            // ASSIGNMENT FORM
            <div className="space-y-6">
              <div className="rounded-2xl bg-amber-50 p-5 border border-amber-100 flex gap-4 items-start">
                <Crown size={32} weight="duotone" className="text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-amber-900">Tingkatkan ke VIP</h3>
                  <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    Anda akan mendaftarkan <strong>{guest.name}</strong> sebagai member VIP. Sistem akan meng-generate QR Code dan Token eksklusif.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Catatan Benefits / Keistimewaan Khusus (Opsional)
                </label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="Contoh: Bebas minimum spend di ruangan Private..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px]"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleAssign}
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="size-5" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} weight="bold" />
                    Proses Pendaftaran VIP
                  </>
                )}
              </button>
            </div>
          ) : (
            // DIGITAL CARD DISPLAY
            <div className="flex flex-col items-center">
              {/* Card UI */}
              <div className="w-full max-w-[320px] rounded-3xl bg-gradient-to-br from-[#2a080d] to-[#120205] p-1 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
                
                <div className="relative rounded-[22px] border border-white/10 bg-black/40 backdrop-blur-md p-6 flex flex-col h-[400px]">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white/60 text-[10px] font-bold tracking-[0.2em] uppercase">Rooma Ceritarasa</h4>
                      <p className="text-amber-400 font-serif italic mt-1 text-lg">VIP Member</p>
                    </div>
                    <Crown size={28} weight="fill" className="text-amber-400/80" />
                  </div>

                  <div className="mt-auto mb-6 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-inner mb-4 relative z-10">
                      {activeVipCard?.qrCodeUrl ? (
                        <Image 
                          src={activeVipCard.qrCodeUrl} 
                          alt="VIP QR Code" 
                          width={150} 
                          height={150} 
                          className="rounded-lg"
                          unoptimized
                        />
                      ) : activeVipCard?.token ? (
                        <Image 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${activeVipCard.token}`} 
                          alt="VIP QR Code Fallback" 
                          width={150} 
                          height={150} 
                          className="rounded-lg"
                          unoptimized
                        />
                      ) : (
                        <div className="w-[150px] h-[150px] bg-slate-100 flex items-center justify-center rounded-lg">
                          <LoadingSpinner />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-white font-semibold text-xl tracking-wide">{guest.name}</p>
                      <p className="text-white/50 text-xs font-mono tracking-widest mt-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 inline-block">
                        {activeVipCard?.token}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Actions */}
              <p className="text-slate-500 text-xs text-center mt-6 px-4">
                Kartu VIP digital telah aktif. Tamu dapat menunjukkan QR Code atau menyebutkan nomor seri Token saat berkunjung.
              </p>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
