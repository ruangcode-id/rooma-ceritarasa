"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  FunnelSimple,
  MagnifyingGlass,
  Receipt,
} from "@phosphor-icons/react";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type AdminPayment = {
  orderId: string;
  status: PaymentStatus;
  type: "deposit" | "full";
  amount: number;
  paidAt: string | null;
  createdAt: string;
  reservation: {
    id: string;
    date: string;
    partySize: number;
    status: string;
    guest: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
    };
    session: {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
    };
  };
};

type PaymentMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const statusOptions = [
  { value: "", label: "Semua status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
] as const;

const statusStyle: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  refunded: "bg-blue-50 text-blue-700 ring-blue-200",
};

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(time: string) {
  if (!time) return "-";

  const date = new Date(time);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }

  return time.slice(0, 5);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [meta, setMeta] = useState<PaymentMeta | null>(null);
  const [status, setStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const totalPaid = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "paid")
        .reduce((total, payment) => total + Number(payment.amount), 0),
    [payments]
  );

  async function fetchPayments(
    nextPage = page,
    filters = {
      status,
      orderId,
    }
  ) {
    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "10",
      });

      if (filters.status) params.set("status", filters.status);
      if (filters.orderId.trim()) params.set("orderId", filters.orderId.trim());

      const response = await fetch(`/api/admin/payments?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Gagal mengambil data pembayaran.");
      }

      setPayments(data.data);
      setMeta(data.meta);
      setPage(data.meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data pembayaran.");
    } finally {
      setIsLoading(false);
    }
  }

  async function patchPayment(
    nextOrderId: string,
    payload: { status?: PaymentStatus; refund?: { amount?: number } | true }
  ) {
    setActiveOrderId(nextOrderId);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: nextOrderId,
          ...payload,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Gagal memperbarui pembayaran.");
      }

      setNotice(`Pembayaran ${nextOrderId} berhasil diperbarui.`);
      await fetchPayments(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui pembayaran.");
    } finally {
      setActiveOrderId("");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPayments(1);
    }, 0);

    return () => window.clearTimeout(timer);
    // Fetch once on mount; filters are applied explicitly through the Filter button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Admin Dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Pembayaran</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pantau pembayaran reservasi, sinkronkan status manual bila perlu, dan ajukan refund
              untuk transaksi yang sudah eligible di Midtrans.
            </p>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
            <div className="border-r border-slate-200 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paid page</p>
              <p className="mt-2 text-lg font-semibold sm:text-2xl">{formatRupiah(totalPaid)}</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rows</p>
              <p className="mt-2 text-lg font-semibold sm:text-2xl">{meta?.total ?? payments.length}</p>
            </div>
          </div>
        </header>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_220px_auto_auto]">
            <label className="relative block text-sm">
              <span className="font-semibold text-slate-700">Order ID</span>
              <MagnifyingGlass
                className="pointer-events-none absolute bottom-3 left-4 text-slate-400"
                size={18}
              />
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="Cari order ID"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Status</span>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => fetchPayments(1)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary lg:self-end"
            >
              <FunnelSimple size={18} weight="bold" />
              Filter
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderId("");
                setStatus("");
                setPage(1);
                void fetchPayments(1, { status: "", orderId: "" });
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 lg:self-end"
            >
              <ArrowsClockwise size={18} weight="bold" />
              Reset
            </button>
          </div>
        </section>

        {error && <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {notice && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <Receipt size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Daftar transaksi</h2>
                <p className="text-sm text-slate-500">Data langsung dari API admin payments.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-300 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Guest</th>
                  <th className="px-5 py-4">Reservasi</th>
                  <th className="px-5 py-4">Nominal</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Paid at</th>
                  <th className="px-5 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-500" colSpan={7}>
                      Memuat data pembayaran...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-500" colSpan={7}>
                      Tidak ada transaksi.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.orderId} className="border-t border-slate-100 align-top">
                      <td className="px-5 py-5">
                        <p className="font-semibold">{payment.orderId}</p>
                        <p className="mt-1 text-xs capitalize text-slate-500">{payment.type}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Dibuat {formatDateTime(payment.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-semibold">{payment.reservation.guest.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.reservation.guest.phone}
                        </p>
                        {payment.reservation.guest.email && (
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.reservation.guest.email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <p>{formatDate(payment.reservation.date)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.reservation.session.name},{" "}
                          {formatTime(payment.reservation.session.startTime)} -{" "}
                          {formatTime(payment.reservation.session.endTime)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.reservation.partySize} tamu · {payment.reservation.status}
                        </p>
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        {formatRupiah(Number(payment.amount))}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusStyle[payment.status]}`}
                        >
                          {payment.status}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-slate-600">
                        {formatDateTime(payment.paidAt)}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-wrap gap-2">
                          {(["paid", "failed"] as PaymentStatus[]).map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={activeOrderId === payment.orderId}
                              onClick={() =>
                                patchPayment(payment.orderId, {
                                  status: nextStatus,
                                })
                              }
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50"
                            >
                              {nextStatus}
                            </button>
                          ))}

                          <button
                            type="button"
                            disabled={
                              activeOrderId === payment.orderId || payment.status !== "paid"
                            }
                            onClick={() => patchPayment(payment.orderId, { refund: true })}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
                          >
                            Refund
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Halaman {meta?.page ?? page} dari {meta?.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!meta?.hasPrev || isLoading}
                onClick={() => fetchPayments(page - 1)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={!meta?.hasNext || isLoading}
                onClick={() => fetchPayments(page + 1)}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
