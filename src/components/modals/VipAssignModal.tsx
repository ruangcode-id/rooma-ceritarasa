"use client";

import { useState } from "react";
import { X, Crown, ShieldCheck, DownloadSimple, Copy, Check } from "@phosphor-icons/react";
import { downloadVipCardImage } from "@/lib/download-vip-card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Image from "next/image";
import type { GuestRow } from "@/components/admin/AdminVipClient";
import { handleApiError } from "@/lib/handle-api-error";

type VipAssignModalProps = {
  guest: GuestRow;
  onClose: (wasAssigned: boolean) => void;
};

export default function VipAssignModal({ guest, onClose }: VipAssignModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [benefits, setBenefits] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  
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
      if (!res.ok) throw new Error(await handleApiError(res));

      const payload = await res.json();
      if (!payload.success) {
        throw new Error(payload.error || "Failed to register VIP");
      }

      setNewlyAssignedCard(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A server error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose(!!newlyAssignedCard);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isVip ? "Digital Member Card" : "VIP Registration"}
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
                  <h3 className="font-bold text-amber-900">Upgrade to VIP</h3>
                  <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    You are about to register <strong>{guest.name}</strong> as a VIP member. The system will generate an exclusive QR Code and Token.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes / Special Benefits (Optional)
                </label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="Example: No minimum spend in the Private room..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-25"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleAssign}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3.5 px-6 shadow-md transition-all active:scale-98 text-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <LoadingSpinner className="size-5" />
                ) : (
                  <>
                    <ShieldCheck size={20} weight="bold" />
                    Process VIP Registration
                  </>
                )}
              </button>
            </div>
          ) : (
            // DIGITAL CARD DISPLAY
            <div className="flex flex-col items-center">
              {/* Landscape Card UI */}
              <div className="w-full aspect-[1.586/1] rounded-2xl bg-linear-to-br from-[#2a080d] via-[#150306] to-[#0a0103] p-5 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between text-left group">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
                
                {/* Card Content (Top) */}
                <div className="relative z-10 flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-white font-serif font-bold text-base sm:text-xl tracking-tight leading-none">
                      Rooma Ceritarasa
                    </h3>
                    <p className="text-white/40 text-[7px] sm:text-[9px] font-bold tracking-widest uppercase mt-1">
                      Exclusive VIP Membership
                    </p>
                  </div>
                  <span className="text-amber-400 font-serif italic font-bold text-sm sm:text-lg tracking-wider">
                    VIP MEMBER
                  </span>
                </div>

                {/* Card Content (Middle) - Centered Metallic Chip & Large QR Code */}
                <div className="relative z-10 my-auto flex items-center justify-between gap-3 py-1">
                  {/* Metallic Chip */}
                  <div className="w-9 h-6 sm:w-12 sm:h-8 rounded-lg bg-linear-to-br from-amber-200 via-amber-400 to-amber-700 border border-amber-100/40 shrink-0 shadow-md"></div>
                  
                  {/* Centered Barcode / QR Code Box */}
                  <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-2xl shrink-0 mx-auto">
                    {activeVipCard?.qrCodeUrl ? (
                      <Image 
                        src={activeVipCard.qrCodeUrl} 
                        alt="VIP QR Code" 
                        width={120} 
                        height={120} 
                        className="w-20 h-20 sm:w-28 sm:h-28 object-contain"
                        unoptimized
                      />
                    ) : activeVipCard?.token ? (
                      <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeVipCard.token}`} 
                        alt="VIP QR Code Fallback" 
                        width={120} 
                        height={120} 
                        className="w-20 h-20 sm:w-28 sm:h-28 object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-100 flex items-center justify-center rounded-lg">
                        <LoadingSpinner />
                      </div>
                    )}
                  </div>

                  {/* Spacer for symmetry */}
                  <div className="w-9 sm:w-12 shrink-0 opacity-0"></div>
                </div>

                {/* Card Content (Bottom) */}
                <div className="relative z-10 flex flex-col justify-end text-left pt-1">
                  <p className="text-[8px] sm:text-[10px] font-bold tracking-widest uppercase text-white/50 mb-0.5">
                    Specially Issued To
                  </p>
                  <h2 className="text-sm sm:text-xl font-bold text-white tracking-wider drop-shadow-md truncate uppercase">
                    {guest.name}
                  </h2>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col items-center gap-3 w-full">
                {/* Copy Token Code Box */}
                {activeVipCard?.token && (
                  <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VIP Token / Code</p>
                      <p className="font-mono text-slate-800 font-semibold truncate select-all">{activeVipCard.token}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(activeVipCard.token);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer active:scale-95"
                    >
                      {copiedToken ? (
                        <>
                          <Check size={16} weight="bold" className="text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} weight="bold" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <button
                  onClick={() =>
                    downloadVipCardImage({
                      guestName: guest.name,
                      token: activeVipCard?.token || "VIP-MEMBER",
                      qrCodeUrl: activeVipCard?.qrCodeUrl,
                      issuedAt: activeVipCard?.issuedAt,
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 shadow-md transition-all active:scale-95 text-sm cursor-pointer"
                >
                  <DownloadSimple size={20} weight="bold" />
                  Download VIP Card (PNG)
                </button>
                <p className="text-slate-500 text-xs text-center px-4">
                  Digital VIP card is active. Copy the code above for manual check-in if the scanner is unavailable.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
