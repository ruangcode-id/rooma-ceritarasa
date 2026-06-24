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
        Periode: <span className="font-semibold text-slate-800">{period}</span>.
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
          title="Dashboard Keuangan"
          level={1}
          description={`Ringkasan cepat performa restoran. Periode utama otomatis mengikuti bulan berjalan: ${analytics.currentMonthLabel}. Detail transaksi tersedia di Financial Reports.`}
          actions={
            <Link
              href="/owner/reports"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Lihat Financial Reports
            </Link>
          }
        />
      </header>

      <section className="space-y-4">
        <DashboardSectionHeader
          title="Ringkasan Utama"
          period={analytics.currentMonthLabel}
          benefit="Untuk melihat pendapatan paid, jumlah transaksi, reservasi, dan pax yang sudah menghasilkan pembayaran pada bulan berjalan."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SimpleMetricCard
            label="Revenue Bulan Ini"
            value={formatCompactCurrency(analytics.currentMonthRevenue)}
            Icon={ChartLineUp}
            description={`Transaksi paid di ${analytics.currentMonthLabel}`}
          />
          <SimpleMetricCard
            label="Pending Payment"
            value={String(pendingPayment.count)}
            Icon={CreditCard}
            description={`${formatCurrency(pendingPayment.amount)} belum selesai di ${analytics.currentMonthLabel}`}
          />
          <SimpleMetricCard
            label="Reservasi Paid"
            value={String(analytics.currentMonthPaidReservationCount)}
            Icon={CalendarCheck}
            description={`Reservasi unik dengan pembayaran paid di ${analytics.currentMonthLabel}`}
          />
          <SimpleMetricCard
            label="Pax Paid"
            value={String(analytics.currentMonthPaidGuestCount)}
            Icon={UsersThree}
            description={`Total tamu dari reservasi paid di ${analytics.currentMonthLabel}`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <DashboardSectionHeader
          title="Masalah Reservasi"
          period={analytics.currentMonthLabel}
          benefit="Untuk melihat reservasi bulan ini yang masih perlu perhatian: pending, cancelled, atau no-show."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SimpleMetricCard
            label="Pending"
            value={String(analytics.currentMonthPendingReservationCount)}
            Icon={CalendarCheck}
            description={`Reservasi tanggal ${analytics.currentMonthLabel} yang belum confirmed/check-in`}
          />
          <SimpleMetricCard
            label="Cancelled"
            value={String(analytics.cancellationCount)}
            Icon={XCircle}
            description={`Reservasi tanggal ${analytics.currentMonthLabel} yang dibatalkan`}
          />
          <SimpleMetricCard
            label="No-Show"
            value={String(analytics.noShowCount)}
            Icon={Warning}
            description={`Reservasi tanggal ${analytics.currentMonthLabel} yang tidak hadir`}
          />
        </div>
      </section>

      <div className="grid min-w-0 gap-6">
        <DashboardChart
          type="line"
          title="Tren Pendapatan"
          description={`Deposit dan pelunasan yang berstatus paid per bulan (${analytics.reportRangeLabel}). Data ini berasal dari tabel payments dan dikelompokkan berdasarkan tanggal transaksi paid.`}
          data={revenueChartData}
          options={revenueOptions}
          height={320}
          footer={`Total pendapatan: ${formatCurrency(analytics.totalPaidRevenue)}`}
        />
      </div>
    </div>
  );
}
