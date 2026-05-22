"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error?: string;
    };

type RestaurantSession = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  availableSlots: number;
};

type RestaurantTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  status: string;
  isAvailable: boolean;
};

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 5);
  }

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getSessionLabel(session: RestaurantSession) {
  return `${session.name} (${formatTime(session.startTime)} - ${formatTime(
    session.endTime
  )})`;
}

function getBestDefaultTableId(tables: RestaurantTable[], partySize: number) {
  const availableTables = tables
    .filter((table) => table.isAvailable)
    .sort((firstTable, secondTable) => {
      if (firstTable.capacity !== secondTable.capacity) {
        return firstTable.capacity - secondTable.capacity;
      }

      return firstTable.tableNumber.localeCompare(secondTable.tableNumber);
    });

  return (
    availableTables.find((table) => table.capacity >= partySize)?.id ??
    availableTables[0]?.id ??
    ""
  );
}

export default function ReservationFormPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [partySize, setPartySize] = useState(2);
  const [sessions, setSessions] = useState<RestaurantSession[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [selectedSessionId, sessions]);

  const maxPartySize = Math.max(1, selectedSession?.availableSlots ?? 2);
  const reservationPartySize = Math.min(partySize, maxPartySize);

  const partySizeOptions = useMemo(() => {
    return Array.from({ length: maxPartySize }, (_, index) => index + 1);
  }, [maxPartySize]);

  const selectedCapacity = useMemo(() => {
    return tables
      .filter((table) => selectedTableIds.includes(table.id))
      .reduce((total, table) => total + table.capacity, 0);
  }, [selectedTableIds, tables]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const controller = new AbortController();

    async function loadSessions() {
      setIsSessionLoading(true);
      setError(null);
      setTables([]);
      setSelectedTableIds([]);

      try {
        const response = await fetch(
          `/api/public/sessions?date=${encodeURIComponent(selectedDate)}`,
          {
            signal: controller.signal,
          }
        );
        const data = (await response.json()) as ApiResponse<
          RestaurantSession[]
        >;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error ?? "Gagal mengambil sesi reservasi"
              : "Gagal mengambil sesi reservasi"
          );
        }

        if (!data.success) {
          throw new Error(data.error ?? "Gagal mengambil sesi reservasi");
        }

        setSessions(data.data);
        setSelectedSessionId(data.data[0]?.id ?? "");
      } catch (err) {
        if (controller.signal.aborted) return;

        setSessions([]);
        setSelectedSessionId("");
        setError(
          err instanceof Error ? err.message : "Gagal mengambil sesi reservasi"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSessionLoading(false);
        }
      }
    }

    loadSessions();

    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || !selectedSessionId) {
      return;
    }

    const controller = new AbortController();

    async function loadTables() {
      setIsTableLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          date: selectedDate,
          sessionId: selectedSessionId,
        });
        const response = await fetch(`/api/public/tables?${params}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as ApiResponse<RestaurantTable[]>;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error ?? "Gagal mengambil data meja"
              : "Gagal mengambil data meja"
          );
        }

        if (!data.success) {
          throw new Error(data.error ?? "Gagal mengambil data meja");
        }

        const defaultTableId = getBestDefaultTableId(
          data.data,
          reservationPartySize
        );

        setTables(data.data);
        setSelectedTableIds(defaultTableId ? [defaultTableId] : []);
      } catch (err) {
        if (controller.signal.aborted) return;

        setTables([]);
        setSelectedTableIds([]);
        setError(err instanceof Error ? err.message : "Gagal mengambil data meja");
      } finally {
        if (!controller.signal.aborted) {
          setIsTableLoading(false);
        }
      }
    }

    loadTables();

    return () => controller.abort();
  }, [reservationPartySize, selectedDate, selectedSessionId]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSessionId("");
    setSelectedTableIds([]);
    setSessions([]);
    setTables([]);
  }

  function handleSessionChange(sessionId: string) {
    setSelectedSessionId(sessionId);
    setSelectedTableIds([]);
    setTables([]);
  }

  function toggleTable(tableId: string, isChecked: boolean) {
    setSelectedTableIds((currentTableIds) => {
      if (isChecked) {
        return currentTableIds.includes(tableId)
          ? currentTableIds
          : [...currentTableIds, tableId];
      }

      return currentTableIds.filter((currentTableId) => currentTableId !== tableId);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!selectedDate || !selectedSessionId) {
      setError("Pilih tanggal dan sesi reservasi terlebih dahulu.");
      setIsLoading(false);
      return;
    }

    if (selectedTableIds.length === 0) {
      setError("Minimal pilih satu meja yang tersedia.");
      setIsLoading(false);
      return;
    }

    if (selectedCapacity < reservationPartySize) {
      setError(
        `Kapasitas meja yang dipilih (${selectedCapacity} orang) belum cukup untuk ${reservationPartySize} tamu.`
      );
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/public/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestName: formData.get("name"),
          guestPhone: formData.get("phone"),
          guestEmail: formData.get("email") || undefined,
          sessionId: selectedSessionId,
          tableIds: selectedTableIds,
          date: selectedDate,
          partySize: reservationPartySize,
          specialRequest: formData.get("specialRequest") || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Gagal membuat reservasi");
      }

      const { reservationId } = data.data;

      localStorage.setItem("reservationId", reservationId);
      localStorage.setItem("guestName", formData.get("name") as string);
      localStorage.setItem("partySize", String(reservationPartySize));

      router.push(`/reservasi/payment?reservationId=${reservationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Reservasi Publik
          </p>
          <h1 className="text-3xl font-semibold">Form Reservasi</h1>
          <p className="text-sm text-slate-600">
            Isi data singkat untuk membuat reservasi.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 p-6"
        >
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Nama
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                placeholder="Nama lengkap"
                name="name"
                minLength={2}
                required
              />
            </label>

            <label className="text-sm">
              Nomor HP
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                placeholder="08xxxxxxxx"
                name="phone"
                type="tel"
                minLength={8}
                required
              />
            </label>
          </div>

          <label className="text-sm">
            Email (opsional)
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="nama@email.com"
              name="email"
              type="email"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              Tanggal
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                name="date"
                min={getTodayDate()}
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                required
              />
            </label>

            <label className="text-sm">
              Sesi
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:bg-slate-50"
                name="sessionId"
                required
                value={selectedSessionId}
                onChange={(event) => handleSessionChange(event.target.value)}
                disabled={!selectedDate || isSessionLoading || sessions.length === 0}
              >
                <option value="">
                  {isSessionLoading
                    ? "Memuat sesi..."
                    : selectedDate
                      ? "Pilih sesi"
                      : "Pilih tanggal dulu"}
                </option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {getSessionLabel(session)} · {session.availableSlots} slot
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Jumlah Tamu
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:bg-slate-50"
                name="partySize"
                required
                value={reservationPartySize}
                onChange={(event) => setPartySize(Number(event.target.value))}
                disabled={!selectedSession}
              >
                {partySizeOptions.map((currentPartySize) => (
                  <option key={currentPartySize} value={currentPartySize}>
                    {currentPartySize} Orang
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-medium">Pilih Meja</legend>

            <div className="mt-2 space-y-2">
              {!selectedDate ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Pilih tanggal terlebih dahulu untuk melihat meja dari database.
                </p>
              ) : isTableLoading ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Memuat data meja...
                </p>
              ) : tables.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Tidak ada meja tersedia untuk tanggal dan sesi ini.
                </p>
              ) : (
                tables.map((table) => (
                  <label
                    key={table.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                      table.isAvailable
                        ? "border-slate-200"
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="tableIds"
                        value={table.id}
                        checked={selectedTableIds.includes(table.id)}
                        disabled={!table.isAvailable}
                        onChange={(event) =>
                          toggleTable(table.id, event.target.checked)
                        }
                      />
                      <span>
                        {table.tableNumber} - Kapasitas {table.capacity}
                      </span>
                    </span>
                    <span className="text-xs">
                      {table.isAvailable ? "Tersedia" : "Tidak tersedia"}
                    </span>
                  </label>
                ))
              )}
            </div>

            {selectedTableIds.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Kapasitas meja dipilih: {selectedCapacity} orang.
              </p>
            )}
          </fieldset>

          <label className="text-sm">
            Permintaan Khusus
            <textarea
              className="mt-2 min-h-25 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="Contoh: Meja dekat jendela"
              name="specialRequest"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Kebijakan Reservasi
            </p>
            <div className="mt-3 space-y-1">
              <p>2 tamu: tanpa deposit.</p>
              <p>3-4 tamu: deposit Rp 150.000.</p>
              <p>5+ tamu: deposit Rp 300.000.</p>
              <p>10+ tamu: minimum order Rp 1.000.000.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">
              Dengan melanjutkan, kamu setuju dengan kebijakan reservasi.
            </p>

            <button
              type="submit"
              disabled={
                isLoading ||
                isSessionLoading ||
                isTableLoading ||
                !selectedDate ||
                !selectedSessionId ||
                selectedTableIds.length === 0
              }
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? "Memproses..." : "Lanjut ke Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
