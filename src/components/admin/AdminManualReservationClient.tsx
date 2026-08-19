"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  X,
  CreditCard,
  Plus,
  NotePencil,
  Crown,
  UserFocus,
  FileText
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatusBadge, type StatusBadgeOption } from "@/components/ui/StatusBadge";
import { handleApiError } from "@/lib/handle-api-error";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ReservationStatus = "pending" | "confirmed" | "checked_in" | "no_show" | "cancelled";

type ReservationTable = {
  table: {
    id: string;
    tableNumber: number;
    capacity: number;
  };
};

type ReservationRow = {
  id: string;
  status: ReservationStatus;
  partySize: number;
  date: string;
  specialRequest?: string | null;
  createdAt: string;
  guest: {
    id: string;
    name: string;
    phone: string;
    notes?: string | null;
    isVip?: boolean;
  };
  session: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  reservationTables: ReservationTable[];
};

const reservationStatuses: Array<StatusBadgeOption<ReservationStatus>> = [
  { id: "pending", label: "Pending", className: "bg-amber-100 text-amber-700", Icon: Clock },
  { id: "confirmed", label: "Confirmed", className: "bg-blue-100 text-blue-700", Icon: CalendarCheck },
  { id: "checked_in", label: "Checked in", className: "bg-green-100 text-green-700", Icon: CheckCircle },
  { id: "no_show", label: "No-Show", className: "bg-slate-100 text-slate-600", Icon: X },
  { id: "cancelled", label: "Cancelled", className: "bg-red-100 text-red-700", Icon: X },
];

