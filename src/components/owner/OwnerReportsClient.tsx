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
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";
import type {
  OwnerMonthlyMetric,
  OwnerPaymentAnalytics,
  OwnerPaymentRow,
  OwnerPaymentStatus,
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
  all: "Semua status",
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

const statusOrder: OwnerPaymentStatus[] = [
  "paid",
  "pending",
  "failed",
  "refunded",
];

const statusChartColors: Record<OwnerPaymentStatus, string> = {
  paid: chartPalette.primary,
  pending: chartPalette.secondary,
  failed: chartPalette.slate,
  refunded: chartPalette.dark,
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
  timeZone: "Asia/Jakarta",
});

const dateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jakarta",
});

const filterControlClassName =
  "mt-2 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:ring-2 focus:ring-primary/30";

const presetButtonClassName =
  "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50";

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
  if (value === "full") return "Pelunasan";
  if (value === "refund") return "Refund";
  return "Deposit";
}

function getTransactionDate(payment: OwnerPaymentRow) {
  return payment.paidAt ?? payment.createdAt;
}

function getDateInputValue(value: string) {
  const parts = dateInputFormatter.formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function getJakartaDateInputValue(value = new Date()) {
  const parts = dateInputFormatter.formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function getJakartaMonthStartInputValue(value = new Date()) {
  const parts = dateInputFormatter.formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";

  return `${year}-${month}-01`;
}

function getDaysAgoInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return getJakartaDateInputValue(date);
}

function sumByStatus(rows: OwnerPaymentRow[], status: OwnerPaymentStatus) {
  return rows
    .filter((payment) => payment.status === status)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

const paymentColumns: Array<DataTableColumn<OwnerPaymentRow>> = [
  {
    id: "order",
    header: "Order",
    headerClassName: "w-[24%] text-left",
    className: "w-[24%] align-middle text-left",
    cell: (payment) => (
      <div className="min-w-0">
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
    id: "transactionDate",
    header: "Transaksi",
    headerClassName: "w-[16%] text-left",
    className: "w-[16%] align-middle text-left",
    cell: (payment) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">
          {formatDate(getTransactionDate(payment))}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Reservasi {formatDate(payment.reservationDate)}
        </p>
      </div>
    ),
  },
  {
    id: "reservation",
    header: "Reservasi",
    headerClassName: "w-[16%] text-left",
    className: "w-[16%] align-middle text-left",
    cell: (payment) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{payment.sessionName}</p>
        <p className="mt-1 text-xs text-slate-500">{payment.partySize} pax</p>
      </div>
    ),
  },
  {
    id: "type",
    header: "Tipe",
    headerClassName: "w-[13%] text-left",
    className: "w-[13%] align-middle text-left",
    cell: (payment) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">
          {formatPaymentType(payment.paymentType)}
        </p>
        <p className="mt-1 wrap-break-word text-xs text-slate-500">
          {payment.paymentMethod}
        </p>
      </div>
    ),
  },
  {
    id: "amount",
    header: "Nominal",
    headerClassName: "w-[17%] text-right",
    className: "w-[17%] align-middle text-right font-semibold text-slate-900",
    cell: (payment) => formatCurrency(payment.amount),
  },
  {
    id: "status",
    header: "Status",
    headerClassName: "w-[14%] text-center",
    className: "w-[14%] align-middle text-center",
    cell: (payment) => (
      <StatusBadge status={payment.status} statuses={paymentStatuses} />
    ),
  },
];

