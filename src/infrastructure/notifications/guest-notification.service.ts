import { prisma } from "@/infrastructure/database/prisma";
import { SettingsRepository } from "@/infrastructure/repositories/settings.repository";
import { sendWhatsAppMessage } from "@/infrastructure/whatsapp/fonnte";
import { sendTransactionalEmail } from "@/infrastructure/email/resend";
import { renderTemplate } from "@/lib/render-template";
import type { EventNotificationTrigger } from "@/domain/event/notification.types";
import { ReservationStatus, EventRequestStatus } from "@/generated/prisma/client";

type TemplateVars = Record<string, string | number | null | undefined>;

function asTemplateMap(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  return {};
}

async function loadWaTemplates(): Promise<Record<string, string>> {
  const row = await SettingsRepository.getOrCreateSingleton();
  return asTemplateMap(row.waTemplates);
}

async function loadEmailTemplates(): Promise<Record<string, string>> {
  const row = await SettingsRepository.getOrCreateSingleton();
  return asTemplateMap(row.emailTemplates);
}

function formatDateId(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function formatTimeFromSession(startTime: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(startTime);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function sendWaFromTemplate(
  phone: string,
  templateKey: string,
  variables: TemplateVars,
  fallbackMessage?: string,
) {
  const templates = await loadWaTemplates();
  const raw = templates[templateKey] ?? fallbackMessage;
  if (!raw) {
    console.warn(`[guest-notify] WA template '${templateKey}' tidak ditemukan.`);
    return { sent: false as const, warning: `Template WA '${templateKey}' kosong.` };
  }
  const message = renderTemplate(raw, variables);
  return sendWhatsAppMessage(phone, message);
}

export async function sendEmailFromTemplate(
  to: string,
  templateKey: string,
  subject: string,
  variables: TemplateVars,
  fallbackHtml?: string,
) {
  const templates = await loadEmailTemplates();
  const raw = templates[templateKey] ?? fallbackHtml;
  if (!raw) {
    console.warn(`[guest-notify] Email template '${templateKey}' tidak ditemukan.`);
    return { sent: false as const, warning: `Template email '${templateKey}' kosong.` };
  }
  const html = renderTemplate(raw, variables);
  return sendTransactionalEmail({ to, subject, html });
}

async function getReservationNotifyContext(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      guest: { select: { name: true, phone: true, email: true } },
      session: { select: { name: true, startTime: true, endTime: true } },
    },
  });
}

function buildReservationVars(reservation: {
  id: string;
  date: Date;
  partySize: number;
  guest: { name: string };
  session: { name: string; startTime: Date };
}): TemplateVars {
  return {
    nama: reservation.guest.name,
    tanggal: formatDateId(reservation.date),
    waktu: formatTimeFromSession(reservation.session.startTime),
    session: reservation.session.name,
    reservation_id: reservation.id.slice(0, 8),
    party_size: reservation.partySize,
  };
}

export async function notifyGuestReservationConfirmed(reservationId: string) {
  const reservation = await getReservationNotifyContext(reservationId);
  if (!reservation || reservation.status !== ReservationStatus.confirmed) {
    return;
  }

  const vars = buildReservationVars(reservation);

  await sendWaFromTemplate(
    reservation.guest.phone,
    "reservasi_konfirmasi",
    vars,
    "Halo {{nama}}, reservasi Anda pada {{tanggal}} pukul {{waktu}} telah dikonfirmasi. Terima kasih!",
  );

  if (reservation.guest.email) {
    await sendEmailFromTemplate(
      reservation.guest.email,
      "reservasi_konfirmasi",
      "Konfirmasi Reservasi — Rooma Cerita Rasa",
      vars,
      "<p>Halo {{nama}},</p><p>Reservasi Anda pada <strong>{{tanggal}}</strong> pukul <strong>{{waktu}}</strong> telah dikonfirmasi.</p>",
    );
  }
}

export async function notifyGuestPaymentSuccess(reservationId: string) {
  const reservation = await getReservationNotifyContext(reservationId);
  if (!reservation) return;

  const vars = {
    ...buildReservationVars(reservation),
    reservation_id: reservation.id,
  };

  await sendWaFromTemplate(
    reservation.guest.phone,
    "payment_success",
    vars,
    "Pembayaran reservasi Anda berhasil. Reservasi {{tanggal}} pukul {{waktu}} dikonfirmasi.",
  );

  if (reservation.guest.email) {
    await sendEmailFromTemplate(
      reservation.guest.email,
      "payment_success",
      "Pembayaran Berhasil — Rooma Cerita Rasa",
      vars,
      "<p>Halo {{nama}},</p><p>Pembayaran untuk reservasi <strong>{{reservation_id}}</strong> berhasil.</p>",
    );
  }
}

export async function sendReservationReminder(reservationId: string) {
  const reservation = await getReservationNotifyContext(reservationId);
  if (!reservation || reservation.status !== ReservationStatus.confirmed) {
    return { sent: false as const, warning: "Reservasi tidak eligible untuk reminder." };
  }
  if (reservation.reminderSentAt) {
    return { sent: false as const, warning: "Reminder sudah pernah dikirim." };
  }

  const vars = buildReservationVars(reservation);
  const waResult = await sendWaFromTemplate(
    reservation.guest.phone,
    "reservasi_reminder_h1",
    vars,
    "Reminder: besok reservasi Anda di Rooma Cerita Rasa, {{tanggal}} pukul {{waktu}}.",
  );

  if (waResult.sent) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { reminderSentAt: new Date() },
    });
  }

  return waResult;
}

