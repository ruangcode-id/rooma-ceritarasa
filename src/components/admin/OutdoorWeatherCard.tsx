"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Armchair,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type OutdoorStatusData = {
  isOpen: boolean;
  totalTables: number;
  activeTables: number;
  totalCapacity: number;
  activeCapacity: number;
  activeTodayBookingsCount?: number;
  affectedTableNumbers?: string[];
  tables: Array<{
    id: string;
    tableNumber: string;
    capacity: number;
    isActive: boolean;
  }>;
};

export function OutdoorWeatherCard() {
  const [status, setStatus] = useState<OutdoorStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetAction, setTargetAction] = useState<boolean>(false);
  // Guard: ensures createPortal only runs client-side (avoids SSR document.body reference)
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/tables/outdoor-toggle", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await handleApiError(res));
        const data = await res.json();
        if (data.success && isMounted) {
          setStatus(data.data);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleClick = () => {
    const newState = !isOpen;
    setTargetAction(newState);
    setShowConfirmModal(true);
  };

  const executeToggle = async () => {
    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tables/outdoor-toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: targetAction }),
      });
      if (!res.ok) throw new Error(await handleApiError(res));
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update status");

      setStatus(data.data);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUpdating(false);
    }
  };

  const isOpen = status ? status.isOpen : false;

  return (
    <>
      {/* Outdoor Seating Control Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          {/* Left: icon + label + description */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Icon */}
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
              {isLoading ? (
                <CircleNotch size={18} className="animate-spin" />
              ) : (
                <Armchair size={18} weight="fill" />
              )}
            </span>

            {/* Text info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-500">
                  Outdoor Seating Area
                </p>
                {!isLoading && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                      isOpen
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full transition-colors ${
                        isOpen ? "bg-green-500" : "bg-slate-400"
                      }`}
                    />
                    {isOpen ? "Open · 4 Tables · 16 Pax" : "Closed · Hidden from booking"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isLoading
                  ? "Checking outdoor seating status..."
                  : isOpen
                  ? "Tables OUT-1 to OUT-4 are active. Guests can select outdoor seating when making a reservation."
                  : "Outdoor tables are disabled and hidden from the guest reservation form."}
              </p>
            </div>
          </div>

          {/* Right: toggle switch */}
          <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 pt-4 sm:border-0 sm:pt-0">
            <span className="text-xs font-semibold text-slate-500 select-none">
              {isLoading ? "—" : isOpen ? "Enabled" : "Disabled"}
            </span>

            {/* Toggle Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isOpen}
              aria-label="Toggle outdoor seating area"
              onClick={handleToggleClick}
              disabled={isLoading || isUpdating}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f0609]/30 disabled:cursor-wait disabled:opacity-60 ${
                isOpen
                  ? "border-[#3a0d13]/40 bg-[#1f0609]"
                  : "border-slate-300 bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 block size-5.5 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  isOpen ? "left-[calc(100%-1.625rem)]" : "left-0.5"
                }`}
              />
              {isUpdating && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <CircleNotch
                    size={12}
                    className={`animate-spin ${isOpen ? "text-white" : "text-slate-500"}`}
                  />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            <WarningCircle size={15} weight="bold" className="shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* Confirmation Modal — rendered via Portal to escape overflow-y-auto scroll container */}
      {mounted && showConfirmModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <Armchair size={24} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-950">
                  {targetAction ? "Enable Outdoor Tables?" : "Disable Outdoor Tables?"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {targetAction
                    ? "All 4 outdoor tables (OUT-1–OUT-4 · 16 Pax) will be activated and immediately available for guests to select on the reservation form."
                    : "All 4 outdoor tables (OUT-1–OUT-4) will be deactivated and hidden from the reservation form."}
                </p>

                {/* Smart Warning: Active Bookings Today on Outdoor Tables */}
                {!targetAction && status?.activeTodayBookingsCount && status.activeTodayBookingsCount > 0 ? (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 text-left">
                    <WarningCircle size={17} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        Attention: {status.activeTodayBookingsCount} Active {status.activeTodayBookingsCount === 1 ? "Booking" : "Bookings"} Today
                      </p>
                      <p className="mt-0.5 leading-relaxed text-amber-800">
                        Outdoor table(s) ({status.affectedTableNumbers?.join(", ") || "OUT"}) have active reservations today. Please remember to reassign these guests to indoor seating.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isUpdating}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeToggle}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1f0609] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a0d13] disabled:opacity-60"
              >
                {isUpdating && <CircleNotch size={15} className="animate-spin" />}
                {isUpdating
                  ? "Processing..."
                  : targetAction
                  ? "Yes, Enable"
                  : "Yes, Disable"}
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
