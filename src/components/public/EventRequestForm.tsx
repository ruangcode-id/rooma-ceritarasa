"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  EnvelopeSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function formatSessionTime(value: string) {
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

function getMinimumDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getApiError(payload: ApiErrorPayload) {
  return (
    payload.details?.find((detail) => detail.message)?.message ??
    payload.error ??
    "Pengajuan event gagal dikirim."
  );
}

export function EventRequestForm({
  initialEventType,
  eventTypeOptions,
}: {
  initialEventType: string;
  eventTypeOptions: string[];
}) {
  const router = useRouter();
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
  const minimumDate = useMemo(() => getMinimumDate(), []);

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
              ? "Gagal mengambil sesi."
              : payload.error ?? "Gagal mengambil sesi."
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

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/events/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          eventType: form.eventType || null,
          eventDate: form.eventDate,
          partySize: form.partySize ? Number(form.partySize) : null,
          sessionId: form.sessionId || null,
          description: form.description || null,
        }),
      });
      const payload = (await response.json()) as
        | { success: true; data: { id: string } }
        | ApiErrorPayload;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? "Pengajuan event gagal dikirim."
            : getApiError(payload)
        );
      }

      router.push(`/event/request/${payload.data.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Pengajuan event gagal dikirim."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitRequest}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Nama PIC" required>
          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Nama lengkap"
          />
        </FormField>
        <FormField label="Nomor HP" required>
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
        <FormField label="Jenis Acara">
          <input
            list="event-type-options"
            maxLength={100}
            value={form.eventType}
            onChange={(event) => updateForm("eventType", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Contoh: Birthday Celebration"
          />
          <datalist id="event-type-options">
            {eventTypeOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Tanggal Acara" required>
          <input
            required
            type="date"
            min={minimumDate}
            value={form.eventDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setForm((current) => ({
                ...current,
                eventDate: nextDate,
                sessionId: "",
              }));
              setSessions([]);
              setSessionsLoading(Boolean(nextDate));
              setError(null);
            }}
            className={INPUT_CLASS}
          />
        </FormField>
        <FormField label="Estimasi Tamu">
          <input
            type="number"
            min={1}
            max={10000}
            value={form.partySize}
            onChange={(event) => updateForm("partySize", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Jumlah pax"
          />
        </FormField>
        <FormField label="Preferensi Sesi">
          <select
            value={form.sessionId}
            onChange={(event) => updateForm("sessionId", event.target.value)}
            disabled={!form.eventDate || sessionsLoading}
            className={INPUT_CLASS}
          >
            <option value="">
              {sessionsLoading
                ? "Memuat sesi..."
                : sessions.length > 0
                  ? "Fleksibel / pilih sesi"
                  : "Fleksibel"}
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
          <FormField label="Ceritakan kebutuhan acara">
            <textarea
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              className={INPUT_CLASS}
              placeholder="Konsep acara, kebutuhan menu, dekorasi, atau catatan lainnya..."
            />
          </FormField>
        </div>
      </div>

      {error ? (
        <div className="mt-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
      >
        {submitting ? (
          <>
            <LoadingSpinner className="size-4 border-white/40 border-t-white" />
            Mengirim pengajuan...
          </>
        ) : (
          <>
            <EnvelopeSimple size={18} weight="bold" />
            Kirim Pengajuan Event
          </>
        )}
      </button>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <CheckCircle
          size={15}
          weight="fill"
          className="mt-0.5 shrink-0 text-green-600"
        />
        Dengan mengirim form ini, Anda bersedia dihubungi oleh tim Rooma
        Ceritarasa mengenai pengajuan acara.
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
