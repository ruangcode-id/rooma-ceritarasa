"use client";

import {
  ArrowClockwise,
  CheckCircle,
  Clock,
  CreditCard,
  CurrencyCircleDollar,
  MagnifyingGlass,
  Receipt,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/cards/MetricCard";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/tables/DataTable";
import {
  FeedbackDialog,
  type FeedbackDialogVariant,
} from "@/components/ui/FeedbackDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

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
  data: {
    data: PaymentItem[];
    summary: PaymentSummary;
    meta: PaymentMeta;
  };
};

type ApiErrorResponse = {
  success: false;
  error?: string;
};

type PaymentSummary = {
  paidRevenue: number;
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
};

type FeedbackState = {
  title: string;
  message: string;
  variant: FeedbackDialogVariant;
};

const paymentStatuses: Array<{ value: PaymentStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const paymentStatusBadges: Array<StatusBadgeOption<PaymentStatus>> = [
  {
    id: "pending",
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    Icon: Clock,
  },
  {
    id: "paid",
    label: "Paid",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle,
  },
  {
    id: "failed",
    label: "Failed",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  {
    id: "refunded",
    label: "Refunded",
    className: "bg-blue-100 text-blue-700",
    Icon: ArrowClockwise,
  },
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

function getPaymentMethodLabel(method: string | null) {
  if (!method) return "Not recorded";

  return method.replaceAll("_", " ");
}

async function parseApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiErrorResponse
    | null;

  return payload?.error ?? "Request failed to process.";
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
    throw new Error(payload.error ?? "Failed to fetch payment data.");
  }

  return payload;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    paidRevenue: 0,
    paidCount: 0,
    pendingCount: 0,
    refundedCount: 0,
  });
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
  const [confirmRefund, setConfirmRefund] = useState<PaymentItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionKey, setActionKey] = useState("");

  async function fetchPayments(
    nextPage = meta.page,
    nextOrderId = appliedOrderId,
    nextStatus = appliedStatus
  ) {
    setIsLoading(true);

    try {
      const payload = await requestPayments({
        page: nextPage,
        limit: meta.limit,
        orderId: nextOrderId,
        status: nextStatus,
      });

      setPayments(payload.data.data);
      setSummary(payload.data.summary);
      setMeta(payload.data.meta);
    } catch (err) {
      setFeedback({
        title: "Failed to load payment data",
        message:
          err instanceof Error
            ? err.message
            : "Failed to fetch payment data.",
        variant: "error",
      });
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

        setPayments(payload.data.data);
        setSummary(payload.data.summary);
        setMeta(payload.data.meta);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        setFeedback({
          title: "Failed to load payment data",
          message:
            err instanceof Error
              ? err.message
              : "Failed to fetch payment data.",
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadPayments();

    return () => controller.abort();
  }, [meta.limit]);

  function applyFilters() {
    setAppliedOrderId(orderId);
    setAppliedStatus(status);
    setMeta((current) => ({ ...current, page: 1 }));
    void fetchPayments(1, orderId, status);
  }

  function applyStatusFilter(nextStatus: string) {
    setStatus(nextStatus);
    setAppliedStatus(nextStatus);
    setMeta((current) => ({ ...current, page: 1 }));
    void fetchPayments(1, appliedOrderId, nextStatus);
  }

  async function syncPayments() {
    setIsSyncing(true);

    try {
      const response = await fetch("/api/admin/payments/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = (await response.json()) as
        | {
            success: true;
            data: {
              total: number;
              synced: number;
              notStarted: number;
              failed: number;
            };
          }
        | ApiErrorResponse;

      if (!payload.success) {
        throw new Error(
          payload.error ?? "Failed to sync payment status."
        );
      }

      setFeedback({
        title: "Midtrans sync completed",
        message:
          payload.data.total === 0
            ? "No pending or failed transactions to sync."
            : `${payload.data.synced} out of ${payload.data.total} transactions updated from Midtrans.${payload.data.notStarted > 0 ? ` ${payload.data.notStarted} payments not yet started by customer so local status is unchanged.` : ""}${payload.data.failed > 0 ? ` ${payload.data.failed} transactions encountered sync issues and need to be retried.` : ""}`,
        variant:
          payload.data.notStarted > 0 || payload.data.failed > 0
            ? "warning"
            : "success",
      });
      await fetchPayments(meta.page);
    } catch (err) {
      setFeedback({
        title: "Midtrans sync failed",
        message:
          err instanceof Error
            ? err.message
            : "Failed to sync payment status.",
        variant: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function refundPayment() {
    if (!confirmRefund) return;

    const key = `refund-${confirmRefund.id}`;
    setActionKey(key);

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
        throw new Error(payload.error ?? "Failed to process refund.");
      }

      setFeedback({
        title: "Refund successfully sent",
        message: `Refund for ${confirmRefund.orderId} was successfully sent to Midtrans.`,
        variant: "success",
      });
      setConfirmRefund(null);
      await fetchPayments(meta.page);
    } catch (err) {
      setFeedback({
        title: "Refund failed",
        message:
          err instanceof Error ? err.message : "Failed to process refund.",
        variant: "error",
      });
    } finally {
      setActionKey("");
    }
  }

  const paymentColumns: Array<DataTableColumn<PaymentItem>> = [
    {
      id: "order",
      header: "Order",
      cell: (payment) => (
        <>
          <p className="break-all font-semibold text-slate-900">
            {payment.orderId}
          </p>
          <p className="mt-1 text-xs capitalize text-slate-500">
            {payment.type} payment
          </p>
        </>
      ),
    },
    {
      id: "guest",
      header: "Guest",
      cell: (payment) => (
        <>
          <p className="font-semibold text-slate-900">
            {payment.reservation.guest.name}
          </p>
          <p className="break-all text-xs text-slate-500">
            {payment.reservation.guest.phone}
          </p>
          {payment.reservation.guest.email ? (
            <p className="break-all text-xs text-slate-500">
              {payment.reservation.guest.email}
            </p>
          ) : null}
        </>
      ),
    },
    {
      id: "reservation",
      header: "Reservation",
      cell: (payment) => (
        <>
          <p>{formatDate(payment.reservation.date)}</p>
          <p className="text-xs text-slate-500">
            {payment.reservation.session.name},{" "}
            {formatTime(payment.reservation.session.startTime)} -{" "}
            {formatTime(payment.reservation.session.endTime)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {payment.reservation.partySize} guests
          </p>
        </>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (payment) => (
        <>
          <p className="font-semibold text-slate-900">
            {formatRupiah(payment.amount)}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {getPaymentMethodLabel(payment.paymentMethod)}
          </p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (payment) => (
        <StatusBadge
          status={payment.status}
          statuses={paymentStatusBadges}
        />
      ),
    },
    {
      id: "timeline",
      header: "Timeline",
      cell: (payment) => (
        <>
          <p className="text-xs text-slate-500">
            Created: {formatDateTime(payment.createdAt)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Paid: {formatDateTime(payment.paidAt)}
          </p>
        </>
      ),
    },
    {
      id: "refund",
      header: "Refund",
      headerClassName: "text-right",
      className: "text-right",
      cell: (payment) => {
        const refundActionKey = `refund-${payment.id}`;

        return (
          <button
            type="button"
            onClick={() => setConfirmRefund(payment)}
            disabled={
              payment.status !== "paid" || actionKey === refundActionKey
            }
            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-all duration-300 hover:scale-105 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refund
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <SectionTitle
          eyebrow="Payment Operations"
          title="Midtrans Payments & Refund"
          level={1}
          description="Summary of reservation transactions, live status sync from Midtrans, and guest refund confirmation."
        />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Paid Revenue"
          value={formatCompactRupiah(summary.paidRevenue)}
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

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter payment status"
              value={status}
              onChange={(event) => applyStatusFilter(event.target.value)}
              className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              {paymentStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              {meta.total} transactions found
            </p>
            <div className="flex min-w-0 flex-1 rounded-lg border border-slate-300 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary sm:w-72">
              <span className="grid size-10 shrink-0 place-items-center text-slate-400">
                <MagnifyingGlass size={16} weight="bold" />
              </span>
              <input
                type="search"
                aria-label="Search payment transactions"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void applyFilters();
                }}
                placeholder="Search Order ID or Reservation ID..."
                className="min-w-0 flex-1 rounded-lg bg-transparent py-2 pr-3 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void syncPayments()}
              disabled={isSyncing || isLoading}
              aria-label="Refresh payment status from Midtrans"
              title="Refresh payment status"
              className="grid size-10 shrink-0 place-items-center text-slate-600 transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-wait disabled:opacity-50"
            >
              {isSyncing ? (
                <LoadingSpinner className="size-4" />
              ) : (
                <ArrowClockwise size={20} weight="bold" />
              )}
            </button>
          </div>
        </div>

        <DataTable
          columns={paymentColumns}
          data={payments}
          rowKey="id"
          caption="Reservation payment transaction list"
          loading={isLoading}
          loadingState="Loading payment data..."
          emptyState="No payments match the filter."
          tableClassName="min-w-300"
          embedded
          pagination={{
            page: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            totalPages: meta.totalPages,
            hasNext: meta.hasNext,
            hasPrev: meta.hasPrev,
            onPageChange: (page) => void fetchPayments(page),
          }}
        />
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
                  Refund to guest?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  A full refund request will be sent to Midtrans for order{" "}
                  <span className="break-all font-semibold text-slate-900">
                    {confirmRefund.orderId}
                  </span>{" "}
                  amounting to {formatRupiah(confirmRefund.amount)}.
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
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void refundPayment()}
                disabled={actionKey === `refund-${confirmRefund.id}`}
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionKey === `refund-${confirmRefund.id}`
                  ? "Processing refund"
                  : "Confirm Refund"}
              </button>
            </div>
          </section>
        </div>
      )}

      <FeedbackDialog
        open={feedback !== null}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
