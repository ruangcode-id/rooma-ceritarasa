"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Armchair,
  CircleNotch,
  WarningCircle,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type OutdoorStatusData = {
  isOpen: boolean;
  totalTables: number;
  activeTables: number;
  totalCapacity: number;
  activeCapacity: number;
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

  const handleToggleClick = (newStatus: boolean) => {
    setTargetAction(newStatus);
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

  const isOpen = status ? status.isOpen : true;

  return (
    <>
      {/* Outdoor Seating Control Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* Left: icon + label + description */}
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
              {isLoading ? (
                <CircleNotch size={18} className="animate-spin" />
              ) : (
                <Armchair size={18} weight="fill" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-500">
                  Outdoor Seating Area
                </p>
                {!isLoading && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                      isOpen
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        isOpen ? "bg-green-600" : "bg-slate-400"
                      }`}
                    />
                    {isOpen ? "Active (4 Tables · 16 Pax)" : "Inactive (Hidden)"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isLoading
                  ? "Checking outdoor seating status..."
                  : isOpen
                  ? "4 outdoor tables (OUT-1–OUT-4 · 16 Pax) are currently active and available for guest reservations."
                  : "Outdoor tables are currently disabled and hidden from the guest reservation form."}
              </p>
            </div>
          </div>

          {/* Right: action button */}
          <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 pt-4 sm:border-0 sm:pt-0">
            {isOpen ? (
              <button
                type="button"
                onClick={() => handleToggleClick(false)}
                disabled={isLoading || isUpdating}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                <XCircle size={17} />
                Disable Outdoor Tables
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleClick(true)}
                disabled={isLoading || isUpdating}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                <CheckCircle size={17} />
                Enable Outdoor Tables
              </button>
            )}
          </div>
        </div>

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
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <Armchair size={24} weight="fill" />
              </span>

              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {targetAction ? "Enable Outdoor Tables?" : "Disable Outdoor Tables?"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {targetAction
                    ? "All 4 outdoor tables (OUT-1–OUT-4 · 16 Pax) will be activated and immediately available for guests to select on the reservation form."
                    : "All 4 outdoor tables (OUT-1–OUT-4) will be deactivated and hidden from the reservation form."}
                </p>
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
