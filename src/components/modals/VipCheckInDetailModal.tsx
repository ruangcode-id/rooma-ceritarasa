"use client";

import { Crown, X, Clock, User, MapPinLine, NotePencil, ArrowRight } from "@phosphor-icons/react";
import { format } from "date-fns";
import { enUS as localeId } from "date-fns/locale";
import Link from "next/link";
import type { NotificationItem } from "@/hooks/useNotifications";

type VipCheckInDetailModalProps = {
  notification: NotificationItem;
  onClose: () => void;
};

export default function VipCheckInDetailModal({
  notification,
  onClose,
}: VipCheckInDetailModalProps) {
  // Extract guest name from body (Format: "Kedatangan Tamu VIP · GuestName (Silakan...)")
  let guestName = "VIP Guest";
  if (notification.body?.includes("·")) {
    const parts = notification.body.split("·");
    if (parts[1]) {
      guestName = parts[1].split("(")[0]?.trim() || "VIP Guest";
    }
  }

  const formattedDate = format(
    new Date(notification.createdAt),
    "EEEE, dd MMMM yyyy 'at' HH:mm:ss",
    { locale: localeId }
  );

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 border border-amber-200">
        {/* Top Gold Header */}
        <div className="relative bg-linear-to-br from-[#2a080d] via-[#150306] to-[#0a0103] px-6 py-6 text-white overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Crown size={24} weight="fill" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  VIP Arrival Detail
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  VIP Check-in Log
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Guest Name Banner */}
          <div className="flex items-center gap-3.5 rounded-2xl bg-amber-50 p-4 border border-amber-200/70">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-lg shadow-sm">
              <User size={24} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
                VIP Guest Name
              </p>
              <h4 className="text-base font-bold text-amber-950 truncate">
                {guestName}
              </h4>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3.5 text-sm">
            {/* Check-in Time */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <Clock size={20} weight="duotone" className="text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Check-in Time</p>
                <p className="font-semibold text-slate-900 mt-0.5">{formattedDate}</p>
              </div>
            </div>

            {/* Destination Table / Area */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <MapPinLine size={20} weight="duotone" className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Target Area / Seating</p>
                <p className="font-semibold text-amber-900 mt-0.5">VIP Area / Private Room</p>
              </div>
            </div>

            {/* Notification Log Summary */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <NotePencil size={20} weight="duotone" className="text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500">System Log Message</p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {notification.body}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {notification.relatedId && (
              <Link
                href={`/admin/vip?vipGuest=${notification.relatedId}`}
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 shadow-sm transition-all text-xs cursor-pointer"
              >
                <span>View Member Profile</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 transition-colors text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
