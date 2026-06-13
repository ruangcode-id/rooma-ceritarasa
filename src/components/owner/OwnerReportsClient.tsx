"use client";

import { useMemo, useState } from "react";
import type { ChartData } from "chart.js";
import {
  CalendarCheck,
  ChartLineUp,
  CreditCard,
  MagnifyingGlass,
  Receipt,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { chartPalette, DashboardChart } from "@/components/charts";
import { DataTable, type DataTableColumn } from "@/components/tables";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";
import type {
  OwnerMonthlyMetric,
  OwnerPaymentAnalytics,
  OwnerPaymentRow,
  OwnerPaymentStatus,
  OwnerStatusSummary,
} from "@/features/owner/owner-analytics.service";

const paymentStatuses: Array<StatusBadgeOption<OwnerPaymentStatus>> = [
  {
    id: "paid",
    label: "Paid",
    className: "bg-green-100 text-green-700",
    Icon: CreditCard,
  },
  {
    id: "pending",
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    Icon: CalendarCheck,
  },
  {
    id: "refunded",
    label: "Refunded",
    className: "bg-blue-100 text-blue-700",
    Icon: ChartLineUp,
  },
  {
    id: "failed",
    label: "Failed",
    className: "bg-red-100 text-red-700",
    Icon: CreditCard,
  },
];

const statusLabels: Record<OwnerPaymentStatus | "all", string> = {
  all: "All status",
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatPaymentType(value: string) {
  return value === "full" ? "Full payment" : "Deposit";
}

function getStatusAmount(
  statusSummary: OwnerStatusSummary[],
  status: OwnerPaymentStatus
) {
  return statusSummary.find((item) => item.status === status)?.amount ?? 0;
}

const paymentColumns: Array<DataTableColumn<OwnerPaymentRow>> = [
  {
    id: "order",
    header: "Order",
    cell: (payment) => (
      <div>
        <p className="break-all font-semibold text-slate-900">
          {payment.orderId}
        </p>
        <p className="mt-1 wrap-break-word text-slate-500">
          {payment.guestName}
        </p>
      </div>
    ),
  },
  {
    id: "date",
    header: "Reservation",
    cell: (payment) => (
      <div>
        <p>{formatDate(payment.reservationDate)}</p>
        <p className="mt-1 text-slate-500">{payment.sessionName}</p>
      </div>
    ),
  },
  {
    id: "type",
    header: "Type",
    cell: (payment) => formatPaymentType(payment.paymentType),
  },
  {
    id: "method",
    header: "Method",
    accessor: "paymentMethod",
  },
  {
    id: "amount",
    header: "Amount",
    cell: (payment) => formatCurrency(payment.amount),
  },
  {
    id: "status",
    header: "Status",
    cell: (payment) => (
      <StatusBadge status={payment.status} statuses={paymentStatuses} />
    ),
  },
];

const monthlyColumns: Array<DataTableColumn<OwnerMonthlyMetric>> = [
  {
    id: "month",
    header: "Month",
    accessor: "label",
  },
  {
    id: "revenue",
    header: "Revenue",
    cell: (month) => formatCurrency(month.revenue),
  },
  {
    id: "deposit",
    header: "Deposit",
    cell: (month) => formatCurrency(month.deposits),
  },
  {
    id: "full",
    header: "Full",
    cell: (month) => formatCurrency(month.fullPayments),
  },
  {
    id: "reservations",
    header: "Reservations",
    accessor: "reservations",
  },
  {
    id: "guests",
    header: "Guests",
    accessor: "guests",
  },
];

export function OwnerReportsClient({
  analytics,
}: {
  analytics: OwnerPaymentAnalytics;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OwnerPaymentStatus | "all">(
    "all"
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return analytics.paymentRows.filter((payment) => {
      const matchesStatus =
        statusFilter === "all" || payment.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        payment.orderId.toLowerCase().includes(normalizedQuery) ||
        payment.guestName.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [analytics.paymentRows, query, statusFilter]);

  const statusChartData: ChartData<"doughnut"> = {
    labels: analytics.statusSummary.map(
      (item) => statusLabels[item.status] ?? item.status
    ),
    datasets: [
      {
        label: "Payment amount",
        data: analytics.statusSummary.map((item) => Math.max(item.amount, 1)),
        backgroundColor: [
          chartPalette.primary,
          chartPalette.secondary,
          chartPalette.slate,
          chartPalette.dark,
        ],
        borderColor: "#ffffff",
        borderWidth: 4,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Financial Reports
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Owner Financial Reports
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Laporan pembayaran reservasi dari agregasi data payments untuk
          pemantauan owner.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Paid Revenue"
          value={formatCompactCurrency(analytics.totalPaidRevenue)}
          Icon={Receipt}
        />
        <MetricCard
          label="Pending"
          value={formatCompactCurrency(analytics.pendingAmount)}
          Icon={CalendarCheck}
        />
        <MetricCard
          label="Refunded"
          value={formatCompactCurrency(analytics.refundedAmount)}
          Icon={ChartLineUp}
        />
        <MetricCard
          label="Payments"
          value={String(analytics.totalPaymentCount)}
          Icon={CreditCard}
        />
      </div>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analytics.statusSummary.map((summary) => (
          <article
            key={summary.status}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Payment Status
                </p>
                <h2 className="mt-2 wrap-break-word text-xl font-semibold text-slate-950">
                  {statusLabels[summary.status]}
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {summary.count} rows
              </span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Amount</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatCompactCurrency(summary.amount)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className="mt-1 font-semibold capitalize text-slate-950">
                  {summary.status}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <DashboardChart
          type="doughnut"
          title="Payment Status Mix"
          description="Distribusi nominal pembayaran berdasarkan status."
          data={statusChartData}
          height={300}
          footer={`Paid ${formatCurrency(
            getStatusAmount(analytics.statusSummary, "paid")
          )}`}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Filters
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Payment Ledger
              </h2>
            </div>
            <div className="grid w-full min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-130">
              <label className="relative block">
                <span className="sr-only">Search order or guest</span>
                <MagnifyingGlass
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search order or guest"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label>
                <span className="sr-only">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as OwnerPaymentStatus | "all")
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-primary/30"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>

      <DataTable
        caption="Owner payment ledger"
        columns={paymentColumns}
        data={filteredRows}
        rowKey="orderId"
        initialPageSize={10}
        pageSizeOptions={[10, 20, 50]}
        emptyState="Tidak ada pembayaran sesuai filter."
      />

      <section>
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Monthly Recap
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Revenue Breakdown
          </h2>
        </div>
        <DataTable
          caption="Monthly owner financial recap"
          columns={monthlyColumns}
          data={analytics.monthlyMetrics}
          rowKey="label"
          initialPageSize={6}
          pageSizeOptions={[6]}
        />
      </section>
    </div>
  );
}
