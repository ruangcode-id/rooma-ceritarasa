"use client";

import { useEffect, useState } from "react";

type PaymentItem = {
  orderId: string;
  status: string;
  type: string;
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

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
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
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const [status, setStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchPayments(nextPage = page) {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(nextPage));
      params.set("limit", "20");

      if (status) params.set("status", status);
      if (orderId) params.set("orderId", orderId);

      const response = await fetch(`/api/admin/payments?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Gagal mengambil data pembayaran.");
      }

      setPayments(data.data ?? []);
      setMeta(data.meta ?? null);
      setPage(data.meta?.page ?? nextPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil data pembayaran."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefund(payment: PaymentItem) {
    const confirmed = window.confirm(`Refund payment ${payment.orderId}?`);

    if (!confirmed) return;

    setIsActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: payment.orderId,
          refund: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Gagal melakukan refund.");
      }

      await fetchPayments(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melakukan refund.");
    } finally {
      setIsActionLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Payments</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola pembayaran Midtrans, status payment, guest, dan refund.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm">
              Status
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </label>

            <label className="text-sm md:col-span-2">
              Order ID
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Cari Midtrans Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fetchPayments(1)}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Filter
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setOrderId("");
                  setPage(1);
                  setTimeout(() => fetchPayments(1), 0);
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-312.5 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Reservasi</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Paid At</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={9}>
                      Memuat data pembayaran...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={9}>
                      Tidak ada data pembayaran.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr
                      key={payment.orderId}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {payment.reservation.guest.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.reservation.guest.phone}
                        </p>
                        {payment.reservation.guest.email && (
                          <p className="text-xs text-slate-500">
                            {payment.reservation.guest.email}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p>{formatDate(payment.reservation.date)}</p>
                        <p className="text-xs text-slate-500">
                          {payment.reservation.partySize} pax ·{" "}
                          {payment.reservation.status}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p>{payment.reservation.session.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatTime(payment.reservation.session.startTime)} -{" "}
                          {formatTime(payment.reservation.session.endTime)}
                        </p>
                      </td>

                      <td className="px-4 py-4 capitalize">{payment.type}</td>

                      <td className="px-4 py-4 font-semibold">
                        {formatRupiah(payment.amount)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                          {payment.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-65 break-all text-xs text-slate-500">
                          {payment.orderId}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-500">
                        {formatDateTime(payment.paidAt)}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={isActionLoading || payment.status !== "paid"}
                          onClick={() => handleRefund(payment)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Refund
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <p>
                Page {meta.page} of {meta.totalPages} · Total {meta.total}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!meta.hasPrev}
                  onClick={() => fetchPayments(page - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>

                <button
                  type="button"
                  disabled={!meta.hasNext}
                  onClick={() => fetchPayments(page + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}