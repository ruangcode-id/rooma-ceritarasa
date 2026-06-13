"use client";

import { useEffect, useState } from "react";
import { EnvelopeOpen, CalendarCheck, UsersThree, CheckCircle } from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import EventOfferForm from "@/components/admin/EventOfferForm";

type EventRequestRow = {
  id: string;
  guest: { id: string; name: string; phone: string; email?: string | null };
  eventType: string;
  eventDate: string;
  partySize: number;
  description: string | null;
  status: string;
  latestOffer: { id: string; price: number; documentUrl: string; status: string; createdAt: string } | null;
  createdAt: string;
};

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

  async function load(initial = false) {
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
    void load();
  }, []);

  const totalRequests = rows.length;
  const pendingRequests = rows.filter((r) => r.status === "pending").length;
  const offeredRequests = rows.filter((r) => r.status === "offered").length;
  const acceptedRequests = rows.filter((r) => r.status === "accepted").length;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Event Requests</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Event Requests</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Tinjau pengajuan acara dari publik dan kirim penawaran.</p>
      </section>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Requests" value={String(totalRequests)} Icon={EnvelopeOpen} />
        <MetricCard label="Pending" value={String(pendingRequests)} Icon={CalendarCheck} />
        <MetricCard label="Offered" value={String(offeredRequests)} Icon={UsersThree} />
        <MetricCard label="Accepted" value={String(acceptedRequests)} Icon={CheckCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Pax</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latest Offer</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      Memuat data...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      Tidak ada pengajuan event.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4 w-55">
                        <p className="font-semibold wrap-break-word">{r.guest.name}</p>
                        <p className="text-xs text-slate-500 break-all">{r.guest.phone}</p>
                        {r.guest.email && <p className="text-xs text-slate-500 break-all">{r.guest.email}</p>}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold">{r.eventType}</p>
                        <p className="text-xs text-slate-500">{new Date(r.eventDate).toLocaleDateString("id-ID")}</p>
                        {r.description && <p className="mt-2 text-xs text-slate-500 max-w-xl wrap-break-word">{r.description}</p>}
                      </td>

                      <td className="px-4 py-4">{r.partySize}</td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{r.status}</span>
                      </td>

                      <td className="px-4 py-4">
                        {r.latestOffer ? (
                          <div>
                            <p className="text-sm font-semibold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(r.latestOffer.price)}</p>
                            <a className="text-xs text-primary" href={r.latestOffer.documentUrl} target="_blank" rel="noreferrer">Lihat dokumen</a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Belum ada</p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(r)}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
                          >
                            <EnvelopeOpen size={16} />
                            Kirim Penawaran
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selected ? (
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Detail Request</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">{selected.guest.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{selected.eventType} — {new Date(selected.eventDate).toLocaleDateString("id-ID")}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-semibold">{selected.guest.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pax</p>
                  <p className="font-semibold">{selected.partySize}</p>
                </div>
                {selected.description && (
                  <div>
                    <p className="text-xs text-slate-500">Deskripsi</p>
                    <p className="text-sm text-slate-700">{selected.description}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <EventOfferForm
                  eventRequestId={selected.id}
                  onClose={() => setSelected(null)}
                  onSuccess={() => {
                    void load();
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Pilih salah satu event request untuk melihat detail dan mengirim penawaran.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
