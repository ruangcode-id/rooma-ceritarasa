"use client";

import type { ChartData, ChartOptions } from "chart.js";
import Link from "next/link";
import {
  CalendarCheck,
  ChartLineUp,
  CreditCard,
  UsersThree,
  Warning,
  XCircle,
  Info,
} from "@phosphor-icons/react";
import { chartPalette, DashboardChart } from "@/components/charts";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type {
  OwnerPaymentAnalytics,
  OwnerPaymentStatus,
} from "@/features/owner/owner-analytics.service";

type SimpleMetricCardProps = {
  label: string;
  value: string;
  Icon: React.ComponentType<{
    size: number;
    weight: "fill" | "regular";
    className?: string;
  }>;
  description: string;
};

function SimpleMetricCard({ label, value, Icon, description }: SimpleMetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Icon size={16} weight="fill" className="text-primary" />
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>{description}</span>
      </p>
    </article>
  );
}

type DashboardSectionHeaderProps = {
  title: string;
  period: string;
  benefit: string;
};

function DashboardSectionHeader({
  title,
  period,
  benefit,
}: DashboardSectionHeaderProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
        Period: <span className="font-semibold text-slate-800">{period}</span>.
        {" "}
        {benefit}
      </p>
    </div>
  );
}

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

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

export function OwnerDashboardClient({
  analytics,
}: {
  analytics: OwnerPaymentAnalytics;
}) {
  const pendingPayment = analytics.currentMonthStatusSummary.find(
    (item) => item.status === "pending"
  ) ?? { status: "pending" as OwnerPaymentStatus, count: 0, amount: 0 };

  const revenueChartData: ChartData<"line"> = {
    labels: analytics.monthlyMetrics.map((item) => item.label),
    datasets: [
      {
        label: "Deposit",
        data: analytics.monthlyMetrics.map((item) => item.deposits),
        borderColor: chartPalette.primary,
        backgroundColor: chartPalette.primarySoft,
        fill: true,
        tension: 0.38,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Full Payment",
        data: analytics.monthlyMetrics.map((item) => item.fullPayments),
        borderColor: chartPalette.dark,
        backgroundColor: chartPalette.darkSoft,
        fill: true,
        tension: 0.38,
        pointRadius: 4,
        pointHoverRadius: 6,
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

  return (
    <div className="space-y-8">
      <header>
        <SectionTitle
          eyebrow="Owner Analytics"
          title="Financial Dashboard"
          level={1}
          description={`Quick summary of restaurant performance. The main period automatically follows the current month: ${analytics.currentMonthLabel}. Detailed transactions are available in Financial Reports.`}
          actions={
            <Link
              href="/owner/reports"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              View Financial Reports
            </Link>
          }
        />
      </header>

      <section className="space-y-4">
        <DashboardSectionHeader
          title="Main Summary"
          period={analytics.currentMonthLabel}
          benefit="Shows paid revenue, total transactions, reservations, and pax that have generated payments in the current month."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SimpleMetricCard
            label="This Month's Revenue"
            value={formatCompactCurrency(analytics.currentMonthRevenue)}
            Icon={ChartLineUp}
            description={`Paid transactions in ${analytics.currentMonthLabel}`}
          />
          <SimpleMetricCard
            label="Pending Payment"
            value={String(pendingPayment.count)}
            Icon={CreditCard}
            description={`${formatCurrency(pendingPayment.amount)} unresolved in ${analytics.currentMonthLabel}`}
          />
          <SimpleMetricCard
            label="Paid Reservations"
            value={String(analytics.currentMonthPaidReservationCount)}
            Icon={CalendarCheck}
            description={`Unique reservations with paid payment in ${analytics.currentMonthLabel}`}
          />
          <SimpleMetricCard
            label="Paid Pax"
            value={String(analytics.currentMonthPaidGuestCount)}
            Icon={UsersThree}
            description={`Total guests from paid reservations in ${analytics.currentMonthLabel}`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <DashboardSectionHeader
          title="Reservation Issues"
          period={analytics.currentMonthLabel}
          benefit="Shows this month's reservations that still need attention: pending, cancelled, or no-show."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SimpleMetricCard
            label="Pending"
            value={String(analytics.currentMonthPendingReservationCount)}
            Icon={CalendarCheck}
            description={`Reservations on ${analytics.currentMonthLabel} not yet confirmed/checked-in`}
          />
          <SimpleMetricCard
            label="Cancelled"
            value={String(analytics.cancellationCount)}
            Icon={XCircle}
            description={`Reservations on ${analytics.currentMonthLabel} that were cancelled`}
          />
          <SimpleMetricCard
            label="No-Show"
            value={String(analytics.noShowCount)}
            Icon={Warning}
            description={`Reservations on ${analytics.currentMonthLabel} that did not show up`}
          />
        </div>
      </section>

      <div className="grid min-w-0 gap-6">
        <DashboardChart
          type="line"
          title="Revenue Trend"
          description={`Deposits and full payments with paid status per month (${analytics.reportRangeLabel}). This data comes from the payments table and is grouped by paid transaction date.`}
          data={revenueChartData}
          options={revenueOptions}
          height={320}
          footer={`Total revenue: ${formatCurrency(analytics.totalPaidRevenue)}`}
        />
      </div>
    </div>
  );
}
