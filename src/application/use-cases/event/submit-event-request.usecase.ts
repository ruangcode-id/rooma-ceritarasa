import crypto from "crypto";
import { submitEventRequestSchema } from "@/validations/event-request.validation";
import { findOrCreateGuest } from "@/infrastructure/repositories/guest.repository";
import { createEventRequest } from "@/infrastructure/repositories/event.repository";
import { eventNotificationService } from "@/infrastructure/services/notification.service";

/**
 * Use case: Public submit event request.
 *
 * Alur:
 * 1. Validasi payload menggunakan Zod schema
 * 2. Cari Guest berdasarkan nomor HP; buat baru jika belum ada
 * 3. Simpan EventRequest baru dengan status 'pending'
 *
 * Tidak memerlukan autentikasi (public endpoint).
 */
export async function submitEventRequestUseCase(body: unknown, appUrl: string) {
  // 1. Validasi input — ZodError akan di-throw jika tidak valid
  const input = submitEventRequestSchema.parse(body);
  const contactName = input.name.trim();
  const contactEmail = input.email?.trim() || null;
  const accessToken = crypto.randomBytes(32).toString("base64url");

  // 2. Cari atau buat Guest berdasarkan nomor HP
  const guest = await findOrCreateGuest({
    name: contactName,
    phone: input.phone,
    email: contactEmail,
  });

  // 3. Buat EventRequest
  const eventRequest = await createEventRequest({
    guestId: guest.id,
    contactName,
    contactPhone: guest.phone,
    contactEmail,
    accessToken,
    eventType: input.eventType,
    eventDate: input.eventDate,
    partySize: input.partySize,
    description: input.description,
    sessionId: input.sessionId,
  });
  const trackingUrl = `${appUrl.replace(/\/+$/, "")}/event/request/${accessToken}`;

  eventNotificationService
    .triggerEventNotification({
      type: "event_request_received",
      eventRequestId: eventRequest.id,
      picName: eventRequest.contactName,
      picPhone: eventRequest.contactPhone,
      picEmail: eventRequest.contactEmail,
      eventDate: eventRequest.eventDate,
      trackingUrl,
    })
    .catch((error) =>
      console.error("[event-request] Confirmation notification failed:", error)
    );

  return {
    id: eventRequest.id,
    accessToken,
    trackingUrl,
    status: eventRequest.status,
    guest: {
      id: guest.id,
      name: eventRequest.contactName,
    },
    eventDate: eventRequest.eventDate,
    createdAt: eventRequest.createdAt,
  };
}
