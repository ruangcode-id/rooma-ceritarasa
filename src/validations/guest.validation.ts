import { z } from "zod";
import { isValidIndonesianMobile, normalizeIndonesianPhone } from "@/lib/phone";

const optionalIsoDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined));

export const PREDEFINED_TAGS = ["VIP", "ALLERGY", "BIRTHDAY", "REGULAR", "BLACKLIST"] as const;
export type GuestTag = typeof PREDEFINED_TAGS[number];

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
  tags: z.array(z.enum(PREDEFINED_TAGS)).optional().default([]),
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
    tags: z.array(z.enum(PREDEFINED_TAGS)).optional(),
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
  tag: z.enum(PREDEFINED_TAGS).optional(),
});

export type GuestListQuery = z.infer<typeof guestListQuerySchema>;

export const createGuestNoteSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  tags: z.array(z.enum(PREDEFINED_TAGS)).optional().default([]),
});

export type CreateGuestNoteInput = z.infer<typeof createGuestNoteSchema>;

export const patchGuestNoteSchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    tags: z.array(z.enum(PREDEFINED_TAGS)).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Minimal satu field harus diisi.",
  });

export type PatchGuestNoteInput = z.infer<typeof patchGuestNoteSchema>;

export const updateGuestTagsSchema = z.object({
  tags: z.array(z.enum(PREDEFINED_TAGS)),
});

export type UpdateGuestTagsInput = z.infer<typeof updateGuestTagsSchema>;