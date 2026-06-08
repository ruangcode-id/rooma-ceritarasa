import { z } from "zod";

/**
 * Zod v4 — gunakan .min(1) bukan .nonempty()
 */

export const submitOfferSchema = z.object({
  price: z
    .number({ error: "Harga harus berupa angka" })
    .positive({ error: "Harga harus lebih dari 0" }),
  description: z.string().min(1, { error: "Deskripsi penawaran wajib diisi" }).optional(),
});

export type SubmitOfferInput = z.infer<typeof submitOfferSchema>;

export const updateEventRequestStatusSchema = z.object({
  status: z.enum(["rejected", "cancelled"], {
    error: "Status hanya bisa diubah ke 'rejected' atau 'cancelled'",
  }),
});

export type UpdateEventRequestStatusInput = z.infer<typeof updateEventRequestStatusSchema>;
