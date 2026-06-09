"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { createPayment } from "@/lib/api/payment";
import { ReservationPaymentType } from "@/features/payments/payment.types";

type ReservationSession = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  availableSlots: number;
};

type BookableTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  posX: number | null;
  posY: number | null;
  status: string;
  isAvailable: boolean;
};

type ReservationResponse = {
  reservationId: string;
  guestId: string;
  status: string;
  tableIds: string[];
  expiresAt: string | null;
};

const steps = [
  { number: "01", label: "Details" },
  { number: "02", label: "Session" },
  { number: "03", label: "Table" },
  { number: "04", label: "Confirm" },
];

const sessionImages = [
  "/assets/slider2.webp",
  "/assets/slider4.webp",
  "/assets/slider6.webp",
];

const floorPlanSlots = [
  {
    key: "T1",
    x: 8,
    y: 18,
    w: 12,
    h: 10,
    chairs: [
      { x: 14, y: 14.5 },
      { x: 14, y: 31.5 },
    ],
  },
  {
    key: "T2",
    x: 31,
    y: 18,
    w: 23,
    h: 10,
    chairs: [
      { x: 37.5, y: 14.5 },
      { x: 47.5, y: 14.5 },
      { x: 37.5, y: 31.5 },
      { x: 47.5, y: 31.5 },
    ],
  },
  {
    key: "T3",
    x: 68,
    y: 18,
    w: 12,
    h: 10,
    chairs: [
      { x: 74, y: 14.5 },
      { x: 74, y: 31.5 },
    ],
  },
  {
    key: "T4",
    x: 8,
    y: 40,
    w: 12,
    h: 10,
    chairs: [
      { x: 14, y: 36.5 },
      { x: 14, y: 53.5 },
    ],
  },
  {
    key: "T5",
    x: 31,
    y: 40,
    w: 23,
    h: 10,
    chairs: [
      { x: 37.5, y: 36.5 },
      { x: 47.5, y: 36.5 },
      { x: 37.5, y: 53.5 },
      { x: 47.5, y: 53.5 },
    ],
  },
  {
    key: "T6",
    x: 8,
    y: 64,
    w: 12,
    h: 10,
    chairs: [
      { x: 14, y: 60.5 },
      { x: 14, y: 77.5 },
    ],
  },
  {
    key: "T7",
    x: 32,
    y: 64,
    w: 12,
    h: 10,
    chairs: [
      { x: 38, y: 60.5 },
      { x: 38, y: 77.5 },
    ],
  },
  {
    key: "T8",
    x: 72,
    y: 55,
    w: 15,
    h: 10,
    chairs: [
      { x: 69, y: 60 },
      { x: 89.5, y: 60 },
      { x: 80, y: 70.5 },
    ],
  },
  {
    key: "T9",
    x: 73,
    y: 72,
    w: 14,
    h: 23,
    chairs: [
      { x: 70, y: 76 },
      { x: 70, y: 84 },
      { x: 70, y: 92 },
      { x: 90, y: 76 },
      { x: 90, y: 84 },
      { x: 90, y: 92 },
    ],
  },
  {
    key: "T10",
    x: 32,
    y: 85,
    w: 20,
    h: 8,
    chairs: [
      { x: 42, y: 82.5 },
      { x: 42, y: 95 },
    ],
  },
] as const;

function formatTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }

  return value.slice(0, 5);
}

function formatDate(value: string) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function displayTableLabel(tableNumber: string) {
  const normalized = tableNumber.trim().toUpperCase();
  const numericPart = normalized.match(/\d+/)?.[0];

  if (numericPart) {
    return `T${Number(numericPart)}`;
  }

  return normalized.startsWith("T") ? normalized : `T${normalized}`;
}

