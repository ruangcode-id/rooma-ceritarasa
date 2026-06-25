"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Prohibit,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/tables/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "no_show"
  | "cancelled";

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
  createdAt: string;
  cancelToken: string;
  guest: {
    id: string;
    name: string;
    phone: string;
  };
  session: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  reservationTables: ReservationTable[];
};

type ConfirmDialog = {
  id: string;
  status: ReservationStatus;
  guestName: string;
};

const reservationStatuses: Array<StatusBadgeOption<ReservationStatus>> = [
  {
    id: "pending",
    label: "Menunggu",
    className: "bg-amber-100 text-amber-700",
    Icon: Clock,
  },
  {
    id: "confirmed",
    label: "Terkonfirmasi",
    className: "bg-blue-100 text-blue-700",
    Icon: CalendarCheck,
  },
  {
    id: "checked_in",
    label: "Hadir",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle,
  },
  {
    id: "no_show",
    label: "No-Show",
    className: "bg-slate-100 text-slate-600",
    Icon: Prohibit,
  },
  {
    id: "cancelled",
    label: "Batal",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
];

async function requestReservations({
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

  const response = await fetch(
    `/api/admin/reservations?${params.toString()}`,
    {
      cache: "no-store",
      signal,
    }
  );
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Gagal mengambil data reservasi.");
  }

  return payload.data as ReservationRow[];
}

export default function AdminReservationClient() {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  async function load() {
    setIsLoading(true);
    setError("");

    try {
      const data = await requestReservations({
        date: filterDate,
        status: filterStatus,
        search,
      });
      setRows(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : String(requestError)
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      setError("");

      requestReservations({
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
          if (
            requestError instanceof DOMException &&
            requestError.name === "AbortError"
          ) {
            return;
          }

          setError(
            requestError instanceof Error
              ? requestError.message
              : String(requestError)
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filterDate, filterStatus, search]);

  async function executeUpdateStatus() {
    if (!confirmDialog) return;

    const { id, status } = confirmDialog;
    setIsUpdating(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Gagal mengubah status.");
      }

      setConfirmDialog(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : String(requestError)
      );
    } finally {
      setIsUpdating(null);
    }
  }

  function copyCheckInToken(reservation: ReservationRow) {
    void navigator.clipboard.writeText(reservation.cancelToken);
    setCopiedToken(reservation.id);
    window.setTimeout(() => setCopiedToken(null), 2000);
  }

  const totalReservations = rows.length;
  const pendingCount = rows.filter(
    (reservation) => reservation.status === "pending"
  ).length;
  const checkedInCount = rows.filter(
    (reservation) => reservation.status === "checked_in"
  ).length;
  const cancelledCount = rows.filter(
    (reservation) =>
      reservation.status === "cancelled" ||
      reservation.status === "no_show"
  ).length;

  const reservationColumns: Array<DataTableColumn<ReservationRow>> = [
    {
      id: "session",
      header: "Sesi / Jam",
      headerClassName: "w-[19%] text-left",
      className: "w-[19%] align-middle text-left",
      cell: (reservation) => (
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900">
            {reservation.session.name}
          </p>
          <p className="text-xs text-slate-500">
            {reservation.session.startTime} - {reservation.session.endTime}
          </p>
        </div>
      ),
    },
    {
      id: "guest",
      header: "Tamu",
      headerClassName: "w-[23%] text-left",
      className: "w-[23%] align-middle text-left",
      cell: (reservation) => (
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900">
            {reservation.guest.name}
          </p>
          <p className="break-all text-xs text-slate-500">
            {reservation.guest.phone}
          </p>
          <button
            type="button"
            onClick={() => copyCheckInToken(reservation)}
            className="mt-1 inline-flex max-w-full items-center gap-1 text-left font-mono text-[10px] text-slate-400 transition-colors hover:text-primary"
            title="Klik untuk menyalin token check-in"
          >
            {copiedToken === reservation.id ? (
              <span className="inline-flex items-center gap-1 font-semibold text-green-600">
                <CheckCircle size={12} weight="bold" />
                Tersalin
              </span>
            ) : (
              <span className="truncate">
                #{reservation.cancelToken?.substring(0, 8).toUpperCase() ?? 'N/A'}...
                <span className="opacity-60"> (copy)</span>
              </span>
            )}
          </button>
        </div>
      ),
    },
    {
      id: "partySize",
      header: "Pax",
      accessor: "partySize",
      headerClassName: "w-[7%] text-center",
      className: "w-[7%] align-middle text-center font-semibold",
    },
    {
      id: "tables",
      header: "Meja",
      headerClassName: "w-[13%] text-center",
      className: "w-[13%] align-middle text-center",
      cell: (reservation) =>
        reservation.reservationTables.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {reservation.reservationTables.map((item) => (
              <span
                key={item.table.id}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                T{item.table.tableNumber}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Belum ada</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (reservation) => (
        <StatusBadge
          status={reservation.status}
          statuses={reservationStatuses}
        />
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      headerClassName: "w-[23%] text-center",
      className: "w-[23%] align-middle text-center",
      cell: (reservation) => {
        const isBusy = isUpdating === reservation.id;

        return (
          <div className="flex flex-wrap justify-center gap-2">
            {reservation.status === "pending" ? (
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    id: reservation.id,
                    status: "confirmed",
                    guestName: reservation.guest.name,
                  })
                }
                disabled={isBusy}
                className="rounded-xl bg-green-50 px-4 py-2 text-xs font-semibold text-green-600 transition-all duration-300 hover:scale-105 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm
              </button>
            ) : null}
            {reservation.status === "pending" ||
            reservation.status === "confirmed" ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDialog({
                      id: reservation.id,
                      status: "no_show",
                      guestName: reservation.guest.name,
                    })
                  }
                  disabled={isBusy}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-all duration-300 hover:scale-105 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  No-Show
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDialog({
                      id: reservation.id,
                      status: "cancelled",
                      guestName: reservation.guest.name,
                    })
                  }
                  disabled={isBusy}
                  className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-all duration-300 hover:scale-105 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : null}
            {isBusy ? <LoadingSpinner className="self-center" /> : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <SectionTitle
          eyebrow="Operasional"
          title="Daftar Reservasi"
          level={1}
          description="Pantau tamu yang akan datang, konfirmasi reservasi, dan kelola absensi (No-Show)."
        />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Reservasi"
          value={String(totalReservations)}
          Icon={CalendarCheck}
        />
        <MetricCard
          label="Menunggu Konfirmasi"
          value={String(pendingCount)}
          Icon={Clock}
        />
        <MetricCard
          label="Sudah Hadir"
          value={String(checkedInCount)}
          Icon={CheckCircle}
        />
        <MetricCard
          label="Batal / No-Show"
          value={String(cancelledCount)}
          Icon={XCircle}
        />
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              aria-label="Filter tanggal reservasi"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <select
              aria-label="Filter status reservasi"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="confirmed">Terkonfirmasi</option>
              <option value="checked_in">Sudah Hadir</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <div className="flex w-full rounded-lg border border-slate-300 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary lg:w-72">
            <span className="grid size-10 shrink-0 place-items-center text-slate-400">
              <MagnifyingGlass size={16} weight="bold" />
            </span>
            <input
              type="search"
              aria-label="Cari nama atau nomor telepon tamu"
              placeholder="Cari nama atau telepon..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-transparent py-2 pr-3 text-sm outline-none"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <DataTable
          columns={reservationColumns}
          data={rows}
          rowKey="id"
          caption="Daftar reservasi tamu"
          initialPageSize={10}
          loading={isLoading}
          loadingState={
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner className="size-4" />
              Memuat data...
            </span>
          }
          emptyState="Tidak ada reservasi ditemukan."
          tableClassName="min-w-[1200px] table-fixed"
          embedded
        />
      </section>

      {confirmDialog ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reservation-status-dialog-title"
        >
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                <WarningCircle size={22} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Konfirmasi Aksi
                </p>
                <h2
                  id="reservation-status-dialog-title"
                  className="mt-2 text-2xl font-semibold text-slate-950"
                >
                  Ubah status reservasi?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Status reservasi atas nama{" "}
                  <span className="font-semibold text-slate-900">
                    {confirmDialog.guestName}
                  </span>{" "}
                  akan diubah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={isUpdating !== null}
                aria-label="Tutup konfirmasi status"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-600">Status baru</span>
              <StatusBadge
                status={confirmDialog.status}
                statuses={reservationStatuses}
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={isUpdating !== null}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void executeUpdateStatus()}
                disabled={isUpdating !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <LoadingSpinner className="size-4 border-white/40 border-t-white" />
                    Memproses...
                  </>
                ) : (
                  "Ya, Ubah Status"
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
