"use client";

import { useState } from "react";
import type { ChartData } from "chart.js";
import {
  Bell,
  CheckCircle,
  Clock,
  Layout,
  SlidersHorizontal,
  SquaresFour,
  Stack,
  XCircle,
} from "@phosphor-icons/react";
import { chartPalette } from "@/components/charts";
import { ReservationSummaryModal } from "@/components/modals/ReservationSummaryModal";
import {
  ControlsPanel,
  DataPanel,
  FormsPanel,
  PlaygroundHeader,
  PublicPanel,
  type PlaygroundTab,
} from "@/components/test-playground";
import { StatusBadge, type StatusBadgeOption } from "@/components/ui/StatusBadge";
import type { DataTableColumn } from "@/components/tables";

type TabId = "controls" | "forms" | "data" | "public";
type StatusId = "confirmed" | "pending" | "cancelled" | "checked_in";
type ReservationRow = {
  id: string;
  name: string;
  session: string;
  guests: string;
  table: string;
  payment: string;
  status: StatusId;
};

const tabs: Array<PlaygroundTab<TabId>> = [
  { id: "controls", label: "Controls", Icon: SlidersHorizontal },
  { id: "forms", label: "Forms", Icon: Stack },
  { id: "data", label: "Data", Icon: SquaresFour },
  { id: "public", label: "Public", Icon: Layout },
];

const statuses: Array<StatusBadgeOption<StatusId>> = [
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
    id: "cancelled",
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  {
    id: "checked_in",
    label: "Checked in",
    className: "bg-blue-100 text-blue-700",
    Icon: Bell,
  },
];

const reservations: ReservationRow[] = [
  {
    id: "RSV-001",
    name: "Nadia Prameswari",
    session: "15.00 - 17.00",
    guests: "4 pax",
    table: "T-08",
    payment: "Paid",
    status: "confirmed",
  },
  {
    id: "RSV-002",
    name: "Ardi Mahendra",
    session: "17.30 - 19.30",
    guests: "2 pax",
    table: "Auto assign",
    payment: "Waiting",
    status: "pending",
  },
  {
    id: "RSV-003",
    name: "Sinta Larasati",
    session: "20.00 - 22.00",
    guests: "6 pax",
    table: "VIP",
    payment: "Deposit",
    status: "checked_in",
  },
  {
    id: "RSV-004",
    name: "Bima Wicaksana",
    session: "15.00 - 17.00",
    guests: "3 pax",
    table: "T-03",
    payment: "Paid",
    status: "confirmed",
  },
  {
    id: "RSV-005",
    name: "Rara Kusumawardani",
    session: "17.30 - 19.30",
    guests: "5 pax",
    table: "T-11",
    payment: "Waiting",
    status: "pending",
  },
  {
    id: "RSV-006",
    name: "Dito Prasetyo",
    session: "20.00 - 22.00",
    guests: "2 pax",
    table: "T-02",
    payment: "Refunded",
    status: "cancelled",
  },
  {
    id: "RSV-007",
    name: "Ayu Sekarini",
    session: "15.00 - 17.00",
    guests: "4 pax",
    table: "T-05",
    payment: "Paid",
    status: "checked_in",
  },
  {
    id: "RSV-008",
    name: "Kevin Santoso",
    session: "17.30 - 19.30",
    guests: "2 pax",
    table: "Bar",
    payment: "Deposit",
    status: "confirmed",
  },
  {
    id: "RSV-009",
    name: "Maya Saraswati",
    session: "20.00 - 22.00",
    guests: "7 pax",
    table: "VIP",
    payment: "Waiting",
    status: "pending",
  },
  {
    id: "RSV-010",
    name: "Evan Hartono",
    session: "15.00 - 17.00",
    guests: "2 pax",
    table: "T-01",
    payment: "Paid",
    status: "confirmed",
  },
  {
    id: "RSV-011",
    name: "Laras Putri",
    session: "17.30 - 19.30",
    guests: "6 pax",
    table: "T-09",
    payment: "Paid",
    status: "checked_in",
  },
  {
    id: "RSV-012",
    name: "Tama Nugroho",
    session: "20.00 - 22.00",
    guests: "3 pax",
    table: "T-06",
    payment: "Cancelled",
    status: "cancelled",
  },
];

const revenueChartData: ChartData<"line"> = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  datasets: [
    {
      label: "Revenue",
      data: [5200000, 6400000, 5900000, 7100000, 8200000, 12600000, 11800000],
      borderColor: chartPalette.primary,
      backgroundColor: chartPalette.primarySoft,
      fill: true,
      tension: 0.38,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: "Deposit",
      data: [1300000, 1800000, 1500000, 2100000, 2500000, 3700000, 3400000],
      borderColor: chartPalette.dark,
      backgroundColor: chartPalette.darkSoft,
      fill: true,
      tension: 0.38,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
};

const reservationColumns: Array<DataTableColumn<ReservationRow>> = [
  {
    id: "guest",
    header: "Guest",
    cell: (reservation) => (
      <div>
        <p className="font-semibold text-slate-900">{reservation.name}</p>
        <p className="mt-1 text-slate-500">{reservation.guests}</p>
      </div>
    ),
  },
  {
    id: "session",
    header: "Session",
    accessor: "session",
  },
  {
    id: "table",
    header: "Table",
    accessor: "table",
  },
  {
    id: "payment",
    header: "Payment",
    accessor: "payment",
  },
  {
    id: "status",
    header: "Status",
    cell: (reservation) => (
      <StatusBadge status={reservation.status} statuses={statuses} />
    ),
  },
];

export default function ComponentPlayground() {
  const [activeTab, setActiveTab] = useState<TabId>("controls");
  const [activeStatus, setActiveStatus] = useState<StatusId>("confirmed");
  const [quantity, setQuantity] = useState(4);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#fcfbf9] bg-texture text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <PlaygroundHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="flex-1 py-8">
          {activeTab === "controls" ? (
            <ControlsPanel
              activeStatus={activeStatus}
              statuses={statuses}
              setActiveStatus={setActiveStatus}
              quantity={quantity}
              setQuantity={setQuantity}
              onOpenModal={() => setModalOpen(true)}
            />
          ) : null}
          {activeTab === "forms" ? <FormsPanel /> : null}
          {activeTab === "data" ? (
            <DataPanel
              chartData={revenueChartData}
              tableColumns={reservationColumns}
              tableData={reservations}
              rowKey="id"
            />
          ) : null}
          {activeTab === "public" ? <PublicPanel /> : null}
        </div>
      </div>

      {modalOpen ? (
        <ReservationSummaryModal
          activeStatus={activeStatus}
          statuses={statuses}
          quantity={quantity}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </main>
  );
}
