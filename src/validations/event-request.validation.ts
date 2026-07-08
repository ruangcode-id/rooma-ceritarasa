import { z } from "zod";
import { INDONESIAN_MOBILE_REGEX } from "@/lib/phone";

/**
 * Skema validasi untuk public event request form.
 * Tamu mengisi formulir ini tanpa perlu login.
 * Zod v4 — gunakan .min(1) bukan .nonempty()
 */
export const submitEventRequestSchema = z.object({
  /** Nama lengkap PIC (Person in Charge) acara */
  name: z.string().trim().min(1, "Nama PIC wajib diisi").max(100, "Nama maksimal 100 karakter"),

  /** Nomor handphone PIC — digunakan untuk lookup/create Guest */
  phone: z
    .string()
    .trim()
    .min(1, "Nomor HP wajib diisi")
    .regex(INDONESIAN_MOBILE_REGEX, "Format nomor HP tidak valid (contoh: 08xx atau +62xx)"),

  /** Email PIC — opsional, digunakan untuk notifikasi via Resend */
  email: z
    .union([z.literal(""), z.string().trim().email("Format email tidak valid")])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),

  /** Jenis acara — contoh: Wedding, Gathering, Ulang Tahun */
  eventType: z
    .string()
    .trim()
    .max(100, "Jenis acara maksimal 100 karakter")
    .optional()
    .nullable(),

  /** Tanggal pelaksanaan acara */
  eventDate: z.coerce
    .date({ error: "Tanggal acara tidak valid" })
    .refine((d) => d > new Date(), { message: "Tanggal acara harus di masa depan" }),

  /** Estimasi jumlah tamu */
  partySize: z.coerce
    .number({ error: "Jumlah tamu harus berupa angka" })
    .int("Jumlah tamu harus bilangan bulat")
    .positive("Jumlah tamu harus lebih dari 0")
    .max(10000, "Jumlah tamu terlalu banyak")
    .optional()
    .nullable(),

  /** Deskripsi kebutuhan / catatan tambahan dari PIC */
  description: z.string().trim().max(5000, "Deskripsi maksimal 5000 karakter").optional().nullable(),

  /** ID sesi makan (RestaurantSession) — opsional jika tamu ingin sesi tertentu */
  sessionId: z.string().uuid("SessionId harus berupa UUID valid").optional().nullable(),
});

export type SubmitEventRequestInput = z.infer<typeof submitEventRequestSchema>;
