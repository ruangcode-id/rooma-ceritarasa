import { z } from "zod";

const guestNameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(100, "Nama maksimal 100 karakter.");

const guestPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{8,15}$/, "Nomor HP harus berisi 8-15 digit angka.");

export const publicReservationSchema = z.object({
  guestName: guestNameSchema,

  guestPhone: guestPhoneSchema,

  guestEmail: z
    .union([z.literal(""), z.string().trim().email("Email tidak valid.")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),

  sessionId: z.string().uuid("Session ID harus berupa UUID yang valid."),

  tableIds: z
    .array(
      z.string().uuid({
        message: "Setiap tableId harus berupa UUID yang valid.",
      })
    )
    .min(1, "Minimal pilih satu meja."),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD."),

  partySize: z.coerce
    .number()
    .int("Jumlah tamu harus berupa angka bulat.")
    .positive("Jumlah tamu minimal 1."),

  specialRequest: z
    .string()
    .trim()
    .max(1000, "Permintaan khusus maksimal 1000 karakter.")
    .optional(),
});

export type PublicReservationInput = z.infer<typeof publicReservationSchema>;