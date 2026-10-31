"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CalendarCheck,
  Clock,
  Users,
  Note,
  CheckCircle,
  Prohibit,
  XCircle,
  Crown,
  UserFocus,
  CalendarPlus,
  WarningCircle,
  Check,
} from "@phosphor-icons/react";
import { StatusBadge, type StatusBadgeOption } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { handleApiError } from "@/lib/handle-api-error";

type DetailReservation = {
  id: string;
  status: string;
  partySize: number;
  date: string;
  specialRequest?: string | null;
  createdAt: string;
  checkInTokenExpiresAt: string | null;
  graceExtensionMinutes: number;
  guest: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
    isVip?: boolean;
  };
  session: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  reservationTables: {
    table: {
      id: string;
      tableNumber: string | number;
      capacity: number;
    };
  }[];
};

type AvailableSession = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

type AvailableTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
};

const reservationStatuses: Array<StatusBadgeOption<string>> = [
  { id: "pending", label: "Pending", className: "bg-amber-100 text-amber-700", Icon: Clock },
  { id: "confirmed", label: "Confirmed", className: "bg-blue-100 text-blue-700", Icon: CalendarCheck },
  { id: "checked_in", label: "Checked-in", className: "bg-green-100 text-green-700", Icon: CheckCircle },
  { id: "no_show", label: "No-Show", className: "bg-slate-100 text-slate-600", Icon: Prohibit },
  { id: "cancelled", label: "Cancelled", className: "bg-red-100 text-red-700", Icon: XCircle },
];

