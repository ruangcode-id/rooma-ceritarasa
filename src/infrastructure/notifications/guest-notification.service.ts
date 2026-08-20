import { prisma } from "@/infrastructure/database/prisma";
import {
  buildCheckInQrEmailBlock,
  CHECK_IN_QR_CID,
  resolveCheckInQrEmailAssets,
  generateCheckInQrBuffer,
} from "@/infrastructure/check-in/qr-code";
import { SettingsRepository } from "@/infrastructure/repositories/settings.repository";
import { sendWhatsAppMessage, sendWhatsAppMessageWithImage } from "@/infrastructure/whatsapp/fonnte";
import { sendTransactionalEmail } from "@/infrastructure/email/resend";
import { renderTemplate } from "@/lib/render-template";
import { ReservationStatus } from "@/generated/prisma/client";

type TemplateVars = Record<string, string | number | null | undefined>;

const REMINDER_TIME_ZONE = "Asia/Jakarta";

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
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: REMINDER_TIME_ZONE,
  }).format(value);
}

function formatTimeFromSession(startTime: Date, endTime?: Date): string {
  const formatSingle = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(d).replace(":", ".");

  const startStr = formatSingle(startTime);
  if (endTime) {
    const endStr = formatSingle(endTime);
    return `${startStr} - ${endStr} WIB`;
  }

  return `${startStr} WIB`;
}

function formatReminderDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function reservationDateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function getDailyReminderTargetDate(now: Date = new Date()): Date {
  const todayKey = formatReminderDateKey(now);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  return reservationDateFromKey(tomorrowKey);
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

export async function sendWaImageFromTemplate(
  phone: string,
  templateKey: string,
  variables: TemplateVars,
  imageBuffer: Buffer,
  filename: string,
  fallbackMessage?: string,
) {
  const templates = await loadWaTemplates();
  const raw = templates[templateKey] ?? fallbackMessage;
  if (!raw) {
    console.warn(`[guest-notify] WA template '${templateKey}' tidak ditemukan.`);
    return { sent: false as const, warning: `Template WA '${templateKey}' kosong.` };
  }
  const message = renderTemplate(raw, variables);
  return sendWhatsAppMessageWithImage(phone, message, imageBuffer, filename);
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

async function buildEmailHtmlFromTemplate(
  templateKey: string,
  variables: TemplateVars,
  fallbackHtml?: string,
): Promise<string | null> {
  const templates = await loadEmailTemplates();
  const raw = templates[templateKey] ?? fallbackHtml;
  if (!raw) return null;
  return renderTemplate(raw, variables);
}

async function sendReservationEmailWithCheckInQr(params: {
  to: string;
  subject: string;
  templateKey: string;
  vars: TemplateVars;
  fallbackHtml: string;
  checkInCode: string;
}) {
  const bodyHtml = await buildEmailHtmlFromTemplate(
    params.templateKey,
    params.vars,
    params.fallbackHtml,
  );

  if (!bodyHtml) {
    console.warn(`[guest-notify] Email template '${params.templateKey}' tidak ditemukan.`);
    return { sent: false as const, warning: `Template email '${params.templateKey}' kosong.` };
  }

  let html = bodyHtml;
  let attachments: { filename: string; content: Buffer; contentId?: string }[] | undefined;

  if (params.checkInCode) {
    try {
      const qrAssets = await resolveCheckInQrEmailAssets(params.checkInCode);
      if (qrAssets) {
        html += buildCheckInQrEmailBlock(params.checkInCode, qrAssets.imageSrc);
        if (qrAssets.inlineAttachment) {
          attachments = [
            {
              filename: "check-in-qr.png",
              content: qrAssets.qrBuffer,
              contentId: CHECK_IN_QR_CID,
            },
          ];
        }
      } else {
        console.warn("[guest-notify] QR email block skipped: no image source.");
      }
    } catch (error) {
      console.error("[guest-notify] QR email block failed:", error);
    }
  } else {
    console.warn("[guest-notify] checkInToken missing — email tanpa QR.");
  }

  return sendTransactionalEmail({
    to: params.to,
    subject: params.subject,
    html,
    attachments,
  });
}

async function getReservationNotifyContext(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      guest: { select: { name: true, phone: true, email: true } },
      session: { select: { name: true, startTime: true, endTime: true } },
      reservationTables: {
        include: {
          table: { select: { tableNumber: true } },
        },
      },
    },
  });
}

function buildReservationVars(reservation: {
  id: string;
  date: Date;
  partySize: number;
  guest: { name: string };
  session: { name: string; startTime: Date; endTime?: Date };
  reservationTables?: Array<{ table: { tableNumber: string } }>;
}): TemplateVars {
  const rawTables = (reservation.reservationTables || [])
    .map((rt) => rt.table.tableNumber)
    .filter(Boolean);

  const formattedTables =
    rawTables.length > 0
      ? rawTables
          .map((t) => {
            const clean = t.replace(/^Table\s*/i, "").trim();
            return `Table ${clean}`;
          })
          .join(", ")
      : "-";

  return {
    nama: reservation.guest.name,
    tanggal: formatDateId(reservation.date),
    waktu: formatTimeFromSession(reservation.session.startTime, reservation.session.endTime),
    session: reservation.session.name,
    reservation_id: reservation.id.slice(0, 8),
    party_size: reservation.partySize,
    meja: formattedTables,
    table: formattedTables,
    table_number: formattedTables,
  };
}

