"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  EnvelopeSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfDay,
  getDay,
} from "date-fns";

type PublicSession = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

type RequestForm = {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  partySize: string;
  sessionId: string;
  description: string;
};

type ApiErrorPayload = {
  success: false;
  error?: string;
  details?: Array<{ message?: string }>;
};

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function formatSessionTime(value: string) {
  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }

  return value.slice(0, 5);
}

function getMinimumDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EventRequestForm({
  initialEventType,
  eventTypeOptions,
  whatsappNumber,
}: {
  initialEventType: string;
  eventTypeOptions: string[];
  whatsappNumber: string;
}) {
  const [form, setForm] = useState<RequestForm>({
    name: "",
    phone: "",
    email: "",
    eventType: initialEventType,
    eventDate: "",
    partySize: "",
    sessionId: "",
    description: "",
  });
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));

  const minimumDate = useMemo(() => getMinimumDate(), []);
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (!form.eventDate) return;

    const controller = new AbortController();

    fetch(`/api/public/sessions?date=${form.eventDate}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | { success: true; data: PublicSession[] }
          | ApiErrorPayload;

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.success
              ? "Failed to load sessions."
              : payload.error ?? "Failed to load sessions."
          );
        }

        setSessions(payload.data);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setSessions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSessionsLoading(false);
        }
      });

    return () => controller.abort();
  }, [form.eventDate]);

  function updateForm<Key extends keyof RequestForm>(
    key: Key,
    value: RequestForm[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  // Calendar Day Generation
  const monthDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const monthStartOffset = useMemo(() => {
    return getDay(startOfMonth(calendarMonth)); // 0 = Sun, 1 = Mon...
  }, [calendarMonth]);

  function handleDateClick(day: Date) {
    const isMonday = getDay(day) === 1;
    const isPast = isBefore(startOfDay(day), today);

    if (isMonday) {
      setError("Rooma Ceritarasa is closed on Mondays. Please select another date.");
      return;
    }

    if (isPast) return;

    const dateStr = format(day, "yyyy-MM-dd");
    setForm((current) => ({
      ...current,
      eventDate: dateStr,
      sessionId: "",
    }));
    setSessions([]);
    setSessionsLoading(true);
    setError(null);
    setIsCalendarOpen(false);
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.eventDate) {
      setError("Please select an event date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let sessionText = "Flexible";
    if (form.sessionId) {
      const selectedSession = sessions.find((s) => s.id === form.sessionId);
      if (selectedSession) {
        sessionText = `${selectedSession.name} (${formatSessionTime(selectedSession.startTime)} - ${formatSessionTime(selectedSession.endTime)})`;
      }
    }

    const message = `Hello Rooma Ceritarasa team, I would like to request an event with the following details:

*PIC Name:* ${form.name}
*Phone Number:* ${form.phone}
*Email:* ${form.email || "-"}

*Event Type:* ${form.eventType || "-"}
*Event Date:* ${form.eventDate}
*Estimated Pax:* ${form.partySize || "-"}
*Session Preference:* ${sessionText}

*Additional Needs:*
${form.description || "-"}

Thank you.`;

    const encodedMessage = encodeURIComponent(message);
    const cleanWaNumber = whatsappNumber.replace(/[^0-9]/g, "");

    window.open(`https://wa.me/${cleanWaNumber}?text=${encodedMessage}`, "_blank");
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={submitRequest}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="PIC Name" required>
          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Full name"
          />
        </FormField>

        <FormField label="Phone Number" required>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(event) => updateForm("phone", event.target.value)}
            className={INPUT_CLASS}
            placeholder="08xxxxxxxxxx"
          />
        </FormField>

        <FormField label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm("email", event.target.value)}
            className={INPUT_CLASS}
            placeholder="nama@email.com"
          />
        </FormField>

        <FormField label="Event Type">
          <select
            value={form.eventType}
            onChange={(event) => updateForm("eventType", event.target.value)}
            className={`${INPUT_CLASS} cursor-pointer font-medium`}
          >
            <option value="">Select Event Type</option>
            {eventTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        {/* Custom Event Date Picker with Mondays Disabled */}
        <FormField label="Event Date" required>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <span className={form.eventDate ? "font-semibold text-slate-900" : "text-slate-400"}>
                {form.eventDate
                  ? format(new Date(`${form.eventDate}T00:00:00`), "EEEE, dd MMMM yyyy")
                  : "Select Event Date"}
              </span>
              <CalendarBlank size={18} className="text-slate-400" />
            </button>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">* Closed on Mondays</p>

            {/* Interactive Calendar Popover */}
            {isCalendarOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <CaretLeft size={16} weight="bold" />
                  </button>
                  <span className="text-sm font-bold text-slate-900">
                    {format(calendarMonth, "MMMM yyyy")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
                  <span>Sun</span>
                  <span className="text-red-500 font-extrabold" title="Closed">Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Calendar Days Grid */}
                <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                  {/* Empty Offset */}
                  {Array.from({ length: monthStartOffset }).map((_, i) => (
                    <div key={`offset-${i}`} />
                  ))}

                  {/* Month Days */}
                  {monthDays.map((day) => {
                    const isMonday = getDay(day) === 1;
                    const isPast = isBefore(startOfDay(day), today);
                    const isDisabled = isMonday || isPast;
                    const isSelected = form.eventDate === format(day, "yyyy-MM-dd");

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleDateClick(day)}
                        className={`size-9 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white font-bold shadow-md"
                            : isMonday
                            ? "bg-red-50 text-red-300 line-through cursor-not-allowed"
                            : isPast
                            ? "text-slate-300 cursor-not-allowed"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        }`}
                        title={isMonday ? "Closed on Mondays" : undefined}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-red-200" /> Monday Closed
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-slate-700 font-bold hover:underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Estimated Pax">
          <input
            type="number"
            min={1}
            max={10000}
            value={form.partySize}
            onChange={(event) => updateForm("partySize", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Number of pax"
          />
        </FormField>

        <FormField label="Session Preference">
          <select
            value={form.sessionId}
            onChange={(event) => updateForm("sessionId", event.target.value)}
            disabled={!form.eventDate || sessionsLoading}
            className={INPUT_CLASS}
          >
            <option value="">
              {sessionsLoading
                ? "Loading sessions..."
                : sessions.length > 0
                  ? "Flexible / choose session"
                  : "Flexible"}
            </option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} · {formatSessionTime(session.startTime)}–
                {formatSessionTime(session.endTime)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="hidden sm:block" />
        <div className="sm:col-span-2">
          <FormField label="Tell us about your event needs">
            <textarea
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              className={INPUT_CLASS}
              placeholder="Event concept, menu requirements, decoration, or other notes..."
            />
          </FormField>
        </div>
      </div>

      {error ? (
        <div className="mt-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50 cursor-pointer"
      >
        {submitting ? (
          <>
            <LoadingSpinner className="size-4 border-white/40 border-t-white" />
            Submitting request...
          </>
        ) : (
          <>
            <EnvelopeSimple size={18} weight="bold" />
            Submit Event Request
          </>
        )}
      </button>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <CheckCircle
          size={15}
          weight="fill"
          className="mt-0.5 shrink-0 text-green-600"
        />
        By submitting this form, you agree to be contacted by the Rooma Ceritarasa team regarding your event request.
      </p>
    </form>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {required ? <span className="ml-1 text-primary">*</span> : null}
      {children}
    </label>
  );
}
