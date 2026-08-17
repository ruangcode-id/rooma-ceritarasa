"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  CloudRain,
  CircleNotch,
  CheckCircle,
  WarningCircle,
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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
        {/* Subtle decorative background glow */}
        <div
          className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-all duration-700 ${
            isOpen ? "bg-amber-100/60" : "bg-sky-100/70"
          }`}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left info */}
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                isOpen
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-sky-600/10 text-sky-700"
              }`}
            >
              {isOpen ? (
                <Sun size={24} weight="fill" />
              ) : (
                <CloudRain size={24} weight="fill" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Outdoor Seating Area
                </h3>
                {isLoading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <CircleNotch size={12} className="animate-spin" /> Checking...
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isOpen
                        ? "bg-green-100 text-green-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {isOpen ? (
                      <>
                        <CheckCircle size={12} weight="fill" /> ☀️ Outdoor Open
                      </>
                    ) : (
                      <>
                        <CloudRain size={12} weight="fill" /> 🌧️ Rainy Mode Active
                      </>
                    )}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">
                {isOpen
                  ? "Cuaca cerah. 4 Meja Outdoor (OUT-1 s/d OUT-4 • 16 Pax) aktif & dapat dipesan oleh tamu."
                  : "Hujan / Cuaca buruk. 4 Meja Outdoor dinonaktifkan & disembunyikan otomatis dari form reservasi tamu."}
              </p>
            </div>
          </div>

          {/* Right action button */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {isOpen ? (
              <button
                type="button"
                onClick={() => handleToggleClick(false)}
                disabled={isLoading || isUpdating}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs disabled:opacity-50"
                title="Aktifkan mode hujan untuk menutup sementara meja outdoor"
              >
                <CloudRain size={16} weight="bold" />
                Aktifkan Rainy Mode
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleClick(true)}
                disabled={isLoading || isUpdating}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50"
                title="Buka kembali meja outdoor saat cuaca membaik"
              >
                <Sun size={16} weight="bold" />
                Buka Area Outdoor
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
            <WarningCircle size={15} weight="bold" className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3.5 ${
                  targetAction
                    ? "bg-amber-100 text-amber-600"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {targetAction ? (
                  <Sun size={28} weight="fill" />
                ) : (
                  <CloudRain size={28} weight="fill" />
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                {targetAction ? "Buka Area Meja Outdoor?" : "Aktifkan Rainy Mode?"}
              </h3>

              <p className="text-xs text-slate-500 leading-relaxed">
                {targetAction
                  ? "Semua 4 meja outdoor (OUT-1 s/d OUT-4 • 16 Pax) akan kembali aktif dan langsung dapat dipilih oleh tamu pada form reservasi."
                  : "Semua 4 meja outdoor (OUT-1 s/d OUT-4) akan dinonaktifkan dan disembunyikan dari form reservasi tamu untuk mencegah overbooking saat hujan."}
              </p>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isUpdating}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeToggle}
                disabled={isUpdating}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 ${
                  targetAction
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-sky-700 hover:bg-sky-800"
                }`}
              >
                {isUpdating && (
                  <CircleNotch size={14} className="animate-spin" />
                )}
                {isUpdating
                  ? "Memproses..."
                  : targetAction
                  ? "Ya, Buka Outdoor"
                  : "Ya, Tutup Outdoor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
