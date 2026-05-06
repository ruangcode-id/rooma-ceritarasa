import { z } from "zod";
import { isValidIndonesianMobile, normalizeIndonesianPhone } from "@/lib/phone";

export const GUEST_TAGS = [
  "VIP",
  "ALLERGY",
  "BIRTHDAY",
  "REGULAR",
  "BLACKLIST",
] as const;

export const guestTagSchema = z.enum(GUEST_TAGS);

const optionalIsoDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined));

export const guestPhoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .refine(isValidIndonesianMobile, {
    message: "Nomor telepon tidak valid (gunakan format 08xx atau +62xx).",
  })
  .transform(normalizeIndonesianPhone);

export const createGuestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: guestPhoneSchema,
  email: z
    .union([z.literal(""), z.string().trim().email()])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  birthdate: optionalIsoDate.transform((v) =>
    v ? new Date(`${v}T00:00:00.000Z`) : undefined,
  ),
  isVip: z.boolean().optional().default(false),
  notes: z.string().trim().max(5000).optional(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const patchGuestSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: guestPhoneSchema.optional(),
    email: z
      .union([z.literal(""), z.string().trim().email()])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    birthdate: z
      .union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional(),
    isVip: z.boolean().optional(),
    notes: z.union([z.string().trim().max(5000), z.literal("")]).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Minimal satu field harus diisi.",
  });

export type PatchGuestInput = z.infer<typeof patchGuestSchema>;

export const guestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "totalVisits", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  tag: guestTagSchema.optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? normalizeIndonesianPhone(v) : undefined)),
});

export type GuestListQuery = z.infer<typeof guestListQuerySchema>;

export const createGuestNoteSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const patchGuestNoteSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const patchGuestTagsSchema = z
  .object({
    add: z.array(guestTagSchema).optional().default([]),
    remove: z.array(guestTagSchema).optional().default([]),
  })
  .refine((v) => v.add.length > 0 || v.remove.length > 0, {
    message: "Minimal salah satu dari add/remove harus diisi.",
  });

export const guestNotesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
