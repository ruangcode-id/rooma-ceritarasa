"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CalendarCheck, Clock, Users, Note, CheckCircle, Prohibit, XCircle, Crown, UserFocus } from "@phosphor-icons/react";
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
      tableNumber: number;
      capacity: number;
    };
  }[];
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

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/admin/reservations/${reservationId}`);
        if (!res.ok) throw new Error(await handleApiError(res));

        const payload = await res.json();
        if (!payload.success) {
          throw new Error(payload.error || "Failed to fetch reservation details");
        }
        if (isMounted) setData(payload.data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Error unknown");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [reservationId]);

  const handleClose = () => {
    // Strip the ?detail= parameter from the URL to close the modal
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
      
      router.refresh(); // Refresh the page data
      handleClose(); // Close the modal
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error unknown");
    } finally {
      setIsExtending(false);
      setShowConfirmExtend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Reservation Details</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
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

              {/* Tables */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  Reserved Tables
                </h4>
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