const DEFAULT_WA_RESERVATION_CONFIRMED_TEMPLATE = [
  "Hello *{{nama}}* 😊,",
  "",
  "Thank you! Your reservation at Rooma Ceritarasa has been successfully confirmed.",
  "",
  "Here are your reservation details:",
  "",
  "• Date: {{tanggal}}",
  "• Time: {{waktu}}",
  "• Reserved Table: {{table}}",
  "• Check-in Code: {{check_in_code}}",
  "",
  "A QR Code for check-in has been sent to your email. Please present the QR Code or Check-in Code upon arrival.",
  "",
  "Please arrive on time. Reservations will be automatically cancelled if arrival exceeds 15 minutes🙏🏻",
  "",
  "We look forward to welcoming you to Rooma Ceritarasa.",
  "",
  "Warm regards,",
  "*Rooma Ceritarasa*",
].join("\n");

export async function notifyGuestReservationConfirmed(reservationId: string) {
  const reservation = await getReservationNotifyContext(reservationId);
  if (!reservation || reservation.status !== ReservationStatus.confirmed) {
    return;
  }

  const checkInCode = reservation.checkInToken?.trim() ?? "";
  const vars: TemplateVars = {
    ...buildReservationVars(reservation),
    check_in_code: checkInCode,
  };

  await sendWaFromTemplate(
    reservation.guest.phone,
    "reservasi_konfirmasi",
    vars,
    DEFAULT_WA_RESERVATION_CONFIRMED_TEMPLATE,
  );

  if (reservation.guest.email) {
    await sendReservationEmailWithCheckInQr({
      to: reservation.guest.email,
      subject: "Reservation Confirmation — Rooma Ceritarasa",
      templateKey: "reservasi_konfirmasi",
      vars,
      fallbackHtml:
        "<p>Hello {{nama}},</p><p>Your reservation on <strong>{{tanggal}}</strong> at <strong>{{waktu}}</strong> (<strong>{{table}}</strong>) has been confirmed.</p>",
      checkInCode,
    });
  }
}

export async function notifyGuestPaymentSuccess(reservationId: string) {
  const reservation = await getReservationNotifyContext(reservationId);
  if (!reservation) return;

  const checkInCode = reservation.checkInToken?.trim() ?? "";
  if (!checkInCode) {
    console.warn("[guest-notify] checkInToken missing for reservation:", reservationId);
  }

  const guestEmail = reservation.guest.email?.trim() ?? "";
  const vars: TemplateVars = {
    ...buildReservationVars(reservation),
    reservation_id: reservation.id,
    check_in_code: checkInCode,
    email: guestEmail,
  };

  let qrBuffer: Buffer | null = null;
  if (checkInCode) {
    try {
      qrBuffer = await generateCheckInQrBuffer(checkInCode);
    } catch (error) {
      console.warn("[guest-notify] Failed to generate QR buffer for WA:", error);
    }
  }

  if (qrBuffer) {
    await sendWaImageFromTemplate(
      reservation.guest.phone,
      "payment_success",
      vars,
      qrBuffer,
      "check-in-qr.png",
      DEFAULT_WA_RESERVATION_CONFIRMED_TEMPLATE,
    );
  } else {
    // Fallback to text only if QR generation fails or checkInCode is missing
    await sendWaFromTemplate(
      reservation.guest.phone,
      "payment_success",
      vars,
      DEFAULT_WA_RESERVATION_CONFIRMED_TEMPLATE,
    );
  }

  if (guestEmail) {
    await sendReservationEmailWithCheckInQr({
      to: guestEmail,
      subject: "Payment Successful — Rooma Ceritarasa",
      templateKey: "payment_success",
      vars,
      fallbackHtml: checkInCode
        ? `<p>Hello {{nama}},</p>
<p>Payment for reservation <strong>{{reservation_id}}</strong> was successful.</p>
<p>Your reservation on <strong>{{tanggal}}</strong> at <strong>{{waktu}}</strong> (<strong>{{table}}</strong>) has been confirmed.</p>`
        : "<p>Hello {{nama}},</p><p>Payment for reservation <strong>{{reservation_id}}</strong> was successful.</p>",
      checkInCode,
    });
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
    "Reminder: Tomorrow is your reservation at Rooma Ceritarasa on {{tanggal}} at {{waktu}} ({{table}}).",
  );

  if (waResult.sent) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { reminderSentAt: new Date() },
    });
  }

  return waResult;
}



export async function runDailyReminders(now: Date = new Date()) {
  const targetDate = getDailyReminderTargetDate(now);

  const [reservations] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        date: targetDate,
        status: ReservationStatus.confirmed,
        reminderSentAt: null,
      },
      select: { id: true },
    }),
  ]);

  const results = {
    reservations: { total: reservations.length, sent: 0, failed: 0 },
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

  return results;
}
