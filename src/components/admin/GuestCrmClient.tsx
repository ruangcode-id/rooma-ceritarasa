"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle,
  ClockCounterClockwise,
  Crown,
  Eye,
  MagnifyingGlass,
  NotePencil,
  Plus,
  Tag,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable, type DataTableColumn } from "@/components/tables";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

type GuestTag = "VIP" | "ALLERGY" | "BIRTHDAY" | "REGULAR" | "BLACKLIST";
type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "no_show"
  | "cancelled";

type GuestListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthdate: string | null;
  isVip: boolean;
  notes: string | null;
  tags: GuestTag[];
  totalVisits: number;
  createdAt: string;
  updatedAt: string;
};

type GuestNote = {
  id: string;
  guestId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type GuestVisit = {
  id: string;
  date: string;
  partySize: number;
  status: ReservationStatus;
  sessionId: string;
  createdAt: string;
};

type GuestDetail = GuestListItem & {
  guestNotes: GuestNote[];
  visitHistory: GuestVisit[];
};

type GuestStats = {
  totalGuests: number;
  vipGuests: number;
  returningGuests: number;
  totalVisits: number;
};

type ListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ApiListResponse =
  | {
      success: true;
      data: GuestListItem[];
      meta: ListMeta;
      stats: GuestStats;
    }
  | { success: false; error: string };

type ApiItemResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const PAGE_SIZE = 10;
const tagOptions: GuestTag[] = [
  "VIP",
  "ALLERGY",
  "BIRTHDAY",
  "REGULAR",
  "BLACKLIST",
];

const visitStatuses: Array<StatusBadgeOption<ReservationStatus>> = [
  {
    id: "confirmed",
    label: "Confirmed",
    className: "bg-blue-100 text-blue-700",
    Icon: CalendarCheck,
  },
  {
    id: "pending",
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    Icon: CalendarCheck,
  },
  {
    id: "checked_in",
    label: "Checked in",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle,
  },
  {
    id: "cancelled",
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    Icon: CalendarCheck,
  },
  {
    id: "no_show",
    label: "No-Show",
    className: "bg-slate-100 text-slate-500",
    Icon: CalendarCheck,
  },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function getTagClass(tag: GuestTag) {
  switch (tag) {
    case "VIP":
      return "bg-primary/10 text-primary";
    case "ALLERGY":
      return "bg-amber-100 text-amber-700";
    case "BIRTHDAY":
      return "bg-secondary/20 text-slate-700";
    case "BLACKLIST":
      return "bg-red-50 text-red-600";
    case "REGULAR":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

const visitColumns: Array<DataTableColumn<GuestVisit>> = [
  {
    id: "date",
    header: "Date",
    headerClassName: "w-[30%] text-left",
    className: "w-[30%] align-middle text-left",
    cell: (visit) => formatDate(visit.date),
  },
  {
    id: "party",
    header: "Pax",
    accessor: "partySize",
    headerClassName: "w-[15%] text-center",
    className: "w-[15%] align-middle text-center font-semibold",
  },
  {
    id: "status",
    header: "Status",
    headerClassName: "w-[30%] text-center",
    className: "w-[30%] align-middle text-center",
    cell: (visit) => (
      <StatusBadge status={visit.status} statuses={visitStatuses} />
    ),
  },
  {
    id: "created",
    header: "Created",
    headerClassName: "w-[25%] text-left",
    className: "w-[25%] align-middle text-left",
    cell: (visit) => formatDate(visit.createdAt),
  },
];

export function GuestCrmClient() {
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [stats, setStats] = useState<GuestStats>({
    totalGuests: 0,
    vipGuests: 0,
    returningGuests: 0,
    totalVisits: 0,
  });
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<GuestTag | "all">("all");
  const [selectedGuest, setSelectedGuest] = useState<GuestListItem | null>(null);
  const [guestDetail, setGuestDetail] = useState<GuestDetail | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingTag, setUpdatingTag] = useState<GuestTag | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGuestDetail = useCallback(async (guestId: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestId}`, {
        cache: "no-store",
      });
      const payload = await readJson<ApiItemResponse<GuestDetail>>(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Failed to load detail." : payload.error);
      }

      setGuestDetail(payload.data);
      setSelectedGuest(payload.data);
      setGuests((current) =>
        current.map((guest) =>
          guest.id === payload.data.id
            ? {
                ...guest,
                tags: payload.data.tags,
                notes: payload.data.notes,
                totalVisits: payload.data.totalVisits,
              }
            : guest,
        ),
      );
    } catch (requestError) {
      setGuestDetail(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load guest detail.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoadingGuests(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortBy: "totalVisits",
        sortOrder: "desc",
      });
      if (query.trim()) params.set("q", query.trim());
      if (tagFilter !== "all") params.set("tag", tagFilter);

      fetch(`/api/admin/guests?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await readJson<ApiListResponse>(response);
          if (!response.ok || !payload.success) {
            throw new Error(
              payload.success ? "Failed to load guests." : payload.error,
            );
          }

          setGuests(payload.data);
          setMeta(payload.meta);
          setStats(payload.stats);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === "AbortError"
          ) {
            return;
          }
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load guests.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingGuests(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [page, query, refreshVersion, tagFilter]);

  function openGuestDetail(guest: GuestListItem) {
    setSelectedGuest(guest);
    setGuestDetail(null);
    setNoteContent("");
    void loadGuestDetail(guest.id);
  }

  function closeGuestDetail() {
    setSelectedGuest(null);
    setGuestDetail(null);
    setNoteContent("");
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guestDetail || !noteContent.trim()) return;

    setSubmittingNote(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestDetail.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      const payload = await readJson<ApiItemResponse<GuestNote>>(response);

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success ? "Failed to save note." : payload.error,
        );
      }

      setNoteContent("");
      await loadGuestDetail(guestDetail.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save note.",
      );
    } finally {
      setSubmittingNote(false);
    }
  }

  async function handleToggleTag(tag: GuestTag) {
    if (!guestDetail) return;

    const hasTag = guestDetail.tags.includes(tag);
    setUpdatingTag(tag);
    setError(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestDetail.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          add: hasTag ? [] : [tag],
          remove: hasTag ? [tag] : [],
        }),
      });
      const payload = await readJson<
        ApiItemResponse<{ id: string; tags: GuestTag[]; isVip: boolean }>
      >(response);

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success ? "Failed to update label." : payload.error,
        );
      }

      setGuestDetail((current) =>
        current
          ? {
              ...current,
              tags: payload.data.tags,
              isVip: payload.data.isVip,
            }
          : current,
      );
      setSelectedGuest((current) =>
        current
          ? {
              ...current,
              tags: payload.data.tags,
              isVip: payload.data.isVip,
            }
          : current,
      );
      setGuests((current) =>
        current.map((guest) =>
          guest.id === payload.data.id
            ? {
                ...guest,
                tags: payload.data.tags,
                isVip: payload.data.isVip,
              }
            : guest,
        ),
      );
      setRefreshVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update label.",
      );
    } finally {
      setUpdatingTag(null);
    }
  }

  const guestColumns: Array<DataTableColumn<GuestListItem>> = [
    {
      id: "guest",
      header: "Guest",
      headerClassName: "w-[24%] text-left",
      className: "w-[24%] align-middle text-left",
      cell: (guest) => (
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900">
            {guest.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Joined {formatDate(guest.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      headerClassName: "w-[25%] text-left",
      className: "w-[25%] align-middle text-left",
      cell: (guest) => (
        <div className="min-w-0">
          <p className="break-all text-sm text-slate-700">{guest.phone}</p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {guest.email ?? "Email not available"}
          </p>
        </div>
      ),
    },
    {
      id: "visits",
      header: "Visits",
      accessor: "totalVisits",
      headerClassName: "w-[11%] text-center",
      className: "w-[11%] align-middle text-center font-semibold",
    },
    {
      id: "labels",
      header: "Labels",
      headerClassName: "w-[25%] text-left",
      className: "w-[25%] align-middle text-left",
      cell: (guest) =>
        guest.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {guest.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTagClass(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">No labels</span>
        ),
    },
    {
      id: "actions",
      header: "Action",
      headerClassName: "w-[15%] text-center",
      className: "w-[15%] align-middle text-center",
      cell: (guest) => (
        <button
          type="button"
          onClick={() => openGuestDetail(guest)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-300 hover:scale-105 hover:bg-slate-200"
        >
          <Eye size={15} weight="bold" />
          Detail
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <SectionTitle
          eyebrow="Guest Management"
          title="Guest CRM"
          level={1}
          description="Manage guest profiles, labels, internal notes, and visit history based on reservation data."
        />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Guests"
          value={String(stats.totalGuests)}
          Icon={UsersThree}
        />
        <MetricCard
          label="VIP Guests"
          value={String(stats.vipGuests)}
          Icon={Crown}
        />
        <MetricCard
          label="Returning Guests"
          value={String(stats.returningGuests)}
          Icon={ClockCounterClockwise}
        />
        <MetricCard
          label="Total Visits"
          value={String(stats.totalVisits)}
          Icon={CalendarCheck}
        />
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <select
            aria-label="Filter guest labels"
            value={tagFilter}
            onChange={(event) => {
              setTagFilter(event.target.value as GuestTag | "all");
              setPage(1);
            }}
            className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Labels</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <div className="flex w-full rounded-lg border border-slate-300 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary lg:w-80">
            <span className="grid size-10 shrink-0 place-items-center text-slate-400">
              <MagnifyingGlass size={16} weight="bold" />
            </span>
            <input
              type="search"
              aria-label="Search guest name, phone, or email"
              placeholder="Search name, phone, or email..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 rounded-lg bg-transparent py-2 pr-3 text-sm outline-none"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <DataTable
          columns={guestColumns}
          data={guests}
          rowKey="id"
          caption="Restaurant guest list"
          loading={loadingGuests}
          loadingState={
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner className="size-4" />
              Loading guests...
            </span>
          }
          emptyState="No guests found matching the search or filter."
          tableClassName="min-w-[1050px] table-fixed"
          embedded
          pagination={{
            page: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            totalPages: meta.totalPages,
            hasNext: meta.hasNext,
            hasPrev: meta.hasPrev,
            onPageChange: setPage,
          }}
        />
      </section>

      {selectedGuest ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-detail-dialog-title"
        >
          <section className="my-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserCircle size={23} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Guest Profile
                </p>
                <h2
                  id="guest-detail-dialog-title"
                  className="mt-2 break-words text-2xl font-semibold text-slate-950"
                >
                  {selectedGuest.name}
                </h2>
                <p className="mt-2 break-all text-sm text-slate-600">
                  {selectedGuest.phone}
                  {selectedGuest.email ? ` / ${selectedGuest.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGuestDetail}
                aria-label="Close guest detail"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail && !guestDetail ? (
              <div className="grid min-h-72 place-items-center text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner className="size-4" />
                  Loading guest detail...
                </span>
              </div>
            ) : guestDetail ? (
              <div className="mt-6 max-h-[70vh] space-y-6 overflow-y-auto pr-1">
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <ProfileValue
                    label="Visits"
                    value={String(guestDetail.totalVisits)}
                  />
                  <ProfileValue
                    label="VIP"
                    value={guestDetail.isVip ? "Yes" : "No"}
                  />
                  <ProfileValue
                    label="Date of Birth"
                    value={formatDate(guestDetail.birthdate)}
                  />
                  <ProfileValue
                    label="Registered Since"
                    value={formatDate(guestDetail.createdAt)}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2">
                      <Tag size={18} className="text-primary" weight="fill" />
                      <h3 className="text-xl font-semibold text-slate-950">
                        Label
                      </h3>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tagOptions.map((tag) => {
                        const active = guestDetail.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            disabled={updatingTag === tag}
                            onClick={() => void handleToggleTag(tag)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              active
                                ? "border-primary bg-primary text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <NotePencil
                          size={18}
                          className="text-primary"
                          weight="fill"
                        />
                        <h3 className="text-xl font-semibold text-slate-950">
                          Internal Notes
                        </h3>
                      </div>
                      <span className="text-sm text-slate-500">
                        {guestDetail.guestNotes.length} notes
                      </span>
                    </div>
                    <form onSubmit={handleAddNote} className="mt-4">
                      <textarea
                        value={noteContent}
                        onChange={(event) => setNoteContent(event.target.value)}
                        placeholder="Add a note for staff..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="submit"
                          disabled={!noteContent.trim() || submittingNote}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingNote ? (
                            <LoadingSpinner className="size-4 border-white/40 border-t-white" />
                          ) : (
                            <Plus size={16} weight="bold" />
                          )}
                          Add Note
                        </button>
                      </div>
                    </form>
                    <div className="mt-4 max-h-48 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
                      {guestDetail.guestNotes.length === 0 ? (
                        <p className="py-4 text-sm text-slate-500">
                          No internal notes yet.
                        </p>
                      ) : null}
                      {guestDetail.guestNotes.map((note) => (
                        <div key={note.id} className="py-3">
                          <p className="text-sm leading-6 text-slate-700">
                            {note.content}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(note.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>

                <article>
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      Visit History
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                      Reservation History
                    </h3>
                  </div>
                  <DataTable
                    caption="Guest reservation history"
                    columns={visitColumns}
                    data={guestDetail.visitHistory}
                    rowKey="id"
                    initialPageSize={5}
                    pageSizeOptions={[5, 10]}
                    emptyState="No reservation history yet."
                    tableClassName="min-w-[680px] table-fixed"
                  />
                </article>
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center text-sm text-red-600">
                Guest detail could not be loaded.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}
