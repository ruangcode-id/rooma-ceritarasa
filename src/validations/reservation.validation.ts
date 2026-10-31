import { z } from "zod";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

const guestNameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(100, "Nama maksimal 100 karakter.");

const guestPhoneSchema = z
  .string()
  .trim()
  .refine(isValidPhoneNumber, "Format nomor telepon tidak valid.")
  .transform(normalizePhoneNumber);

export const publicReservationSchema = z.object({
  guestName: guestNameSchema,
  guestPhone: guestPhoneSchema,
  guestEmail: z
    .union([z.literal(""), z.string().trim().email("Email tidak valid.")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  guestBirthdate: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD."),
    ])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  sessionId: z.string().uuid("Session ID harus berupa UUID yang valid."),
  tableIds: z
    .array(
      z.string().uuid({
        message: "Setiap tableId harus berupa UUID yang valid.",
      }),
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
  vipToken: z
    .string()
    .trim()
    .optional(),
});

export const cancelReservationSchema = z.object({
  cancelToken: z.string().min(1).max(100),
});

export const adminUpdateReservationSchema = z
  .object({
    status: z
      .enum(["confirmed", "checked_in", "no_show", "cancelled"] as const, {
        error:
          "Invalid status. Must be one of: confirmed, checked_in, no_show, cancelled",
      })
      .optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
      .optional(),
    sessionId: z.string().uuid("Session ID harus berupa UUID yang valid.").optional(),
    tableIds: z
      .array(z.string().uuid("Setiap tableId harus berupa UUID yang valid."))
      .min(1, "Minimal pilih satu meja.")
      .optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.date !== undefined ||
      data.sessionId !== undefined ||
      data.tableIds !== undefined,
    {
      message: "Minimal satu field harus diisi untuk update atau reschedule reservasi.",
    }
  )
  .refine(
    (data) => {
      if ((data.date !== undefined || data.sessionId !== undefined) && !data.tableIds) {
        return false;
      }
      return true;
    },
    {
      message: "Jika tanggal atau sesi diubah, meja baru (tableIds) wajib dipilih.",
      path: ["tableIds"],
    }
  );

export type PublicReservationInput = z.infer<typeof publicReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type AdminUpdateReservationInput = z.infer<typeof adminUpdateReservationSchema>;