export async function sendEventReminder(eventRequestId: string) {
  const eventRequest = await prisma.eventRequest.findUnique({
    where: { id: eventRequestId },
    include: { guest: { select: { name: true, phone: true, email: true } } },
  });

  if (!eventRequest || eventRequest.status !== EventRequestStatus.accepted) {
    return { sent: false as const, warning: "Event tidak eligible untuk reminder." };
  }
  if (eventRequest.reminderSentAt) {
    return { sent: false as const, warning: "Reminder event sudah pernah dikirim." };
  }

  const vars: TemplateVars = {
    nama: eventRequest.guest.name,
    tanggal: formatDateId(eventRequest.eventDate),
    event_id: eventRequest.id.slice(0, 8),
    detail: eventRequest.eventType ?? "Acara khusus",
  };

  const waResult = await sendWaFromTemplate(
    eventRequest.guest.phone,
    "reservasi_reminder_h1",
    vars,
    "Reminder: besok acara Anda di Rooma Cerita Rasa pada {{tanggal}}.",
  );

  if (waResult.sent) {
    await prisma.eventRequest.update({
      where: { id: eventRequestId },
      data: { reminderSentAt: new Date() },
    });
  }

  return waResult;
}

export async function dispatchEventGuestNotification(
  payload: EventNotificationTrigger,
): Promise<void> {
  const vars: TemplateVars = {
    nama: payload.picName,
    tanggal: formatDateId(payload.eventDate),
    event_id: payload.eventRequestId.slice(0, 8),
    detail: payload.offerPdfUrl ?? "",
    pdf_url: payload.offerPdfUrl ?? "",
    harga: formatCurrency(payload.offerPrice),
    valid_until: "",
  };

  switch (payload.type) {
    case "event_offer_sent":
      await sendWaFromTemplate(
        payload.picPhone,
        "event_offer",
        vars,
        "Halo {{nama}}, kami kirim penawaran acara untuk {{tanggal}}. Detail: {{detail}}",
      );
      if (payload.picEmail) {
        await sendEmailFromTemplate(
          payload.picEmail,
          "event_offer",
          "Penawaran Acara — Rooma Cerita Rasa",
          vars,
          "<p>Halo {{nama}},</p><p>Berikut penawaran acara untuk tanggal {{tanggal}}.</p><p><a href=\"{{pdf_url}}\">Lihat penawaran (PDF)</a></p>",
        );
      }
      break;

    case "event_deposit_paid":
    case "event_accepted":
      await sendWaFromTemplate(
        payload.picPhone,
        "event_konfirmasi",
        vars,
        "Halo {{nama}}, acara Anda pada {{tanggal}} telah dikonfirmasi. ID: {{event_id}}",
      );
      if (payload.picEmail) {
        await sendEmailFromTemplate(
          payload.picEmail,
          "event_konfirmasi",
          "Konfirmasi Acara — Rooma Cerita Rasa",
          vars,
          "<p>Halo {{nama}},</p><p>Acara Anda pada {{tanggal}} telah dikonfirmasi.</p>",
        );
      }
      break;

    case "event_cancelled":
      await sendWaFromTemplate(
        payload.picPhone,
        "event_cancelled",
        vars,
        "Halo {{nama}}, permintaan acara pada {{tanggal}} dibatalkan. Hubungi kami jika ada pertanyaan.",
      );
      if (payload.picEmail) {
        await sendEmailFromTemplate(
          payload.picEmail,
          "event_cancelled",
          "Pembatalan Acara — Rooma Cerita Rasa",
          vars,
          "<p>Halo {{nama}},</p><p>Permintaan acara pada {{tanggal}} telah dibatalkan.</p>",
        );
      }
      break;

    default:
      console.warn("[guest-notify] Unknown event notification type:", payload.type);
  }
}

export async function runDailyReminders() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  const [reservations, events] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        date: targetDate,
        status: ReservationStatus.confirmed,
        reminderSentAt: null,
      },
      select: { id: true },
    }),
    prisma.eventRequest.findMany({
      where: {
        eventDate: targetDate,
        status: EventRequestStatus.accepted,
        reminderSentAt: null,
      },
      select: { id: true },
    }),
  ]);

  const results = {
    reservations: { total: reservations.length, sent: 0, failed: 0 },
    events: { total: events.length, sent: 0, failed: 0 },
  };

  for (const r of reservations) {
    try {
      const result = await sendReservationReminder(r.id);
      if (result.sent) results.reservations.sent++;
      else results.reservations.failed++;
    } catch (error) {
      console.error("[reminders] reservation:", r.id, error);
      results.reservations.failed++;
    }
  }

  for (const e of events) {
    try {
      const result = await sendEventReminder(e.id);
      if (result.sent) results.events.sent++;
      else results.events.failed++;
    } catch (error) {
      console.error("[reminders] event:", e.id, error);
      results.events.failed++;
    }
  }

  return results;
}
