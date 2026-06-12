"use client";

import {
  CalendarCheck,
  CheckCircle,
  CurrencyCircleDollar,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/cards/MetricCard";

type ReservationItem = {
  id: string;
  date: string;
  partySize: number;
  status: string;
  specialRequest: string | null;
  expiresAt: string | null;
  createdAt: string;
  guest: {
    name: string;
    phone: string;
    email: string | null;
  };
  session: {
    name: string;
    startTime: string;
    endTime: string;
  };
  payment: {
    type: string;
    amount: number;
    status: string;
    midtransOrderId: string | null;
    paidAt: string | null;
  } | null;
  tables: {
    id: string;
    tableNumber: string;
    capacity: number;
  }[];
};

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

const compactRupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCompactRupiah(amount: number) {
  return compactRupiahFormatter.format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string) {
  if (!time) return "-";

  const date = new Date(time);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }

  return time.slice(0, 5);
}

async function requestReservations(
  nextStatus: string,
  nextDate: string,
  signal?: AbortSignal
) {
  const params = new URLSearchParams();

  if (nextStatus) params.set("status", nextStatus);
  if (nextDate) params.set("date", nextDate);

  const query = params.toString();
  const response = await fetch(
    `/api/admin/reservations${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Gagal mengambil reservasi.");
  }

  return data.data as ReservationItem[];
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchReservations(nextStatus = status, nextDate = date) {
    setIsLoading(true);
    setError("");

    try {
      const rows = await requestReservations(nextStatus, nextDate);
      setReservations(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil reservasi."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialReservations() {
      try {
        const rows = await requestReservations("", "", controller.signal);
        setReservations(rows);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Gagal mengambil reservasi."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialReservations();

    return () => controller.abort();
  }, []);

  const totalGuests = reservations.reduce(
    (sum, reservation) => sum + reservation.partySize,
    0
  );
  const confirmedReservations = reservations.filter(
    (reservation) => reservation.status === "confirmed"
  ).length;
  const checkedInReservations = reservations.filter(
    (reservation) => reservation.status === "checked_in"
  ).length;
  const pendingReservations = reservations.filter(
    (reservation) => reservation.status === "pending"
  ).length;
  const paidRevenue = reservations.reduce((sum, reservation) => {
    if (reservation.payment?.status !== "paid") return sum;

    return sum + reservation.payment.amount;
  }, 0);

  return (
    <div className="space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Reservation Management
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Reservasi
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Kelola reservasi, pembayaran, session, dan meja yang ter-assign.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Reservations"
            value={String(reservations.length)}
            Icon={CalendarCheck}
          />
          <MetricCard
            label="Expected Guests"
            value={String(totalGuests)}
            Icon={UsersThree}
          />
          <MetricCard
            label="Confirmed"
            value={String(confirmedReservations)}
            Icon={CheckCircle}
          />
          <MetricCard
            label="Paid Revenue"
            value={formatCompactRupiah(paidRevenue)}
            Icon={CurrencyCircleDollar}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Filters
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Reservation Queue
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                Pending {pendingReservations}
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                Checked in {checkedInReservations}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm">
              Status
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </label>

            <label className="text-sm">
              Tanggal
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => fetchReservations()}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105"
              >
                Filter
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setDate("");
                  fetchReservations("", "");
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:scale-105"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Pax</th>
                  <th className="px-4 py-3">Meja</th>
                  <th className="px-4 py-3">Reservasi</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      Memuat data reservasi...
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      Tidak ada reservasi.
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="break-words font-semibold">
                          {reservation.guest.name}
                        </p>
                        <p className="break-all text-xs text-slate-500">
                          {reservation.guest.phone}
                        </p>
                        {reservation.guest.email && (
                          <p className="break-all text-xs text-slate-500">
                            {reservation.guest.email}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {formatDate(reservation.date)}
                      </td>

                      <td className="px-4 py-4">
                        <p>{reservation.session.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatTime(reservation.session.startTime)} -{" "}
                          {formatTime(reservation.session.endTime)}
                        </p>
                      </td>

                      <td className="px-4 py-4">{reservation.partySize}</td>

                      <td className="px-4 py-4">
                        {reservation.tables && reservation.tables.length > 0
                          ? reservation.tables
                              .map(
                                (table) =>
                                  `${table.tableNumber} (${table.capacity})`
                              )
                              .join(", ")
                          : "-"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                          {reservation.status}
                        </span>

                        {reservation.expiresAt && (
                          <p className="mt-2 text-xs text-amber-600">
                            Expired:{" "}
                            {new Date(reservation.expiresAt).toLocaleString(
                              "id-ID"
                            )}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {reservation.payment ? (
                          <>
                            <p className="font-semibold">
                              {formatRupiah(reservation.payment.amount)}
                            </p>
                            <p className="text-xs capitalize text-slate-500">
                              {reservation.payment.status}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Tanpa deposit
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[14rem] break-words text-xs text-slate-500">
                          {reservation.specialRequest ?? "-"}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
}
