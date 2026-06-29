"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CalendarCheck, Clock, Users, Note, CheckCircle, Prohibit, XCircle } from "@phosphor-icons/react";
import { StatusBadge, type StatusBadgeOption } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type DetailReservation = {
  id: string;
  status: string;
  partySize: number;
  date: string;
  specialRequest?: string | null;
  createdAt: string;
  guest: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
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
  { id: "pending", label: "Menunggu", className: "bg-amber-100 text-amber-700", Icon: Clock },
  { id: "confirmed", label: "Terkonfirmasi", className: "bg-blue-100 text-blue-700", Icon: CalendarCheck },
  { id: "checked_in", label: "Hadir", className: "bg-green-100 text-green-700", Icon: CheckCircle },
  { id: "no_show", label: "No-Show", className: "bg-slate-100 text-slate-600", Icon: Prohibit },
  { id: "cancelled", label: "Batal", className: "bg-red-100 text-red-700", Icon: XCircle },
];

export default function AdminReservationDetailModal({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [data, setData] = useState<DetailReservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/admin/reservations/${reservationId}`);
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload.error || "Gagal mengambil detail reservasi");
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Detail Reservasi</h2>
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
              <p className="mt-4 text-sm text-slate-500">Memuat detail...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-red-600">
              <p className="font-semibold">Oops! Terjadi kesalahan.</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{data.guest.name}</h3>
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</p>
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sesi</p>
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
                    <p className="text-sm font-medium text-slate-900">{data.partySize} Tamu</p>
                  </div>
                </div>
              </div>

              {/* Tables */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  Meja yang Dipesan
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.reservationTables.map((rt) => (
                    <span
                      key={rt.table.id}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
                    >
                      Meja {rt.table.tableNumber}
                      <span className="text-xs font-normal text-slate-400">({rt.table.capacity} org)</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Special Request */}
              {data.specialRequest && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <Note size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Catatan Khusus Tamu</h4>
                      <p className="text-sm text-amber-800 mt-1">{data.specialRequest}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
