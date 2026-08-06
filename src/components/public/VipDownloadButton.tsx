"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { downloadVipCardImage } from "@/lib/download-vip-card";

type VipDownloadButtonProps = {
  guestName: string;
  token: string;
  tier?: string;
  qrCodeUrl?: string | null;
};

export function VipDownloadButton({
  guestName,
  token,
  tier,
  qrCodeUrl,
}: VipDownloadButtonProps) {
  return (
    <button
      onClick={() =>
        downloadVipCardImage({
          guestName,
          token,
          tier,
          qrCodeUrl,
        })
      }
      className="
        inline-flex items-center justify-center gap-2.5 w-full py-4 px-8 
        bg-slate-900 hover:bg-slate-800 
        text-white font-bold tracking-[0.2em] text-sm uppercase
        transition-all duration-300
        shadow-lg hover:shadow-xl
        hover:-translate-y-1 rounded-none cursor-pointer mb-3
      "
    >
      <DownloadSimple size={20} weight="bold" />
      Save / Download VIP Card (PNG)
    </button>
  );
}