export default function AdminReservationDetailModal({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [data, setData] = useState<DetailReservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExtending, setIsExtending] = useState(false);
  const [showConfirmExtend, setShowConfirmExtend] = useState(false);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSessionId, setRescheduleSessionId] = useState("");
  const [rescheduleTableIds, setRescheduleTableIds] = useState<string[]>([]);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`);
      if (!res.ok) throw new Error(await handleApiError(res));

      const payload = await res.json();
      if (!payload.success) {
        throw new Error(payload.error || "Gagal memuat rincian reservasi");
      }
      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error unknown");
    } finally {
      setIsLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleClose = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("detail");
    router.replace(currentUrl.pathname + currentUrl.search);
  };

  const handleExtendGrace = async () => {
    setIsExtending(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/extend-grace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: 15 }),
      });
      if (!res.ok) throw new Error(await handleApiError(res));
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error || "Failed to extend time");

      router.refresh();
      handleClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error unknown");
    } finally {
      setIsExtending(false);
      setShowConfirmExtend(false);
    }
  };

  // Start Reschedule Mode
  const handleStartReschedule = () => {
    if (!data) return;
    const initialDate = new Date(data.date).toISOString().split("T")[0];
    setRescheduleDate(initialDate);
    setRescheduleSessionId(data.session.id);
    setRescheduleTableIds(data.reservationTables.map((rt) => rt.table.id));
    setRescheduleError("");
    setRescheduleSuccess(false);
    setIsRescheduling(true);
  };

  // Fetch Sessions when Reschedule Date changes
  useEffect(() => {
    if (!isRescheduling || !rescheduleDate) return;
    setLoadingSessions(true);
    fetch(`/api/public/sessions?date=${rescheduleDate}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          setAvailableSessions(payload.data);
          if (!payload.data.some((s: AvailableSession) => s.id === rescheduleSessionId)) {
            if (payload.data.length > 0) {
              setRescheduleSessionId(payload.data[0].id);
            } else {
              setRescheduleSessionId("");
            }
          }
        } else {
          setAvailableSessions([]);
          setRescheduleSessionId("");
        }
      })
      .catch(() => setAvailableSessions([]))
      .finally(() => setLoadingSessions(false));
  }, [isRescheduling, rescheduleDate, rescheduleSessionId]);

  // Fetch Tables when Date or Session changes
  useEffect(() => {
    if (!isRescheduling || !rescheduleDate || !rescheduleSessionId) return;
    setLoadingTables(true);
    fetch(`/api/public/tables?date=${rescheduleDate}&sessionId=${rescheduleSessionId}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          const sorted = [...payload.data].sort((a, b) =>
            a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: "base" })
          );
          setAvailableTables(sorted);
        } else {
          setAvailableTables([]);
        }
      })
      .catch(() => setAvailableTables([]))
      .finally(() => setLoadingTables(false));
  }, [isRescheduling, rescheduleDate, rescheduleSessionId]);

  const toggleRescheduleTable = (tableId: string) => {
    setRescheduleTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const selectedTotalCapacity = availableTables
    .filter((t) => rescheduleTableIds.includes(t.id))
    .reduce((sum, t) => sum + t.capacity, 0);

  const handleSubmitReschedule = async () => {
    if (!rescheduleDate || !rescheduleSessionId || rescheduleTableIds.length === 0) {
      setRescheduleError("Silakan pilih tanggal, sesi, dan minimal 1 meja.");
      return;
    }
    if (data && selectedTotalCapacity < data.partySize) {
      setRescheduleError(
        `Kapasitas meja (${selectedTotalCapacity} orang) tidak mencukupi untuk jumlah tamu (${data.partySize} orang).`
      );
      return;
    }

    setIsSubmittingReschedule(true);
    setRescheduleError("");
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: rescheduleDate,
          sessionId: rescheduleSessionId,
          tableIds: rescheduleTableIds,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Gagal mengubah jadwal reservasi.");
      }

      setRescheduleSuccess(true);
      await fetchDetail();
      router.refresh();
      setTimeout(() => {
        setIsRescheduling(false);
        setRescheduleSuccess(false);
      }, 1000);
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal Box */}
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Reservation Details</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner className="size-10 border-4" />
              <p className="mt-4 text-sm text-slate-500">Loading details...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-red-600">
              <p className="font-semibold">Oops! Something went wrong.</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{data.guest.name}</h3>
                    {data.guest.isVip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                        <Crown size={12} weight="fill" />
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-500 mt-1">{data.guest.phone}</p>
                  {data.guest.email && <p className="text-sm text-slate-400">{data.guest.email}</p>}
                </div>
                <StatusBadge status={data.status} statuses={reservationStatuses} />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <CalendarCheck size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(data.date), "dd MMM yyyy", { locale: localeId })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <Clock size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session</p>
                    <p className="text-sm font-medium text-slate-900">
                      {data.session.name} ({data.session.startTime})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <Users size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pax</p>
                    <p className="text-sm font-medium text-slate-900">{data.partySize} Guests</p>
                  </div>
                </div>
              </div>

              {/* Check-In Deadline & Extension Action */}
              {(data.status === "confirmed" || data.status === "pending") && data.checkInTokenExpiresAt && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Check-In Deadline</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-blue-800">
                        {format(new Date(data.checkInTokenExpiresAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
                      </p>
                      {data.graceExtensionMinutes > 0 && (
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Extended +{data.graceExtensionMinutes} Mins
                        </span>
                      )}
                    </div>
                  </div>

                  {showConfirmExtend ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-900 mr-2">Add 15 minutes?</span>
                      <button
                        onClick={() => setShowConfirmExtend(false)}
                        disabled={isExtending}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExtendGrace}
                        disabled={isExtending}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isExtending ? <LoadingSpinner className="size-3 border-white/40 border-t-white" /> : null}
                        Yes, Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmExtend(true)}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
                    >
                      +15 Mins Grace Period
                    </button>
                  )}
                </div>
              )}

              {/* Reserved Tables Section + Reschedule Button */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900">Reserved Tables</h4>
                  {!isRescheduling && data.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={handleStartReschedule}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                    >
                      <CalendarPlus size={16} weight="bold" />
                      Pindah Jadwal / Meja
                    </button>
                  )}
                </div>

                {!isRescheduling ? (
                  <div className="flex flex-wrap gap-2">
                    {data.reservationTables.map((rt) => (
                      <span
                        key={rt.table.id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        Table {rt.table.tableNumber}
                        <span className="text-xs font-normal text-slate-400">({rt.table.capacity} pax)</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  /* Form Reschedule */
                  <div className="mt-2 space-y-4 rounded-xl border border-amber-300 bg-amber-50/40 p-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-sm">
                        <CalendarPlus size={18} weight="fill" className="text-primary" />
                        Form Pemindahan Jadwal (Reschedule)
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRescheduling(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Batal
                      </button>
                    </div>

                    {rescheduleError && (
                      <div className="rounded-lg bg-red-100 border border-red-300 p-2.5 text-xs text-red-700 flex items-start gap-2">
                        <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
                        <span>{rescheduleError}</span>
                      </div>
                    )}

                    {rescheduleSuccess && (
                      <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2.5 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                        <Check size={16} weight="bold" className="text-emerald-700" />
                        Jadwal reservasi berhasil diperbarui!
                      </div>
                    )}

                    {/* Input Tanggal */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pilih Tanggal Baru:
                      </label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Pilihan Sesi */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pilih Sesi Operasional:
                      </label>
                      {loadingSessions ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                          <LoadingSpinner className="size-4 border-2" />
                          Memuat sesi...
                        </div>
                      ) : availableSessions.length === 0 ? (
                        <p className="text-xs text-red-500">Tidak ada sesi aktif di tanggal ini.</p>
                      ) : (
                        <select
                          value={rescheduleSessionId}
                          onChange={(e) => setRescheduleSessionId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
                        >
                          {availableSessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.startTime} - {s.endTime})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Pilihan Meja */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Pilih Meja Baru:</label>
                        <span
                          className={`text-xs font-semibold ${
                            selectedTotalCapacity >= data.partySize ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          Kapasitas: {selectedTotalCapacity} / {data.partySize} Pax
                        </span>
                      </div>

                      {loadingTables ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                          <LoadingSpinner className="size-4 border-2" />
                          Memeriksa ketersediaan meja...
                        </div>
                      ) : availableTables.length === 0 ? (
                        <p className="text-xs text-slate-500">Pilih tanggal dan sesi untuk melihat meja.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-white">
                          {availableTables.map((tbl) => {
                            const isCurrent = data.reservationTables.some((rt) => rt.table.id === tbl.id);
                            // Available if isAvailable=true or if it's currently held by this reservation
                            const isSelectable = tbl.isAvailable || isCurrent;
                            const isSelected = rescheduleTableIds.includes(tbl.id);

                            return (
                              <button
                                key={tbl.id}
                                type="button"
                                disabled={!isSelectable}
                                onClick={() => toggleRescheduleTable(tbl.id)}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                                  isSelected
                                    ? "bg-primary text-white border-primary shadow-xs"
                                    : isSelectable
                                    ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                }`}
                              >
                                {isSelected && <Check size={12} weight="bold" />}
                                Table {tbl.tableNumber}
                                <span className="text-[10px] opacity-80">({tbl.capacity}p)</span>
                                {!isSelectable && <span className="text-[9px] text-red-500">(Penuh)</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tombol Simpan Reschedule */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                      <button
                        type="button"
                        onClick={() => setIsRescheduling(false)}
                        disabled={isSubmittingReschedule}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReschedule}
                        disabled={
                          isSubmittingReschedule ||
                          rescheduleTableIds.length === 0 ||
                          selectedTotalCapacity < data.partySize
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                      >
                        {isSubmittingReschedule ? (
                          <>
                            <LoadingSpinner className="size-3 border-white/40 border-t-white" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Jadwal Baru"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes & Special Requests */}
              <div className="space-y-3">
                {data.specialRequest && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <Note size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Reservation Note (Special Request)</h4>
                        <p className="text-sm text-amber-800 mt-1">{data.specialRequest}</p>
                      </div>
                    </div>
                  </div>
                )}

                {data.guest.notes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex gap-3">
                      <UserFocus size={20} className="text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Guest Profile Note (Guest History Notes)</h4>
                        <p className="text-sm text-slate-600 mt-1">{data.guest.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