export default function ReservationWizard() {
  const [step, setStep] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [sessions, setSessions] = useState<ReservationSession[]>([]);
  const [tables, setTables] = useState<BookableTable[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [createdReservation, setCreatedReservation] =
    useState<ReservationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  const selectedTables = tables.filter((table) =>
    selectedTableIds.includes(table.id)
  );

  const selectedCapacity = selectedTables.reduce(
    (total, table) => total + table.capacity,
    0
  );

  const needsDeposit = partySize > 2;

  const tablesBySlot = useMemo(() => {
    return new Map(
      tables.map((table) => [displayTableLabel(table.tableNumber), table])
    );
  }, [tables]);

  const backendTableLabels = useMemo(() => {
    return new Set(tables.map((table) => displayTableLabel(table.tableNumber)));
  }, [tables]);

  const unmappedTables = useMemo(() => {
    const slotKeys = new Set<string>(floorPlanSlots.map((slot) => slot.key));

    return tables.filter(
      (table) => !slotKeys.has(displayTableLabel(table.tableNumber))
    );
  }, [tables]);

  const canContinueDetails = useMemo(
    () =>
      guestName.trim().length >= 2 &&
      /^\d{8,15}$/.test(guestPhone.trim()) &&
      partySize > 0 &&
      date.length > 0,
    [date, guestName, guestPhone, partySize]
  );

  async function loadSessions() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/public/sessions?date=${date}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load reservation sessions.");
      }

      setSessions(data.data);
      setSelectedSessionId("");
      setSelectedTableIds([]);
      setStep(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load reservation sessions."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTables() {
    if (!selectedSessionId) return;

    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        date,
        sessionId: selectedSessionId,
      });

      const response = await fetch(`/api/public/tables?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load the table floor plan.");
      }

      setTables(data.data);
      setSelectedTableIds([]);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load the table floor plan."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function toggleTable(table: BookableTable) {
    if (!table.isAvailable) return;

    setSelectedTableIds((current) =>
      current.includes(table.id)
        ? current.filter((tableId) => tableId !== table.id)
        : [...current, table.id]
    );
  }

  async function submitReservation() {
    if (!selectedSessionId || selectedTableIds.length === 0) return;

    if (selectedCapacity < partySize) {
      setError("Selected table capacity is not enough for the guest count.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim(),
          sessionId: selectedSessionId,
          tableIds: selectedTableIds,
          date,
          partySize,
          specialRequest: specialRequest.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to create reservation.");
      }

      const reservation = data.data as ReservationResponse;

      if (needsDeposit) {
        const payment = await createPayment({
          reservationId: reservation.reservationId,
          paymentType: ReservationPaymentType.Deposit,
        });

        if (!payment.paymentRequired) {
          setCreatedReservation(reservation);
          return;
        }

        if (payment.redirectUrl) {
          window.location.assign(payment.redirectUrl);
          return;
        }

        throw new Error("Midtrans payment redirect is not available.");
      }

      setCreatedReservation(reservation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reservation.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canContinueDetails) {
      setError("Complete name, phone number, guest count, and reservation date.");
      return;
    }

    void loadSessions();
  }

  return (
    <div className="min-h-screen bg-essence-ivory text-essence-ink">
      <header className="border-b border-essence-line/60 px-4 py-5 sm:px-8 lg:px-12">
        <nav className="flex flex-col items-center gap-5 text-sm font-bold md:grid md:grid-cols-3">
          <div className="font-essence-label flex flex-wrap justify-center gap-6 md:justify-start">
            <Link href="/" className="hover:text-essence-gold">
              Menu
            </Link>
            <Link href="/" className="hover:text-essence-gold">
              Experience
            </Link>
          </div>

          <Link
            href="/"
            className="font-essence-serif text-center text-2xl tracking-[0.28em] sm:text-3xl"
          >
            ROOMA
          </Link>

          <div className="font-essence-label flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:justify-end">
            <Link href="/" className="hover:text-essence-gold">
              Location
            </Link>
            <span className="border border-essence-ink px-6 py-3 sm:px-10 sm:py-5">
              Reserve
            </span>
          </div>
        </nav>
      </header>

      <main className="px-4 py-10 sm:px-6 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <ol className="font-essence-label mx-auto mb-12 grid max-w-4xl grid-cols-2 gap-4 text-[11px] font-bold text-black/30 sm:mb-20 sm:text-xs md:grid-cols-4 lg:mb-28">
            {steps.map((item, index) => (
              <li key={item.number} className="flex items-center gap-4">
                <span className={index === step ? "text-essence-gold" : ""}>
                  {item.number}
                </span>
                <span className={index === step ? "text-slate-950" : ""}>
                  {item.label}
                </span>
                {index < steps.length - 1 && (
                  <span className="hidden h-px flex-1 bg-essence-line md:block" />
                )}
              </li>
            ))}
          </ol>

          {error && (
            <div className="mx-auto mb-8 flex max-w-3xl gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <WarningCircle
                className="mt-0.5 shrink-0"
                size={20}
                weight="fill"
              />
              <span>{error}</span>
            </div>
          )}

          {createdReservation && !needsDeposit ? (
            <section className="mx-auto max-w-3xl bg-essence-paper px-6 py-12 text-center shadow-sm sm:px-8 sm:py-16">
              <CheckCircle
                className="mx-auto text-essence-gold"
                size={48}
                weight="regular"
              />

              <h1 className="font-essence-serif mt-8 text-4xl sm:text-5xl">
                Reservation Confirmed
              </h1>

              <p className="mt-6 text-lg text-essence-muted">
                Your reservation has been confirmed. Reservation code:
              </p>

              <p className="font-essence-label mt-5 break-all text-sm font-bold text-essence-gold">
                {createdReservation.reservationId}
              </p>
            </section>
          ) : null}

          {!createdReservation && step === 0 && (
            <section className="mx-auto max-w-5xl">
              <h1 className="font-essence-serif mb-10 text-center text-4xl sm:mb-16 sm:text-5xl md:text-6xl lg:mb-20 lg:text-7xl">
                Begin your journey.
              </h1>

              <form
                onSubmit={handleDetailsSubmit}
                className="grid gap-x-16 gap-y-10 sm:gap-y-14 md:grid-cols-2"
              >
                <label className="font-essence-label text-sm font-bold text-essence-muted">
                  Full Name
                  <input
                    className="font-essence-serif mt-4 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-2xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-8 sm:px-5 sm:text-3xl"
                    placeholder="Jean-Luc Picard"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                  />
                </label>

                <label className="font-essence-label text-sm font-bold text-essence-muted">
                  Guest Count
                  <input
                    className="font-essence-serif mt-4 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-2xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-8 sm:px-5 sm:text-3xl"
                    min={1}
                    type="number"
                    value={partySize}
                    onChange={(event) =>
                      setPartySize(Number(event.target.value))
                    }
                  />
                </label>

                <label className="font-essence-label text-sm font-bold text-essence-muted">
                  Phone Number
                  <input
                    className="font-essence-serif mt-4 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-2xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-8 sm:px-5 sm:text-3xl"
                    placeholder="081234567890"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                  />
                </label>

                <label className="font-essence-label text-sm font-bold text-essence-muted">
                  Email
                  <input
                    className="font-essence-serif mt-4 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-2xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-8 sm:px-5 sm:text-3xl"
                    placeholder="optional"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                  />
                </label>

                <label className="font-essence-label relative text-sm font-bold text-essence-muted md:col-span-2">
                  Preferred Date
                  <input
                    className="font-essence-serif mt-4 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-2xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-8 sm:px-5 sm:text-3xl"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>

                <label className="font-essence-label text-sm font-bold text-essence-muted md:col-span-2">
                  Special Request
                  <textarea
                    className="font-essence-serif mt-4 min-h-28 w-full resize-none border-0 border-b border-essence-line bg-transparent px-3 py-4 text-xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-8 sm:px-5 sm:text-2xl"
                    placeholder="Allergies, occasion, seating notes"
                    value={specialRequest}
                    onChange={(event) =>
                      setSpecialRequest(event.target.value)
                    }
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isLoading || !canContinueDetails}
                    className="font-essence-label mx-auto mt-4 block w-full bg-[#30322e] px-8 py-5 text-xs font-bold text-white transition hover:bg-essence-gold disabled:cursor-not-allowed disabled:bg-black/20 sm:mt-10 sm:w-auto sm:px-24 sm:py-7 sm:text-sm"
                  >
                    {isLoading ? "Loading" : "Next: Selection"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {!createdReservation && step === 1 && (
            <section>
              <div className="border-y border-essence-line py-12 sm:py-20">
                <h1 className="font-essence-serif text-center text-4xl sm:text-5xl md:text-6xl">
                  Select a Session
                </h1>

                <div className="mt-10 grid gap-6 sm:mt-16 lg:mt-20 lg:grid-cols-3">
                  {sessions.map((session, index) => {
                    const selected = session.id === selectedSessionId;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`group min-h-80 bg-cover bg-center p-6 text-left transition sm:min-h-105 sm:p-10 ${
                          selected
                            ? "shadow-2xl shadow-essence-gold/20 ring-2 ring-essence-gold"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{
                          backgroundImage: `linear-gradient(to bottom, rgba(247,244,239,0.1), rgba(0,0,0,${
                            selected ? "0.62" : "0.16"
                          })), url(${
                            sessionImages[index % sessionImages.length]
                          })`,
                        }}
                      >
                        <p className="font-essence-label text-sm font-bold text-essence-gold">
                          {formatTime(session.startTime)} -{" "}
                          {formatTime(session.endTime)}
                        </p>

                        <div className="mt-40 sm:mt-64">
                          <h2
                            className={`font-essence-serif text-3xl font-bold sm:text-4xl ${
                              selected ? "text-white" : "text-essence-ink"
                            }`}
                          >
                            {session.name}
                          </h2>

                          {selected && (
                            <p className="mt-5 max-w-md text-base leading-7 text-white/80 sm:text-xl sm:leading-8">
                              {session.availableSlots} seats available for this
                              experience.
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {sessions.length === 0 && (
                  <p className="mt-14 text-center text-lg text-essence-muted">
                    No sessions are available for this date.
                  </p>
                )}
              </div>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:mt-16 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="font-essence-label border border-essence-ink px-12 py-5 text-xs font-bold"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => void loadTables()}
                  disabled={isLoading || !selectedSessionId}
                  className="font-essence-label bg-[#30322e] px-16 py-5 text-xs font-bold text-white disabled:bg-black/20"
                >
                  Next: Table
                </button>
              </div>
            </section>
          )}

          {!createdReservation && step === 2 && (
            <section className="grid gap-8 overflow-hidden xl:grid-cols-[minmax(0,1fr)_370px]">
              <div className="min-w-0">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <h1 className="font-essence-serif text-5xl md:text-6xl">
                    Choose Your Table
                  </h1>

                  <p className="font-essence-label text-xs font-bold text-essence-muted">
                    {selectedTables.length} table
                    {selectedTables.length === 1 ? "" : "s"} selected ·{" "}
                    {selectedCapacity}/{partySize} seats
                  </p>
                </div>

                <div className="overflow-x-auto bg-[#e5e2db] p-3 shadow-sm sm:p-6">
                  <div className="relative aspect-[0.9] min-h-150 min-w-160 max-h-225 overflow-hidden border border-dashed border-essence-line bg-[#efede7] sm:min-h-180 sm:min-w-0">
                    <div className="font-essence-label absolute left-[4%] right-[10%] top-[3%] border border-essence-muted/35 bg-essence-paper/55 py-4 text-center text-[11px] font-bold uppercase tracking-[0.55em] text-black/40">
                      Serving Area
                    </div>

                    <div className="absolute bottom-[5%] right-[4%] top-[18%] w-px bg-essence-muted/45" />

                    <div className="absolute right-[1.8%] top-[43%] h-16 w-5 border border-essence-muted/45 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_6px,rgba(132,99,19,0.35)_7px,rgba(132,99,19,0.35)_9px)]" />

                    {floorPlanSlots.map((slot) => {
                      const activeTable = tablesBySlot.get(slot.key);
                      const selected = activeTable
                        ? selectedTableIds.includes(activeTable.id)
                        : false;

                      const isAvailable = activeTable?.isAvailable ?? false;
                      const existsInBackend = backendTableLabels.has(slot.key);

                      return (
                        <div key={slot.key}>
                          {slot.chairs.map((chair, chairIndex) => (
                            <span
                              key={`${slot.key}-chair-${chairIndex}`}
                              className={`absolute z-10 h-[clamp(10px,1.3vw,16px)] w-[clamp(10px,1.3vw,16px)] -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm ${
                                isAvailable
                                  ? selected
                                    ? "border-essence-gold bg-[#eadfbd]"
                                    : "border-essence-gold/80 bg-essence-paper"
                                  : existsInBackend
                                    ? "border-essence-line bg-white/55"
                                    : "border-transparent bg-transparent shadow-none"
                              }`}
                              style={{
                                left: `${chair.x}%`,
                                top: `${chair.y}%`,
                              }}
                            />
                          ))}

                          <button
                            type="button"
                            disabled={!activeTable?.isAvailable}
                            onClick={() =>
                              activeTable && toggleTable(activeTable)
                            }
                            aria-pressed={selected}
                            aria-label={
                              activeTable
                                ? `${displayTableLabel(activeTable.tableNumber)}, capacity ${
                                    activeTable.capacity
                                  }, ${
                                    activeTable.isAvailable
                                      ? "available"
                                      : "unavailable"
                                  }`
                                : `${slot.key} is not configured in backend`
                            }
                            title={
                              activeTable
                                ? `${displayTableLabel(activeTable.tableNumber)} · ${
                                    activeTable.capacity
                                  } seats · ${activeTable.status}`
                                : `${slot.key} is not configured in backend`
                            }
                            className={`font-essence-serif absolute z-20 flex items-center justify-center border text-lg transition ${
                              selected
                                ? "border-[3px] border-essence-gold bg-essence-paper text-essence-gold shadow-[0_18px_40px_rgba(132,99,19,0.16)]"
                                : isAvailable
                                  ? "border-2 border-essence-gold bg-essence-ivory/70 text-essence-gold hover:bg-essence-paper hover:shadow-[0_14px_35px_rgba(31,32,29,0.08)]"
                                  : existsInBackend
                                    ? "border border-essence-line bg-white/45 text-black/25"
                                    : "border border-transparent bg-transparent text-black/15"
                            }`}
                            style={{
                              left: `${slot.x}%`,
                              top: `${slot.y}%`,
                              width: `${slot.w}%`,
                              height: `${slot.h}%`,
                            }}
                          >
                            <span>{slot.key}</span>
                            {activeTable && (
                              <span className="font-essence-label absolute bottom-1.5 right-2 text-[8px] font-bold text-current opacity-60">
                                {activeTable.capacity}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="xl:pt-22">
                <div className="mb-8">
                  <h2 className="font-essence-label mb-6 text-sm font-bold">
                    Legend
                  </h2>

                  <div className="space-y-4 text-base sm:space-y-5 sm:text-lg">
                    <p className="flex items-center gap-5">
                      <span className="h-6 w-6 border border-essence-gold bg-[#e7ddc1]" />
                      Available Premier
                    </p>

                    <p className="flex items-center gap-5">
                      <span className="h-6 w-6 border border-essence-gold bg-transparent" />
                      Limited Availability
                    </p>

                    <p className="flex items-center gap-5 text-black/35">
                      <span className="h-6 w-6 border border-essence-line bg-white/40" />
                      Reserved / Unavailable
                    </p>
                  </div>
                </div>

                <div className="border border-essence-line bg-essence-paper p-5 shadow-sm sm:p-8">
                  <p className="font-essence-label text-sm font-bold text-essence-gold">
                    Current Selection
                  </p>

                  <h2 className="font-essence-serif mt-5 text-3xl font-bold sm:text-4xl">
                    {selectedTables.length > 0
                      ? selectedTables
                          .map(
                            (table) =>
                              `Table ${displayTableLabel(table.tableNumber)}`
                          )
                          .join(", ")
                      : "No table selected"}
                  </h2>

                  <p className="mt-4 text-lg leading-7 text-essence-muted sm:text-xl sm:leading-8">
                    {selectedTables.length > 0
                      ? `Total capacity ${selectedCapacity} seats for ${partySize} guests.`
                      : "Select one or more available tables from the floor plan."}
                  </p>

                  {selectedTables.length > 0 && selectedCapacity < partySize && (
                    <p className="mt-5 text-sm text-red-700">
                      Selected table capacity is not enough for the guest count.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      selectedTables.length === 0 ||
                      selectedCapacity < partySize
                    }
                    onClick={() => setStep(3)}
                    className="font-essence-label mt-8 w-full border border-essence-ink px-8 py-5 text-xs font-bold transition hover:bg-essence-ink hover:text-white disabled:border-black/20 disabled:text-black/30 disabled:hover:bg-transparent"
                  >
                    Confirm Choice
                  </button>
                </div>

                {unmappedTables.length > 0 && (
                  <div className="mt-6 border border-essence-line bg-essence-paper p-6">
                    <p className="font-essence-label text-xs font-bold text-essence-muted">
                      Backend tables outside map
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {unmappedTables.map((table) => {
                        const selected = selectedTableIds.includes(table.id);

                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={!table.isAvailable}
                            onClick={() => toggleTable(table)}
                            className={`font-essence-label border px-3 py-2 text-[10px] font-bold ${
                              selected
                                ? "border-essence-gold bg-[#eadfbd] text-essence-gold"
                                : table.isAvailable
                                  ? "border-essence-gold text-essence-gold"
                                  : "border-essence-line text-black/30"
                            }`}
                          >
                            {displayTableLabel(table.tableNumber)} · {table.capacity}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-essence-label mt-6 border border-essence-line px-10 py-4 text-xs font-bold transition hover:border-essence-ink"
                >
                  Back
                </button>
              </aside>
            </section>
          )}

          {!createdReservation && step === 3 && (
            <section className="mx-auto max-w-5xl bg-essence-paper px-5 py-12 shadow-sm sm:px-8 sm:py-20 md:px-18">
              <CheckCircle
                className="mx-auto text-essence-gold"
                size={48}
                weight="regular"
              />

              <h1 className="font-essence-serif mt-10 text-center text-4xl sm:text-5xl md:text-6xl">
                Reservation Summary
              </h1>

              <div className="mx-auto mt-12 max-w-4xl border-y border-essence-line py-8 sm:mt-24 sm:py-12">
                {[
                  [
                    "Guest",
                    `${guestName} (${String(partySize).padStart(2, "0")})`,
                  ],
                  [
                    "Date & Time",
                    `${formatDate(date)}, ${
                      selectedSession
                        ? formatTime(selectedSession.startTime)
                        : "-"
                    }`,
                  ],
                  ["Experience", selectedSession?.name ?? "-"],
                  [
                    "Location",
                    selectedTables
                      .map(
                        (table) =>
                          `Table ${displayTableLabel(table.tableNumber)}`
                      )
                      .join(", "),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-4 py-5 md:grid-cols-[170px_1fr_auto]"
                  >
                    <p className="font-essence-label text-sm font-bold text-essence-muted">
                      {label}
                    </p>

                    <span className="hidden border-b border-dotted border-essence-muted md:block" />

                    <p className="font-essence-serif text-2xl sm:text-3xl">{value}</p>
                  </div>
                ))}
              </div>

              <p className="mx-auto mt-10 max-w-3xl text-center text-xl italic leading-8 text-essence-muted sm:mt-12 sm:text-2xl">
                {needsDeposit
                  ? "A deposit is required to finalize this reservation and will be deducted from the final bill."
                  : "Reservations for 1-2 guests do not require a deposit."}
              </p>

              <div className="mt-12 flex flex-col gap-4 md:mt-20 md:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="font-essence-label border border-essence-ink px-10 py-7 text-sm font-bold md:w-56"
                >
                  Back
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void submitReservation()}
                  className="font-essence-label flex-1 bg-essence-gold px-10 py-7 text-sm font-bold text-white transition hover:bg-[#30322e] disabled:bg-black/20"
                >
                  {isLoading
                    ? "Processing"
                    : needsDeposit
                      ? "Confirm & Pay Deposit"
                      : "Confirm Reservation"}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="font-essence-label mt-16 border-t border-essence-line px-4 py-10 text-center text-xs text-essence-muted sm:px-12 sm:py-14 md:mt-24 md:text-left">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <p className="font-essence-serif text-3xl normal-case tracking-[0.18em] text-essence-ink">
            ROOMA
          </p>

          <div className="flex flex-wrap justify-center gap-5 sm:gap-10">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact</span>
            <span>Location</span>
          </div>

          <p>(c) 2026 Rooma. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
