import { z } from "zod";

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const operatingHoursDaySchema = z.object({
  open: z.string().regex(timeRegex, "Format jam buka: HH:MM").optional(),
  close: z.string().regex(timeRegex, "Format jam tutup: HH:MM").optional(),
  closed: z.boolean().optional(),
});

const operatingHoursSchema = z.record(
  z.string().regex(/^[0-6]$/, "Key jam operasional harus 0-6 (0=Minggu)"),
  operatingHoursDaySchema,
);

const socialLinksSchema = z.record(
  z.string().min(1).max(50),
  z.string().url("Setiap social link harus URL valid").max(500),
);

export const updateRestaurantSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().max(2000).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z
    .union([z.literal(""), z.string().trim().email()])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  whatsappNumber: z.string().trim().max(20).optional().nullable(),
  logoUrl: z.string().url().max(2000).optional().nullable(),
  tagline: z.string().trim().max(255).optional().nullable(),
  socialLinks: socialLinksSchema.optional().nullable(),
  operatingHours: operatingHoursSchema.optional().nullable(),
  maxGuestsPerDay: z.coerce.number().int().positive().optional().nullable(),
  depositPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  cancellationPolicy: z.string().trim().max(5000).optional().nullable(),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  confirmationTemplate: z.string().trim().max(5000).optional().nullable(),
  reminderTemplate: z.string().trim().max(5000).optional().nullable(),
});

export type UpdateRestaurantSettingsInput = z.infer<
  typeof updateRestaurantSettingsSchema
>;

export const messageTemplatesSchema = z.record(
  z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Key template: huruf kecil, angka, underscore"),
  z.string().max(10000),
);

export type MessageTemplatesInput = z.infer<typeof messageTemplatesSchema>;