const monthlyColumns: Array<DataTableColumn<OwnerMonthlyMetric>> = [
  {
    id: "month",
    header: "Bulan",
    accessor: "label",
  },
  {
    id: "revenue",
    header: "Revenue Paid",
    cell: (month) => formatCurrency(month.revenue),
  },
  {
    id: "deposit",
    header: "Deposit",
    cell: (month) => formatCurrency(month.deposits),
  },
  {
    id: "full",
    header: "Pelunasan",
    cell: (month) => formatCurrency(month.fullPayments),
  },
  {
    id: "reservations",
    header: "Reservasi",
    accessor: "reservations",
  },
  {
    id: "guests",
    header: "Pax",
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const currentMonthStatusSummary = useMemo(
    () =>
      new Map(
        analytics.currentMonthStatusSummary.map((item) => [item.status, item])
      ),
    [analytics.currentMonthStatusSummary]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return analytics.paymentRows.filter((payment) => {
      const transactionDate = getDateInputValue(getTransactionDate(payment));

      const matchesStatus =
        statusFilter === "all" || payment.status === statusFilter;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        payment.orderId.toLowerCase().includes(normalizedQuery) ||
        payment.guestName.toLowerCase().includes(normalizedQuery) ||
        payment.sessionName.toLowerCase().includes(normalizedQuery);

      const matchesStartDate =
        startDate.length === 0 || transactionDate >= startDate;

      const matchesEndDate =
        endDate.length === 0 || transactionDate <= endDate;

      return matchesStatus && matchesQuery && matchesStartDate && matchesEndDate;
    });
  }, [analytics.paymentRows, endDate, query, startDate, statusFilter]);

  const filteredStatusSummary = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        count: filteredRows.filter((payment) => payment.status === status)
          .length,
        amount: sumByStatus(filteredRows, status),
      })),
    [filteredRows]
  );

  const visibleStatusSummary = filteredStatusSummary.filter(
    (item) => item.count > 0 || item.amount > 0
  );

  const totalFilteredAmount = filteredStatusSummary.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const filteredPaidAmount = sumByStatus(filteredRows, "paid");

  const statusChartData: ChartData<"doughnut"> = {
    labels:
      visibleStatusSummary.length > 0
        ? visibleStatusSummary.map((item) => statusLabels[item.status])
        : ["Tidak ada data"],
    datasets: [
      {
        label: "Nominal pembayaran",
        data:
          visibleStatusSummary.length > 0
            ? visibleStatusSummary.map((item) => item.amount)
            : [1],
        backgroundColor:
          visibleStatusSummary.length > 0
            ? visibleStatusSummary.map((item) => statusChartColors[item.status])
            : [chartPalette.slate],
        borderColor: "white",
        borderWidth: 4,
      },
    ],
  };

  const statusFooterText =
    visibleStatusSummary.length > 0
      ? `Total nominal: ${formatCompactCurrency(
          totalFilteredAmount
        )} • ${filteredRows.length} transaksi sesuai filter`
      : "Tidak ada data sesuai filter.";

  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    startDate.length > 0 ||
    endDate.length > 0;

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  }

  function applyTodayFilter() {
    const today = getJakartaDateInputValue();

    setStartDate(today);
    setEndDate(today);
  }

  function applyLastSevenDaysFilter() {
    setStartDate(getDaysAgoInputValue(6));
    setEndDate(getJakartaDateInputValue());
  }

  function applyCurrentMonthFilter() {
    setStartDate(getJakartaMonthStartInputValue());
    setEndDate(getJakartaDateInputValue());
  }

  return (
    <div className="relative space-y-8">
      <section>
        <SectionTitle
          eyebrow="Financial Reports"
          title="Laporan Keuangan"
          level={1}
          description={`Ringkasan keuangan bulan ${analytics.currentMonthLabel}. Gunakan filter untuk audit transaksi berdasarkan status, tamu, order, sesi, dan tanggal.`}
        />
      </section>

      <section
        aria-label="Ringkasan laporan keuangan"
        className="grid min-w-0 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="min-w-0 *:h-full">
          <MetricCard
            label="Revenue"
            value={formatCompactCurrency(analytics.currentMonthRevenue)}
            Icon={Receipt}
          />
        </div>

        <div className="min-w-0 *:h-full">
          <MetricCard
            label="Paid Orders"
            value={String(analytics.currentMonthPaidPaymentCount)}
            Icon={CreditCard}
          />
        </div>

        <div className="min-w-0 *:h-full">
          <MetricCard
            label="Pending"
            value={formatCompactCurrency(
              currentMonthStatusSummary.get("pending")?.amount ?? 0
            )}
            Icon={CalendarCheck}
          />
        </div>

        <div className="min-w-0 *:h-full">
          <MetricCard
            label="Refunded"
            value={formatCompactCurrency(
              currentMonthStatusSummary.get("refunded")?.amount ?? 0
            )}
            Icon={ChartLineUp}
          />
        </div>
      </section>

      <section className="min-w-0">
        <DashboardChart
          type="doughnut"
          title="Distribusi Status"
          description="Distribusi nominal pembayaran berdasarkan status."
          data={statusChartData}
          height={300}
          footer={statusFooterText}
        />

        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filteredStatusSummary.map((item) => (
            <article
              key={item.status}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <StatusBadge status={item.status} statuses={paymentStatuses} />
                <p className="shrink-0 text-xs text-slate-500">
                  {item.count} trx
                </p>
              </div>

              <p
                title={formatCurrency(item.amount)}
                className="mt-3 truncate text-lg font-semibold text-slate-950"
              >
                {formatCompactCurrency(item.amount)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-5">
          <SectionTitle
            eyebrow="Monthly Recap"
            title="Breakdown Bulanan"
            description={`Rekap enam bulan terakhir (${analytics.reportRangeLabel}) dari transaksi paid, dipisahkan antara deposit dan pelunasan.`}
            actions={
              <p className="text-sm text-slate-500">6 bulan terakhir</p>
            }
          />
        </div>

        <DataTable
          caption="Monthly owner financial recap"
          columns={monthlyColumns}
          data={analytics.monthlyMetrics}
          rowKey="label"
          initialPageSize={6}
          pageSizeOptions={[6]}
          emptyState="Belum ada data rekap bulanan."
          tableClassName="min-w-[900px]"
        />
      </section>

      <section className="min-w-0">
        <div className="mb-5">
          <SectionTitle
            eyebrow="Transaction Filter"
            title="Filter Transaksi"
            description={`${filteredRows.length} transaksi ditemukan berdasarkan filter yang sedang aktif.`}
            actions={
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            }
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.4fr_1.4fr]">
            <label className="min-w-0 text-sm font-semibold text-slate-700">
              Status
              <select
                aria-label="Filter status pembayaran"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as OwnerPaymentStatus | "all"
                  )
                }
                className={filterControlClassName}
              >
                <option value="all">Semua Status</option>
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-700">
              Pencarian
              <div className="mt-2 flex h-10 min-w-0 rounded-xl border border-slate-200 bg-white transition focus-within:ring-2 focus-within:ring-primary/30">
                <span className="grid size-10 shrink-0 place-items-center text-slate-400">
                  <MagnifyingGlass size={16} weight="bold" />
                </span>
                <input
                  type="search"
                  aria-label="Cari transaksi pembayaran"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari order ID, nama tamu, atau sesi..."
                  className="min-w-0 flex-1 rounded-xl bg-transparent py-2 pr-3 text-sm font-normal text-slate-900 outline-none"
                />
              </div>
            </label>

            <div className="min-w-0 text-sm font-semibold text-slate-700">
              Rentang Tanggal
              <div className="mt-2 grid min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:ring-2 focus-within:ring-primary/30 sm:grid-cols-[1fr_auto_1fr]">
                <input
                  type="date"
                  aria-label="Tanggal mulai"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 min-w-0 bg-transparent px-3 text-sm font-normal text-slate-900 outline-none"
                />

                <span className="grid h-10 shrink-0 place-items-center border-y border-slate-200 px-3 text-xs font-normal text-slate-400 sm:border-x sm:border-y-0">
                  sampai
                </span>

                <input
                  type="date"
                  aria-label="Tanggal akhir"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 min-w-0 bg-transparent px-3 text-sm font-normal text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <p className="mr-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Cepat
            </p>

            <button
              type="button"
              onClick={applyTodayFilter}
              className={presetButtonClassName}
            >
              Hari ini
            </button>

            <button
              type="button"
              onClick={applyLastSevenDaysFilter}
              className={presetButtonClassName}
            >
              7 hari terakhir
            </button>

            <button
              type="button"
              onClick={applyCurrentMonthFilter}
              className={presetButtonClassName}
            >
              Bulan ini
            </button>

            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Bersihkan
            </button>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-5">
          <SectionTitle
            eyebrow="Payment Ledger"
            title="Daftar Transaksi"
            actions={
              <p className="text-sm text-slate-500">
                Total paid: {formatCompactCurrency(filteredPaidAmount)}
              </p>
            }
          />
        </div>

        <DataTable
          columns={paymentColumns}
          data={filteredRows}
          rowKey="orderId"
          caption="Owner payment ledger"
          emptyState="Tidak ada pembayaran sesuai filter."
          tableClassName="min-w-[1000px] table-fixed"
        />
      </section>
    </div>
  );
}