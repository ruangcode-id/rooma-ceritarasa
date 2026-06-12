"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarCheck,
  NotePencil,
  Plus,
  Tag,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { DataTable, type DataTableColumn } from "@/components/tables";
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

type ApiListResponse<T> =
  | { success: true; data: T[] }
  | { success: false; error: string };

type ApiItemResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    className: "bg-green-100 text-green-700",
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
    className: "bg-blue-100 text-blue-700",
    Icon: CalendarCheck,
  },
  {
    id: "cancelled",
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    Icon: CalendarCheck,
  },
  {
    id: "no_show",
    label: "No show",
    className: "bg-slate-100 text-slate-500",
    Icon: CalendarCheck,
  },
];

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  return payload;
}

const visitColumns: Array<DataTableColumn<GuestVisit>> = [
  {
    id: "date",
    header: "Date",
    cell: (visit) => formatDate(visit.date),
  },
  {
    id: "party",
    header: "Pax",
    accessor: "partySize",
  },
  {
    id: "status",
    header: "Status",
    cell: (visit) => (
      <StatusBadge status={visit.status} statuses={visitStatuses} />
    ),
  },
  {
    id: "created",
    header: "Created",
    cell: (visit) => formatDate(visit.createdAt),
  },
];

export function GuestCrmClient() {
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const selectedGuestIdRef = useRef<string | null>(null);
  const [guestDetail, setGuestDetail] = useState<GuestDetail | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<GuestTag | "all">("all");
  const [noteContent, setNoteContent] = useState("");
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingTag, setUpdatingTag] = useState<GuestTag | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedGuest = useMemo(
    () => guests.find((guest) => guest.id === selectedGuestId) ?? null,
    [guests, selectedGuestId]
  );

  const loadGuestDetail = useCallback(async (guestId: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestId}`, {
        cache: "no-store",
      });
      const payload = await readJson<ApiItemResponse<GuestDetail>>(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Gagal memuat detail." : payload.error);
      }

      setGuestDetail(payload.data);
      setGuests((current) =>
        current.map((guest) =>
          guest.id === payload.data.id
            ? {
                ...guest,
                tags: payload.data.tags,
                notes: payload.data.notes,
                totalVisits: payload.data.totalVisits,
              }
            : guest
        )
      );
    } catch (requestError) {
      setGuestDetail(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal memuat detail tamu."
      );
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadGuests = useCallback(async () => {
    setLoadingGuests(true);
    setError(null);

    const params = new URLSearchParams({
      page: "1",
      limit: "50",
      sortBy: "totalVisits",
      sortOrder: "desc",
    });

    if (query.trim()) params.set("q", query.trim());
    if (tagFilter !== "all") params.set("tag", tagFilter);

    try {
      const response = await fetch(`/api/admin/guests?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await readJson<ApiListResponse<GuestListItem>>(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Gagal memuat tamu." : payload.error);
      }

      setGuests(payload.data);
      const currentSelectedId = selectedGuestIdRef.current;
      const nextSelectedId =
        currentSelectedId &&
        payload.data.some((guest) => guest.id === currentSelectedId)
          ? currentSelectedId
          : payload.data[0]?.id ?? null;

      selectedGuestIdRef.current = nextSelectedId;
      setSelectedGuestId(nextSelectedId);

      if (nextSelectedId) {
        await loadGuestDetail(nextSelectedId);
      } else {
        setGuestDetail(null);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal memuat tamu."
      );
    } finally {
      setLoadingGuests(false);
    }
  }, [loadGuestDetail, query, tagFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGuests();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadGuests]);

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guestDetail || !noteContent.trim()) return;

    setSubmittingNote(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestDetail.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      const payload = await readJson<ApiItemResponse<GuestNote>>(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Gagal menyimpan note." : payload.error);
      }

      setNoteContent("");
      await loadGuestDetail(guestDetail.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal menyimpan note."
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          add: hasTag ? [] : [tag],
          remove: hasTag ? [tag] : [],
        }),
      });
      const payload = await readJson<
        ApiItemResponse<{ id: string; tags: GuestTag[] }>
      >(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Gagal mengubah label." : payload.error);
      }

      setGuestDetail((current) =>
        current ? { ...current, tags: payload.data.tags } : current
      );
      setGuests((current) =>
        current.map((guest) =>
          guest.id === payload.data.id
            ? { ...guest, tags: payload.data.tags }
            : guest
        )
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal mengubah label."
      );
    } finally {
      setUpdatingTag(null);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Dev B Guest CRM
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Guest CRM
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Kelola profil tamu, label, internal notes, dan histori kunjungan dari
          data reservasi.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label>
            <span className="text-sm font-semibold text-slate-700">
              Search guest
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or phone"
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-slate-700">Label</span>
            <select
              value={tagFilter}
              onChange={(event) =>
                setTagFilter(event.target.value as GuestTag | "all")
              }
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All labels</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Guests
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Guest List
                </h2>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <UsersThree size={18} />
              </span>
            </div>
          </div>

          <div className="max-h-[680px] overflow-y-auto p-3">
            {loadingGuests ? (
              <p className="px-2 py-8 text-center text-sm text-slate-500">
                Memuat data tamu...
              </p>
            ) : null}

            {!loadingGuests && guests.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-slate-500">
                Belum ada tamu sesuai filter.
              </p>
            ) : null}

            {guests.map((guest) => {
              const selected = guest.id === selectedGuestId;

              return (
                <button
                  key={guest.id}
                  type="button"
                  onClick={() => {
                    selectedGuestIdRef.current = guest.id;
                    setSelectedGuestId(guest.id);
                    void loadGuestDetail(guest.id);
                  }}
                  className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-slate-100 bg-white hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {guest.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {guest.phone}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {guest.totalVisits} visits
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guest.tags.length > 0 ? (
                      guest.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No labels</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedGuest ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Pilih tamu untuk melihat detail CRM.
              </div>
            ) : (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    <UserCircle size={24} />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Guest Profile
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {selectedGuest.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedGuest.phone}
                      {selectedGuest.email ? ` / ${selectedGuest.email}` : ""}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Visits</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {selectedGuest.totalVisits}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">VIP</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {selectedGuest.isVip ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Since</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatDate(selectedGuest.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </article>

          {selectedGuest ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-primary" weight="fill" />
                <h2 className="text-xl font-semibold text-slate-950">
                  Labels
                </h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {tagOptions.map((tag) => {
                  const active = Boolean(guestDetail?.tags.includes(tag));
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={!guestDetail || updatingTag === tag}
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
          ) : null}

          {selectedGuest ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <NotePencil size={18} className="text-primary" weight="fill" />
                <h2 className="text-xl font-semibold text-slate-950">
                  Internal Notes
                </h2>
              </div>
              <form onSubmit={handleAddNote} className="mt-4">
                <label>
                  <span className="sr-only">Internal note</span>
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder="Tambahkan catatan internal untuk staf..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={!noteContent.trim() || submittingNote}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} weight="bold" />
                    Add Note
                  </button>
                </div>
              </form>

              <div className="mt-5 space-y-3">
                {loadingDetail ? (
                  <p className="text-sm text-slate-500">Memuat detail...</p>
                ) : null}
                {guestDetail?.guestNotes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Belum ada internal notes.
                  </p>
                ) : null}
                {guestDetail?.guestNotes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm leading-6 text-slate-700">
                      {note.content}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(note.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {selectedGuest ? (
            <article>
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Visit History
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Riwayat Kunjungan
                </h2>
              </div>
              <DataTable
                caption="Guest visit history"
                columns={visitColumns}
                data={guestDetail?.visitHistory ?? []}
                rowKey="id"
                initialPageSize={5}
                pageSizeOptions={[5, 10]}
                emptyState="Belum ada riwayat reservasi."
              />
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
