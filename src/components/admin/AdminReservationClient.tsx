"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle, Clock, XCircle, Prohibit, CalendarCheck } from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";

type ReservationTable = {
  table: {
    id: string;
    tableNumber: number;
    capacity: number;
  };
};

type ReservationRow = {
  id: string;
  status: "pending" | "confirmed" | "checked_in" | "no_show" | "cancelled";
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

export default function AdminReservationClient() {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Custom Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; status: string; guestName: string } | null>(null);

  async function load() {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/reservations?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Gagal mengambil data reservasi.");
      }

      setRows(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      void load();
    }, 300); // debounce search
    return () => clearTimeout(delayDebounceFn);
  }, [filterDate, filterStatus, search]);

  const executeUpdateStatus = async () => {
    if (!confirmDialog) return;
    const { id, status } = confirmDialog;
    
    setIsUpdating(id);
    setConfirmDialog(null);
    setError("");
    
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Gagal mengubah status.");
      }
      
      void load(); // reload data
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // auto hide error after 5s
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsUpdating(null);
    }
  };

  const totalReservations = rows.length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const checkedInCount = rows.filter((r) => r.status === "checked_in").length;
  const cancelledCount = rows.filter((r) => r.status === "cancelled" || r.status === "no_show").length;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Operasional</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Daftar Reservasi</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Pantau tamu yang akan datang, konfirmasi reservasi, dan kelola absensi (No-Show).
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Reservasi" value={String(totalReservations)} Icon={CalendarCheck} />
        <MetricCard label="Menunggu Konfirmasi" value={String(pendingCount)} Icon={Clock} />
        <MetricCard label="Sudah Hadir" value={String(checkedInCount)} Icon={CheckCircle} />
        <MetricCard label="Batal / No-Show" value={String(cancelledCount)} Icon={XCircle} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu (Pending)</option>
              <option value="confirmed">Terkonfirmasi</option>
              <option value="checked_in">Sudah Hadir</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Cari nama atau telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Sesi / Jam</th>
                <th className="px-4 py-3">Tamu</th>
                <th className="px-4 py-3">Pax</th>
                <th className="px-4 py-3">Meja</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 text-center" colSpan={6}>
                    Memuat data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 text-center" colSpan={6}>
                    Tidak ada reservasi ditemukan.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isBusy = isUpdating === r.id;
                  return (
                    <tr key={r.id} className={`border-t border-slate-100 align-top ${isBusy ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{r.session.name}</p>
                        <p className="text-xs text-slate-500">
                          {r.session.startTime} - {r.session.endTime}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{r.guest.name}</p>
                        <p className="text-xs text-slate-500">{r.guest.phone}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(r.cancelToken);
                            setCopiedToken(r.id);
                            setTimeout(() => setCopiedToken(null), 2000);
                          }}
                          className="text-[10px] text-slate-400 font-mono mt-1 hover:text-primary transition-colors text-left flex items-center gap-1"
                          title="Klik untuk copy Token (untuk Check-In)"
                        >
                          {copiedToken === r.id ? (
                            <span className="text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle size={12} weight="bold" /> Tersalin!
                            </span>
                          ) : (
                            <>
                              #{r.cancelToken.substring(0, 8).toUpperCase()}... <span className="opacity-50">(copy)</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 font-medium">{r.partySize}</td>
                      <td className="px-4 py-4">
                        {r.reservationTables.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.reservationTables.map((t) => (
                              <span key={t.table.id} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                                T{t.table.tableNumber}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Belum Ada</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {r.status === "pending" && (
                            <button
                              onClick={() => setConfirmDialog({ id: r.id, status: "confirmed", guestName: r.guest.name })}
                              disabled={isBusy}
                              className="text-xs font-semibold px-3 py-1.5 rounded bg-primary text-white hover:bg-primary/90"
                            >
                              Confirm
                            </button>
                          )}
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <button
                              onClick={() => setConfirmDialog({ id: r.id, status: "no_show", guestName: r.guest.name })}
                              disabled={isBusy}
                              className="text-xs font-semibold px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              No-Show
                            </button>
                          )}
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <button
                              onClick={() => setConfirmDialog({ id: r.id, status: "cancelled", guestName: r.guest.name })}
                              disabled={isBusy}
                              className="text-xs font-semibold px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Konfirmasi Aksi</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Apakah Anda yakin ingin mengubah status reservasi atas nama <span className="font-bold text-slate-900">{confirmDialog.guestName}</span> menjadi <StatusBadge status={confirmDialog.status} inline />?
              </p>
            </div>
            <div className="flex bg-slate-50 border-t border-slate-100 p-4 gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeUpdateStatus}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md"
              >
                Ya, Ubah Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, inline = false }: { status: string; inline?: boolean }) {
  const baseClass = inline ? "inline-flex px-2 py-0.5" : "px-3 py-1";
  switch (status) {
    case "pending":
      return <span className={`rounded-full bg-yellow-100 text-xs font-semibold text-yellow-800 ${baseClass}`}>Menunggu</span>;
    case "confirmed":
      return <span className={`rounded-full bg-blue-100 text-xs font-semibold text-blue-800 ${baseClass}`}>Terkonfirmasi</span>;
    case "checked_in":
      return <span className={`rounded-full bg-green-100 text-xs font-semibold text-green-800 ${baseClass}`}>Hadir</span>;
    case "no_show":
      return <span className={`rounded-full bg-slate-200 text-xs font-semibold text-slate-700 ${baseClass}`}>No-Show</span>;
    case "cancelled":
      return <span className={`rounded-full bg-red-100 text-xs font-semibold text-red-800 ${baseClass}`}>Batal</span>;
    default:
      return <span className={`rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ${baseClass}`}>{status}</span>;
  }
}
