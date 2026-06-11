import type { ChartData } from "chart.js";
import {
  CalendarCheck,
  ChartLineUp,
  CreditCard,
  ForkKnife,
  UsersThree,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { chartPalette, DashboardChart } from "@/components/charts";
import { DataTable, type DataTableColumn } from "@/components/tables";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

type PaymentStatus = "paid" | "pending" | "refunded" | "failed";

type PaymentReportRow = {
  orderId: string;
  guest: string;
  channel: string;
  date: string;
  grossAmount: string;
  netAmount: string;
  status: PaymentStatus;
};

const revenueTrendData: ChartData<"line"> = {
  labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
  datasets: [
    {
      label: "Revenue",
      data: [96000000, 112000000, 108500000, 124000000, 138000000, 152000000],
      borderColor: chartPalette.primary,
      backgroundColor: chartPalette.primarySoft,
      fill: true,
      tension: 0.38,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: "Reservation",
      data: [62000000, 71000000, 69000000, 83500000, 92000000, 101000000],
      borderColor: chartPalette.dark,
      backgroundColor: chartPalette.darkSoft,
      fill: true,
      tension: 0.38,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
};

const occupancyData: ChartData<"doughnut"> = {
  labels: ["Lunch", "Dinner", "Private dining"],
  datasets: [
    {
      label: "Occupancy",
      data: [42, 46, 12],
      backgroundColor: [
        chartPalette.primary,
        chartPalette.dark,
        chartPalette.secondary,
      ],
      borderColor: "#ffffff",
      borderWidth: 4,
      hoverOffset: 8,
    },
  ],
};

const paymentStatuses: Array<StatusBadgeOption<PaymentStatus>> = [
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

const paymentRows: PaymentReportRow[] = [
  {
    orderId: "ORD-260611-001",
    guest: "Nadia Prameswari",
    channel: "Midtrans VA",
    date: "11 Jun 2026",
    grossAmount: "Rp2.400.000",
    netAmount: "Rp2.356.000",
    status: "paid",
  },
  {
    orderId: "ORD-260611-002",
    guest: "Ardi Mahendra",
    channel: "QRIS",
    date: "11 Jun 2026",
    grossAmount: "Rp1.250.000",
    netAmount: "Rp1.226.000",
    status: "pending",
  },
  {
    orderId: "ORD-260610-009",
    guest: "Sinta Larasati",
    channel: "Credit Card",
    date: "10 Jun 2026",
    grossAmount: "Rp3.800.000",
    netAmount: "Rp3.686.000",
    status: "paid",
  },
  {
    orderId: "ORD-260610-006",
    guest: "Dito Prasetyo",
    channel: "Midtrans VA",
    date: "10 Jun 2026",
    grossAmount: "Rp950.000",
    netAmount: "Rp0",
    status: "refunded",
  },
  {
    orderId: "ORD-260609-014",
    guest: "Maya Saraswati",
    channel: "QRIS",
    date: "09 Jun 2026",
    grossAmount: "Rp2.900.000",
    netAmount: "Rp0",
    status: "failed",
  },
  {
    orderId: "ORD-260609-011",
    guest: "Kevin Santoso",
    channel: "Credit Card",
    date: "09 Jun 2026",
    grossAmount: "Rp1.750.000",
    netAmount: "Rp1.696.000",
    status: "paid",
  },
];

const paymentColumns: Array<DataTableColumn<PaymentReportRow>> = [
  {
    id: "order",
    header: "Order",
    cell: (payment) => (
      <div>
        <p className="font-semibold text-slate-900">{payment.orderId}</p>
        <p className="mt-1 text-slate-500">{payment.guest}</p>
      </div>
    ),
  },
  {
    id: "date",
    header: "Date",
    accessor: "date",
  },
  {
    id: "channel",
    header: "Channel",
    accessor: "channel",
  },
  {
    id: "gross",
    header: "Gross",
    accessor: "grossAmount",
  },
  {
    id: "net",
    header: "Net",
    accessor: "netAmount",
  },
  {
    id: "status",
    header: "Status",
    cell: (payment) => (
      <StatusBadge status={payment.status} statuses={paymentStatuses} />
    ),
  },
];

export function OwnerAnalyticsPanel() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle
          eyebrow="Dev B"
          title="Owner Analytics Component Sandbox"
        />
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Area cepat untuk mengetes komponen dashboard owner dan reports sebelum
          dipindahkan ke route /owner/dashboard dan /owner/reports.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Monthly Revenue", value: "Rp152M", Icon: ChartLineUp },
          { label: "Reservations", value: "1.284", Icon: CalendarCheck },
          { label: "Occupancy", value: "86%", Icon: ForkKnife },
          { label: "Guests", value: "3.912", Icon: UsersThree },
        ].map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <DashboardChart
          type="line"
          title="Monthly Revenue Trend"
          description="Mock data agregasi untuk simulasi GET /api/admin/payments di laporan owner."
          data={revenueTrendData}
          height={320}
          footer="Gunakan pola ini untuk Executive Dashboard Dev B hari kedua."
        />

        <DashboardChart
          type="doughnut"
          title="Occupancy Mix"
          description="Distribusi okupansi per sesi untuk validasi chart ringkas."
          data={occupancyData}
          height={320}
        />
      </div>

      <div>
        <div className="mb-5">
          <SectionTitle eyebrow="Reports" title="Financial Report Table" />
        </div>
        <DataTable
          caption="Owner payment report testing rows"
          columns={paymentColumns}
          data={paymentRows}
          rowKey="orderId"
          initialPageSize={5}
          pageSizeOptions={[5, 10]}
        />
      </div>
    </div>
  );
}