async function requestManualReservations({
  date,
  status,
  search,
  signal,
}: {
  date: string;
  status: string;
  search: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (status) params.set("status", status);
  if (search.trim()) params.set("search", search.trim());

  const response = await fetch(`/api/admin/manual-reservations?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const errorMsg = await handleApiError(response);
    throw new Error(errorMsg);
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error ?? "Failed to fetch reservation data.");
  }

  return payload.data as ReservationRow[];
}

export default function AdminManualReservationClient() {
  const router = useRouter();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [notesModalRow, setNotesModalRow] = useState<ReservationRow | null>(null);

  async function load() {
    setIsLoading(true);
    setError("");

    try {
      const data = await requestManualReservations({
        date: filterDate,
        status: filterStatus,
        search,
      });
      setRows(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      setError("");

      requestManualReservations({
        date: filterDate,
        status: filterStatus,
        search,
        signal: controller.signal,
      })
        .then((data) => {
          setRows(data);
          setError("");
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") return;
          setError(requestError instanceof Error ? requestError.message : String(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filterDate, filterStatus, search]);

  async function markAsPaid(id: string) {
    if (!confirm("Are you sure you want to mark this reservation as paid?")) return;
    
    setIsUpdating(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/manual-reservations/${id}/pay`, {
        method: "PATCH",
      });
      if (!response.ok) {
        const errorMsg = await handleApiError(response);
        throw new Error(errorMsg);
      }

      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error ?? "Failed to update status.");

      await load();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsUpdating(null);
    }
  }

  async function cancelReservation(id: string) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    
    setIsUpdating(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        const errorMsg = await handleApiError(response);
        throw new Error(errorMsg);
      }

      await load();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsUpdating(null);
    }
  }

  const reservationColumns: Array<DataTableColumn<ReservationRow>> = [
    {
      id: "session",
      header: "Session / Date",
      headerClassName: "w-[20%] text-left",
      className: "w-[20%] align-middle text-left",
      cell: (reservation) => (
        <div className="min-w-0">
          <p className="wrap-break-word font-semibold text-slate-900">{reservation.session.name}</p>
          <p className="text-xs text-slate-500">
            {new Date(reservation.date).toLocaleDateString()} | {reservation.session.startTime}
          </p>
        </div>
      ),
    },
    {
      id: "guest",
      header: "Guest",
      headerClassName: "w-[25%] text-left",
      className: "w-[25%] align-middle text-left",
      cell: (reservation) => (
        <div className="min-w-0">
          <p className="wrap-break-word font-semibold text-slate-900">{reservation.guest.name}</p>
          <p className="break-all text-xs text-slate-500">{reservation.guest.phone}</p>
        </div>
      ),
    },
    {
      id: "tables",
      header: "Tables (Pax)",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (reservation) => (
        <div>
          <div className="flex flex-wrap justify-center gap-1 mb-1">
            {reservation.reservationTables.map((item) => (
              <span key={item.table.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                T{item.table.tableNumber}
              </span>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500">{reservation.partySize} Pax</span>
        </div>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      headerClassName: "w-[10%] text-center",
      className: "w-[10%] align-middle text-center",
      cell: (reservation) => {
        const hasNotes = Boolean(reservation.specialRequest || reservation.guest.notes);
        if (!hasNotes) return <span className="text-xs text-slate-300">-</span>;
        return (
          <button
            type="button"
            onClick={() => setNotesModalRow(reservation)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-95 cursor-pointer shadow-2xs"
          >
            <NotePencil size={14} weight="bold" className="text-amber-600" />
            Notes
          </button>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (reservation) => <StatusBadge status={reservation.status} statuses={reservationStatuses} />,
    },
    {
      id: "actions",
      header: "Action",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (reservation) => {
        const isBusy = isUpdating === reservation.id;
        return (
          <div className="flex flex-wrap justify-center gap-2">
            {reservation.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => markAsPaid(reservation.id)}
                  disabled={isBusy}
                  className="rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 transition-all hover:bg-green-100 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <CreditCard size={14} /> Mark Paid
                </button>
                <button
                  type="button"
                  onClick={() => cancelReservation(reservation.id)}
                  disabled={isBusy}
                  className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            {isBusy && <LoadingSpinner className="self-center" />}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <SectionTitle
          eyebrow="Operations"
          title="Manual Reservations"
          level={1}
          description="Manage manual reservations made by staff."
        />
        <Link
          href="/admin/manual-reservations/create"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Plus size={18} weight="bold" />
          Create Reservation
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Manual" value={String(rows.length)} Icon={FileText} />
        <MetricCard label="Pending Payment" value={String(rows.filter(r => r.status === "pending").length)} Icon={Clock} />
        <MetricCard label="Confirmed" value={String(rows.filter(r => r.status === "confirmed").length)} Icon={CheckCircle} />
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              aria-label="Filter reservation date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <select
              aria-label="Filter reservation status"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked in</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex w-full rounded-lg border border-slate-300 bg-white focus-within:border-primary lg:w-72">
            <span className="grid size-10 shrink-0 place-items-center text-slate-400">
              <MagnifyingGlass size={16} weight="bold" />
            </span>
            <input
              type="search"
              aria-label="Search guest name or phone number"
              placeholder="Search name or phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-transparent py-2 pr-3 text-sm outline-none"
            />
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <DataTable
          columns={reservationColumns}
          data={rows}
          rowKey="id"
          caption="Manual reservation list"
          initialPageSize={10}
          loading={isLoading}
          emptyState="No manual reservations found."
          tableClassName="min-w-[1000px]"
          embedded
        />
      </section>

      {/* Customer Notes Sticky-Note Modal */}
      {notesModalRow && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setNotesModalRow(null)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-[#fffdfa] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-3 bg-linear-to-r from-amber-300 via-amber-400 to-amber-300" />
            <div className="flex items-start justify-between border-b border-amber-100 pb-4 pt-1">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 shadow-2xs">
                  <NotePencil size={24} weight="bold" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Customer Notes</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-600 font-medium">
                      Guest: <span className="font-semibold text-slate-900">{notesModalRow.guest.name}</span> ({notesModalRow.guest.phone})
                    </p>
                    {notesModalRow.guest.isVip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                        <Crown size={10} weight="fill" /> VIP
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setNotesModalRow(null)} className="rounded-lg p-1 text-slate-400 hover:bg-amber-100/50 hover:text-slate-700 transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {notesModalRow.specialRequest && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex gap-2.5">
                    <FileText size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Special Request (This Reservation)</h4>
                      <p className="mt-1 text-sm font-medium text-amber-950 whitespace-pre-wrap leading-relaxed">{notesModalRow.specialRequest}</p>
                    </div>
                  </div>
                </div>
              )}
              {notesModalRow.guest.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-2.5">
                    <UserFocus size={20} className="text-slate-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Guest History Notes</h4>
                      <p className="mt-1 text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{notesModalRow.guest.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setNotesModalRow(null)} className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer active:scale-95">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
