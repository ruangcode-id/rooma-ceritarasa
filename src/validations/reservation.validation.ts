import { z } from "zod";
import { guestNameSchema, guestPhoneSchema } from "./guest.validation";

export const publicReservationSchema = z.object({
  guestName: guestNameSchema,
  guestPhone: guestPhoneSchema,
  guestEmail: z.union([z.literal(""), z.string().trim().email()]).optional().transform((v) => (v === "" ? undefined : v)),
  sessionId: z.string().uuid(),
  tableIds: z
    .array(z.string().uuid({ message: "Setiap tableId harus berupa UUID yang valid." }))
    .min(1, "Minimal pilih satu meja."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  partySize: z.coerce.number().int().positive(),
  specialRequest: z.string().trim().max(1000).optional(),
});

export const cancelReservationSchema = z.object({
  cancelToken: z.string().min(1).max(100),
});

export type PublicReservationInput = z.infer<typeof publicReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
