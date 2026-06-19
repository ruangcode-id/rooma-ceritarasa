"use client";

import type { ChartData, ChartOptions } from "chart.js";
import {
  CalendarCheck,
  ChartLineUp,
  CreditCard,
  UsersThree,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { chartPalette, DashboardChart } from "@/components/charts";
import { DataTable, type DataTableColumn } from "@/components/tables";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";
import type {
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

const recentPaymentColumns: Array<DataTableColumn<OwnerPaymentRow>> = [
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
    header: "Date",
    cell: (payment) => formatDate(payment.reservationDate),
  },
  {
    id: "session",
    header: "Session",
    accessor: "sessionName",
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

export function OwnerDashboardClient({
  analytics,
}: {
  analytics: OwnerPaymentAnalytics;
}) {
  const revenueChartData: ChartData<"line"> = {
    labels: analytics.monthlyMetrics.map((item) => item.label),
    datasets: [
      {
        label: "Revenue",
        data: analytics.monthlyMetrics.map((item) => item.revenue),
        borderColor: chartPalette.primary,
        backgroundColor: chartPalette.primarySoft,
        fill: true,
        tension: 0.38,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Deposit",
        data: analytics.monthlyMetrics.map((item) => item.deposits),
        borderColor: chartPalette.dark,
        backgroundColor: chartPalette.darkSoft,
        fill: true,
        tension: 0.38,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const reservationTrendData: ChartData<"bar"> = {
    labels: analytics.monthlyMetrics.map((item) => item.label),
    datasets: [
      {
        label: "Reservations",
        data: analytics.monthlyMetrics.map((item) => item.reservations),
        backgroundColor: chartPalette.primarySoft,
        borderColor: chartPalette.primary,
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: "Guests",
        data: analytics.monthlyMetrics.map((item) => item.guests),
        backgroundColor: chartPalette.darkSoft,
        borderColor: chartPalette.dark,
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const paidBookingLoadItems =
    analytics.paidBookingLoadBySession.length > 0
      ? analytics.paidBookingLoadBySession
      : [{ label: "No data", loadRate: 0, guests: 0, capacity: 0 }];

  const paidBookingLoadChartData: ChartData<"doughnut"> = {
    labels: paidBookingLoadItems.map((item) => item.label),
    datasets: [
      {
        label: "Paid booking load",
        data: paidBookingLoadItems.map((item) => Math.max(item.loadRate, 1)),
        backgroundColor: [
          chartPalette.primary,
          chartPalette.dark,
          chartPalette.secondary,
          chartPalette.slate,
        ],
        borderColor: "#ffffff",
        borderWidth: 4,
      },
    ],
  };

  const revenueOptions: ChartOptions<"line"> = {
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCompactCurrency(Number(value)),
        },
      },
    },
  };

  const barOptions: ChartOptions<"bar"> = {
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const recentPayments = analytics.paymentRows.slice(0, 8);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Owner Analytics
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Executive Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Ringkasan pendapatan, tren reservasi, dan beban booking berdasarkan
          data pembayaran reservasi.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue Bulan Ini"
          value={formatCompactCurrency(analytics.currentMonthRevenue)}
          Icon={ChartLineUp}
        />
        <MetricCard
          label="Paid Payments"
          value={String(analytics.paidPaymentCount)}
          Icon={CreditCard}
        />
        <MetricCard
          label="Total Guests"
          value={String(analytics.guestCount)}
          Icon={UsersThree}
        />
        <MetricCard
          label="Paid Booking Load"
          value={`${analytics.averagePaidBookingLoadRate}%`}
          Icon={CalendarCheck}
        />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <DashboardChart
          type="line"
          title="Monthly Revenue"
          description="Pendapatan paid per bulan, dipisah antara deposit dan full payment."
          data={revenueChartData}
          options={revenueOptions}
          height={320}
          footer={`Total paid revenue: ${formatCurrency(analytics.totalPaidRevenue)}`}
        />

        <DashboardChart
          type="doughnut"
          title="Paid Booking Load by Session"
          description="Rasio tamu dari reservasi berstatus paid terhadap kapasitas unik setiap kombinasi tanggal dan sesi."
          data={paidBookingLoadChartData}
          height={320}
          footer="Kapasitas sesi hanya dihitung sekali untuk setiap tanggal."
        />
      </div>

      <section className="grid min-w-0 gap-4 md:grid-cols-3">
        {analytics.paidBookingLoadBySession.length > 0 ? (
          analytics.paidBookingLoadBySession.map((session) => (
            <article
              key={session.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Session
                  </p>
                  <h2 className="mt-2 wrap-break-word text-xl font-semibold text-slate-950">
                    {session.label}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {session.loadRate}%
                </span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-slate-500">Guests</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {session.guests}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Capacity</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {session.capacity}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Open</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {Math.max(session.capacity - session.guests, 0)}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm md:col-span-3">
            Belum ada data beban booking dari pembayaran berstatus paid.
          </article>
        )}
      </section>

      <DashboardChart
        type="bar"
        title="Reservation and Guest Trend"
        description="Tren jumlah reservasi dan total tamu dari data pembayaran enam bulan terakhir."
        data={reservationTrendData}
        options={barOptions}
        height={280}
      />

      <section>
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Latest Payments
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Recent Financial Activity
          </h2>
        </div>
        <DataTable
          caption="Recent owner payment rows"
          columns={recentPaymentColumns}
          data={recentPayments}
          rowKey="orderId"
          initialPageSize={5}
          pageSizeOptions={[5, 8]}
          emptyState="Belum ada data pembayaran."
        />
      </section>
    </div>
  );
}
