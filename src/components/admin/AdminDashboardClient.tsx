"use client";

import type { ChartData, ChartOptions } from "chart.js";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarCheck,
  ArrowClockwise,
  CheckCircle,
  Clock,
  UsersThree,
  XCircle,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { chartPalette, DashboardChart } from "@/components/charts";
import { DataTable, type DataTableColumn } from "@/components/tables";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type {
  AdminDashboardData,
  AdminDashboardReservationRow,
  AdminDashboardStatus,
} from "@/features/admin/admin-dashboard.service";

const reservationStatuses: Array<StatusBadgeOption<AdminDashboardStatus>> = [
  {
    id: "confirmed",
    label: "Confirmed",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle,
  },
  {
    id: "pending",
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    Icon: Clock,
  },
  {
    id: "checked_in",
    label: "Checked in",
    className: "bg-blue-100 text-blue-700",
    Icon: CalendarCheck,
  },
  {
    id: "cancelled",
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  {
    id: "no_show",
    label: "No show",
    className: "bg-slate-100 text-slate-500",
    Icon: XCircle,
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

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

const reservationColumns: Array<DataTableColumn<AdminDashboardReservationRow>> =
  [
    {
      id: "guest",
      header: "Guest",
      cell: (reservation) => (
        <div>
          <p className="font-semibold text-slate-900">
            {reservation.guestName}
          </p>
          <p className="mt-1 text-slate-500">{reservation.guestPhone}</p>
        </div>
      ),
    },
    {
      id: "session",
      header: "Session",
      cell: (reservation) => (
        <div>
          <p>{reservation.sessionName}</p>
          <p className="mt-1 text-slate-500">{reservation.sessionTime}</p>
        </div>
      ),
    },
    {
      id: "party",
      header: "Pax",
      accessor: "partySize",
    },
    {
      id: "tables",
      header: "Tables",
      accessor: "tables",
    },
    {
      id: "payment",
      header: "Payment",
      accessor: "paymentStatus",
    },
    {
      id: "status",
      header: "Status",
      cell: (reservation) => (
        <StatusBadge
          status={reservation.status}
          statuses={reservationStatuses}
        />
      ),
    },
  ];

export function AdminDashboardClient({
  dashboard,
}: {
  dashboard: AdminDashboardData;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const statusItems = dashboard.statusCounts.filter((item) => item.count > 0);
  const statusChartData: ChartData<"doughnut"> = {
    labels:
      statusItems.length > 0
        ? statusItems.map((item) => item.status.replace("_", " "))
        : ["No data"],
    datasets: [
      {
        label: "Reservations",
        data:
          statusItems.length > 0
            ? statusItems.map((item) => item.count)
            : [1],
        backgroundColor: [
          chartPalette.primary,
          chartPalette.secondary,
          chartPalette.dark,
          chartPalette.slate,
          chartPalette.primarySoft,
        ],
        borderColor: "#ffffff",
        borderWidth: 4,
      },
    ],
  };

  const sessionChartData: ChartData<"bar"> = {
    labels: dashboard.sessions.map((session) => session.name),
    datasets: [
      {
        label: "Guests",
        data: dashboard.sessions.map((session) => session.guests),
        backgroundColor: chartPalette.primarySoft,
        borderColor: chartPalette.primary,
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: "Checked-in guests",
        data: dashboard.sessions.map((session) => session.checkedIn),
        backgroundColor: chartPalette.darkSoft,
        borderColor: chartPalette.dark,
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const sessionOptions: ChartOptions<"bar"> = {
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

  return (
    <div
      className="relative space-y-8"
      aria-busy={isRefreshing}
    >
      {isRefreshing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-white/70 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl">
            <LoadingSpinner />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Memperbarui dashboard
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mengambil data operasional terbaru...
              </p>
            </div>
          </div>
        </div>
      )}

      <section>
        <SectionTitle
          eyebrow="Daily Operations"
          title="Dashboard Operasional Harian"
          level={1}
          description={
            <>
              Ringkasan operasional staf untuk {dashboard.dateLabel},
              berdasarkan tanggal reservasi yang dipilih.
            </>
          }
          actions={
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Tanggal reservasi
                <input
                  type="date"
                  value={dashboard.date}
                  onChange={(event) => {
                    if (!event.target.value) {
                      startRefreshTransition(() => {
                        router.replace(pathname);
                      });
                      return;
                    }

                    const params = new URLSearchParams();
                    params.set("date", event.target.value);
                    startRefreshTransition(() => {
                      router.replace(`${pathname}?${params.toString()}`);
                    });
                  }}
                  disabled={isRefreshing}
                  className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-wait disabled:opacity-60"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  startRefreshTransition(() => {
                    router.refresh();
                  });
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                <ArrowClockwise
                  size={17}
                  className={
                    isRefreshing
                      ? "animate-spin motion-reduce:animate-none"
                      : undefined
                  }
                />
                {isRefreshing ? "Memuat..." : "Refresh"}
              </button>
            </div>
          }
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Reservations"
          value={String(dashboard.metrics.totalReservations)}
          Icon={CalendarCheck}
        />
        <MetricCard
          label="Expected Guests"
          value={String(dashboard.metrics.expectedGuests)}
          Icon={UsersThree}
        />
        <MetricCard
          label="Checked-in Reservations"
          value={String(dashboard.metrics.checkedInReservations)}
          Icon={CheckCircle}
        />
        <MetricCard
          label="Awaiting Check-in"
          value={String(dashboard.metrics.awaitingCheckInReservations)}
          Icon={Clock}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <DashboardChart
          type="doughnut"
          title="Reservation Status"
          description="Distribusi status reservasi pada tanggal yang dipilih."
          data={statusChartData}
          height={300}
          footer={`Paid revenue: ${formatCurrency(
            dashboard.metrics.paidRevenue
          )}`}
        />

        <DashboardChart
          type="bar"
          title="Session Load"
          description="Jumlah expected guests dan tamu yang sudah check-in per sesi."
          data={sessionChartData}
          options={sessionOptions}
          height={300}
          footer={`Awaiting check-in: ${dashboard.metrics.awaitingCheckInReservations}`}
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {dashboard.sessions.map((session) => (
          <article
            key={session.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {session.time}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {session.name}
              </h2>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Booking</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {session.reservations}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Expected Pax</p>
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
            </div>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-5">
          <SectionTitle
            eyebrow="Selected Date"
            title="Reservation Queue"
            actions={
              <p className="text-sm text-slate-500">
                Revenue: {formatCompactCurrency(dashboard.metrics.paidRevenue)}
              </p>
            }
          />
        </div>
        <DataTable
          caption="Daily admin reservation queue"
          columns={reservationColumns}
          data={dashboard.reservations}
          rowKey="id"
          initialPageSize={8}
          pageSizeOptions={[8, 12, 20]}
          emptyState={`Belum ada reservasi pada ${dashboard.dateLabel}.`}
        />
      </section>
    </div>
  );
}
