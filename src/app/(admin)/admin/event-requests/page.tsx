"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle,
  EnvelopeOpen,
  UsersThree,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import EventOfferForm from "@/components/admin/EventOfferForm";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/tables/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

type EventRequestStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "rejected"
  | "cancelled";

type EventRequestRow = {
  id: string;
  guest: { id: string; name: string; phone: string; email?: string | null };
  eventType: string;
  eventDate: string;
  partySize: number;
  description: string | null;
  status: EventRequestStatus;
  latestOffer: { id: string; price: number; documentUrl: string; status: string; createdAt: string } | null;
  createdAt: string;
};

const eventRequestStatuses: Array<
  StatusBadgeOption<EventRequestStatus>
> = [
  {
    id: "pending",
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    Icon: CalendarCheck,
  },
  {
    id: "offered",
    label: "Offered",
    className: "bg-blue-100 text-blue-700",
    Icon: EnvelopeOpen,
  },
  {
    id: "accepted",
    label: "Accepted",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle,
  },
  {
    id: "rejected",
    label: "Rejected",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  {
    id: "cancelled",
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600",
    Icon: XCircle,
  },
];

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

async function requestEventRequests(signal?: AbortSignal) {
  const res = await fetch(`/api/admin/event-requests`, { cache: "no-store", signal });
  const payload = await res.json();
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Gagal mengambil event requests.");
  }

  return payload.data as EventRequestRow[];
}
export default function AdminEventRequestsPage() {
  const [rows, setRows] = useState<EventRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EventRequestRow | null>(null);

  async function load() {
    setIsLoading(true);
    setError("");

    try {
      const data = await requestEventRequests();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    requestEventRequests(controller.signal)
      .then((data) => {
        setRows(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const totalRequests = rows.length;
  const pendingRequests = rows.filter((r) => r.status === "pending").length;
  const offeredRequests = rows.filter((r) => r.status === "offered").length;
  const acceptedRequests = rows.filter((r) => r.status === "accepted").length;

  const eventRequestColumns: Array<DataTableColumn<EventRequestRow>> = [
    {
      id: "guest",
      header: "Guest",
      headerClassName: "w-[21%] text-left",
      className: "w-[21%] align-middle text-left",
      cell: (request) => (
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900">
            {request.guest.name}
          </p>
          <p className="break-all text-xs text-slate-500">
            {request.guest.phone}
          </p>
          {request.guest.email ? (
            <p className="break-all text-xs text-slate-500">
              {request.guest.email}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "event",
      header: "Event",
      headerClassName: "w-[27%] text-left",
      className: "w-[27%] align-middle text-left",
      cell: (request) => (
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900">
            {request.eventType}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(request.eventDate).toLocaleDateString("id-ID")}
          </p>
          {request.description ? (
            <p className="mt-2 break-words text-xs text-slate-500">
              {request.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "partySize",
      header: "Pax",
      accessor: "partySize",
      headerClassName: "w-[8%] text-center",
      className: "w-[8%] align-middle text-center",
    },
    {
      id: "status",
      header: "Status",
      headerClassName: "w-[14%] text-center",
      className: "w-[14%] align-middle text-center",
      cell: (request) => (
        <StatusBadge
          status={request.status}
          statuses={eventRequestStatuses}
        />
      ),
    },
    {
      id: "latestOffer",
      header: "Latest Offer",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (request) =>
        request.latestOffer ? (
          <div className="min-w-0 text-center">
            <p className="break-words font-semibold text-slate-900">
              {currencyFormatter.format(request.latestOffer.price)}
            </p>
            <a
              className="text-xs text-primary hover:underline"
              href={request.latestOffer.documentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Lihat dokumen
            </a>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Belum ada</p>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (request) =>
        request.status === "pending" ? (
          <button
            type="button"
            onClick={() => setSelected(request)}
            className="w-32 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-all duration-300 hover:scale-105 hover:bg-primary/20"
          >
            Kirim Penawaran
          </button>
        ) : (
          <span className="text-xs text-slate-400">Tidak tersedia</span>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <SectionTitle
          eyebrow="Event Requests"
          title="Event Requests"
          level={1}
          description="Tinjau pengajuan acara dari publik dan kirim penawaran."
        />
      </header>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Requests" value={String(totalRequests)} Icon={EnvelopeOpen} />
        <MetricCard label="Pending" value={String(pendingRequests)} Icon={CalendarCheck} />
        <MetricCard label="Offered" value={String(offeredRequests)} Icon={UsersThree} />
        <MetricCard label="Accepted" value={String(acceptedRequests)} Icon={CheckCircle} />
      </div>

      <DataTable
        columns={eventRequestColumns}
        data={rows}
        rowKey="id"
        caption="Daftar pengajuan acara"
        initialPageSize={10}
        loading={isLoading}
        loadingState={
          <span className="inline-flex items-center gap-2">
            <LoadingSpinner className="size-4" />
            Memuat data...
          </span>
        }
        emptyState="Tidak ada pengajuan event."
        tableClassName="min-w-[1100px] table-fixed"
      />

      {selected?.status === "pending" && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-offer-dialog-title"
        >
          <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <EnvelopeOpen size={22} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Event Offer
                </p>
                <h2
                  id="event-offer-dialog-title"
                  className="mt-2 text-2xl font-semibold text-slate-950"
                >
                  Kirim penawaran acara
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Lengkapi harga dan dokumen penawaran untuk request{" "}
                  <span className="font-semibold text-slate-900">
                    {selected.guest.name}
                  </span>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Tutup form penawaran"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Event
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selected.eventType}
                </p>
                <p>
                  {new Date(selected.eventDate).toLocaleDateString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Tamu
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selected.partySize} orang
                </p>
                <p>{selected.guest.phone}</p>
              </div>
              {selected.description ? (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    Deskripsi
                  </p>
                  <p className="mt-1 text-slate-700">{selected.description}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <EventOfferForm
                eventRequestId={selected.id}
                onClose={() => setSelected(null)}
                onSuccess={() => {
                  setSelected(null);
                  void load();
                }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
