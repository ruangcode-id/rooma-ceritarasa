"use client";

import {
  ArrowClockwise,
  CreditCard,
  CurrencyCircleDollar,
  MagnifyingGlass,
  Receipt,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/cards/MetricCard";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type ManualPaymentStatus = Exclude<PaymentStatus, "refunded">;

type PaymentItem = {
  id: string;
  orderId: string;
  status: PaymentStatus;
  type: "deposit" | "full";
  amount: number;
  paymentMethod: string | null;
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
      maxCapacity: number;
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

type ApiListResponse = {
  success: true;
  data: PaymentItem[];
  meta: PaymentMeta;
};

type ApiErrorResponse = {
  success: false;
  error?: string;
};

const paymentStatuses: Array<{ value: PaymentStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const manualStatuses: Array<{ value: ManualPaymentStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }

  return value.slice(0, 5);
}

function getStatusClass(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "refunded":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getPaymentMethodLabel(method: string | null) {
  if (!method) return "Belum tercatat";

  return method.replaceAll("_", " ");
}

async function parseApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiErrorResponse
    | null;

  return payload?.error ?? "Request gagal diproses.";
}

async function requestPayments({
  page,
  limit,
  orderId,
  status,
  signal,
}: {
  page: number;
  limit: number;
  orderId: string;
  status: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (orderId.trim()) params.set("orderId", orderId.trim());
  if (status) params.set("status", status);

  const response = await fetch(`/api/admin/payments?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const payload = (await response.json()) as ApiListResponse | ApiErrorResponse;

  if (!payload.success) {
    throw new Error(payload.error ?? "Gagal mengambil data pembayaran.");
  }

  return payload;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [meta, setMeta] = useState<PaymentMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [orderId, setOrderId] = useState("");
  const [appliedOrderId, setAppliedOrderId] = useState("");
  const [status, setStatus] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [manualStatusByOrder, setManualStatusByOrder] = useState<
    Record<string, ManualPaymentStatus>
  >({});
  const [confirmRefund, setConfirmRefund] = useState<PaymentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionKey, setActionKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function fetchPayments(
    nextPage = meta.page,
    nextOrderId = appliedOrderId,
    nextStatus = appliedStatus
  ) {
    setIsLoading(true);
    setError("");

    try {
      const payload = await requestPayments({
        page: nextPage,
        limit: meta.limit,
        orderId: nextOrderId,
        status: nextStatus,
      });

      setPayments(payload.data);
      setMeta(payload.meta);
      setManualStatusByOrder((current) => {
        const next = { ...current };

        for (const payment of payload.data) {
          if (payment.status !== "refunded" && !next[payment.orderId]) {
            next[payment.orderId] = payment.status;
          }
        }

        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil data pembayaran."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadPayments() {
      try {
        const payload = await requestPayments({
          page: 1,
          limit: meta.limit,
          orderId: "",
          status: "",
          signal: controller.signal,
        });

        setPayments(payload.data);
        setMeta(payload.meta);
        setManualStatusByOrder(
          payload.data.reduce<Record<string, ManualPaymentStatus>>(
            (acc, payment) => {
              if (payment.status !== "refunded") {
                acc[payment.orderId] = payment.status;
              }

              return acc;
            },
            {}
          )
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data pembayaran."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPayments();

    return () => controller.abort();
  }, [meta.limit]);

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        if (payment.status === "paid") {
          acc.paidCount += 1;
          acc.paidAmount += payment.amount;
        }

        if (payment.status === "pending") acc.pendingCount += 1;
        if (payment.status === "refunded") acc.refundedCount += 1;

        return acc;
      },
      {
        paidCount: 0,
        paidAmount: 0,
        pendingCount: 0,
        refundedCount: 0,
      }
    );
  }, [payments]);

  function applyFilters() {
    setAppliedOrderId(orderId);
    setAppliedStatus(status);
    setNotice("");
    setMeta((current) => ({ ...current, page: 1 }));
    void fetchPayments(1, orderId, status);
  }

  function resetFilters() {
    setOrderId("");
    setStatus("");
    setAppliedOrderId("");
    setAppliedStatus("");
    setNotice("");
    setMeta((current) => ({ ...current, page: 1 }));
    void fetchPayments(1, "", "");
  }

  async function updateManualStatus(payment: PaymentItem) {
    const nextStatus = manualStatusByOrder[payment.orderId] ?? payment.status;
    const key = `status-${payment.orderId}`;

    setActionKey(key);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: payment.orderId,
          status: nextStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = (await response.json()) as
        | { success: true; data: unknown }
        | ApiErrorResponse;

      if (!payload.success) {
        throw new Error(payload.error ?? "Gagal mengubah status pembayaran.");
      }

      setNotice(`Status ${payment.orderId} diubah menjadi ${nextStatus}.`);
      await fetchPayments(meta.page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah status pembayaran."
      );
    } finally {
      setActionKey("");
    }
  }

  async function refundPayment() {
    if (!confirmRefund) return;

    const key = `refund-${confirmRefund.id}`;
    setActionKey(key);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/payments/${confirmRefund.id}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "full",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = (await response.json()) as
        | { success: true; data: unknown }
        | ApiErrorResponse;

      if (!payload.success) {
        throw new Error(payload.error ?? "Gagal memproses refund.");
      }

      setNotice(`Refund untuk ${confirmRefund.orderId} berhasil dikirim.`);
      setConfirmRefund(null);
      await fetchPayments(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses refund.");
    } finally {
      setActionKey("");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Payment Operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Midtrans Payments & Refund
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Rekap transaksi reservasi, koreksi status pembayaran manual, dan
          konfirmasi refund dana tamu.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Paid Revenue"
          value={formatCompactRupiah(summary.paidAmount)}
          Icon={CurrencyCircleDollar}
        />
        <MetricCard
          label="Paid Orders"
          value={String(summary.paidCount)}
          Icon={CreditCard}
        />
        <MetricCard
          label="Pending"
          value={String(summary.pendingCount)}
          Icon={Receipt}
        />
        <MetricCard
          label="Refunded"
          value={String(summary.refundedCount)}
          Icon={ArrowClockwise}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Filters
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Payment Ledger
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            {meta.total} transaksi ditemukan
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto]">
          <label className="text-sm font-semibold text-slate-700">
            Order ID
            <div className="mt-2 flex rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-primary/30">
              <span className="grid size-10 place-items-center text-slate-400">
                <MagnifyingGlass size={16} weight="bold" />
              </span>
              <input
                type="search"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void applyFilters();
                }}
                placeholder="Cari Midtrans order ID"
                className="min-w-0 flex-1 rounded-xl px-1 py-2 pr-3 text-sm font-normal outline-none"
              />
            </div>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none transition focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Semua status</option>
              {paymentStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void applyFilters()}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              Filter
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void resetFilters()}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Reservasi</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Midtrans</th>
                <th className="px-4 py-3">Manual Status</th>
                <th className="px-4 py-3 text-right">Refund</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    Memuat data pembayaran...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-slate-500"
                    colSpan={8}
                  >
                    Belum ada pembayaran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const selectedStatus =
                    manualStatusByOrder[payment.orderId] ??
                    (payment.status === "refunded" ? "paid" : payment.status);
                  const statusActionKey = `status-${payment.orderId}`;
                  const refundActionKey = `refund-${payment.id}`;

                  return (
                    <tr
                      key={payment.id}
                      className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4">
                        <p className="break-all font-semibold text-slate-900">
                          {payment.orderId}
                        </p>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {payment.type} payment
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {payment.reservation.guest.name}
                        </p>
                        <p className="break-all text-xs text-slate-500">
                          {payment.reservation.guest.phone}
                        </p>
                        {payment.reservation.guest.email && (
                          <p className="break-all text-xs text-slate-500">
                            {payment.reservation.guest.email}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p>{formatDate(payment.reservation.date)}</p>
                        <p className="text-xs text-slate-500">
                          {payment.reservation.session.name},{" "}
                          {formatTime(payment.reservation.session.startTime)} -{" "}
                          {formatTime(payment.reservation.session.endTime)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.reservation.partySize} tamu
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {formatRupiah(payment.amount)}
                        </p>
                        <p className="text-xs capitalize text-slate-500">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                            payment.status
                          )}`}
                        >
                          {payment.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-xs text-slate-500">
                          Created: {formatDateTime(payment.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Paid: {formatDateTime(payment.paidAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-56 items-center gap-2">
                          <select
                            value={selectedStatus}
                            onChange={(event) =>
                              setManualStatusByOrder((current) => ({
                                ...current,
                                [payment.orderId]: event.target
                                  .value as ManualPaymentStatus,
                              }))
                            }
                            disabled={
                              payment.status === "refunded" ||
                              actionKey === statusActionKey
                            }
                            className="h-10 min-w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            {manualStatuses.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => void updateManualStatus(payment)}
                            disabled={
                              payment.status === "refunded" ||
                              actionKey === statusActionKey ||
                              selectedStatus === payment.status
                            }
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionKey === statusActionKey
                              ? "Menyimpan"
                              : "Update"}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmRefund(payment)}
                          disabled={
                            payment.status !== "paid" ||
                            actionKey === refundActionKey
                          }
                          className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-all duration-300 hover:scale-105 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Refund
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Halaman {meta.page} dari {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void fetchPayments(meta.page - 1)}
              disabled={!meta.hasPrev || isLoading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => void fetchPayments(meta.page + 1)}
              disabled={!meta.hasNext || isLoading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {confirmRefund && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                <WarningCircle size={20} weight="fill" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Confirm Refund
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Refund dana ke tamu?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Request full refund akan dikirim ke Midtrans untuk order{" "}
                  <span className="break-all font-semibold text-slate-900">
                    {confirmRefund.orderId}
                  </span>{" "}
                  senilai {formatRupiah(confirmRefund.amount)}.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                {confirmRefund.reservation.guest.name}
              </p>
              <p>
                {formatDate(confirmRefund.reservation.date)} -{" "}
                {confirmRefund.reservation.session.name}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmRefund(null)}
                disabled={actionKey === `refund-${confirmRefund.id}`}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void refundPayment()}
                disabled={actionKey === `refund-${confirmRefund.id}`}
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionKey === `refund-${confirmRefund.id}`
                  ? "Memproses refund"
                  : "Konfirmasi Refund"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
