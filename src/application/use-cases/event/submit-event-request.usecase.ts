import { submitEventRequestSchema } from "@/validations/event-request.validation";
import { findOrCreateGuest } from "@/infrastructure/repositories/guest.repository";
import { createEventRequest } from "@/infrastructure/repositories/event.repository";

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
export async function submitEventRequestUseCase(body: unknown) {
  // 1. Validasi input — ZodError akan di-throw jika tidak valid
  const input = submitEventRequestSchema.parse(body);

  // 2. Cari atau buat Guest berdasarkan nomor HP
  const guest = await findOrCreateGuest({
    name: input.name,
    phone: input.phone,
    email: input.email,
  });

  // 3. Buat EventRequest
  const eventRequest = await createEventRequest({
    guestId: guest.id,
    eventType: input.eventType,
    eventDate: input.eventDate,
    partySize: input.partySize,
    description: input.description,
    sessionId: input.sessionId,
  });

  return {
    id: eventRequest.id,
    status: eventRequest.status,
    guest: {
      id: guest.id,
      name: guest.name,
    },
    eventDate: eventRequest.eventDate,
    createdAt: eventRequest.createdAt,
  };
}
