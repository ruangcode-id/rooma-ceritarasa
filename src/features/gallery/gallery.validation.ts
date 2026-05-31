import { z } from "zod";

export const gallerySortSchema = z
  .enum(["latest", "oldest", "sort_order"])
  .optional()
  .default("latest");

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNullableString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === undefined || value === "") return undefined;
  return value;
}

function normalizeOptionalBoolean(value: unknown) {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export const adminGalleryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.preprocess(
    normalizeOptionalString,
    z.string().max(100).optional(),
  ),
  isActive: z.preprocess(normalizeOptionalBoolean, z.boolean().optional()),
  sort: gallerySortSchema,
});

export type AdminGalleryListQuery = z.infer<typeof adminGalleryListQuerySchema>;

export const publicGalleryListQuerySchema = z.object({
  category: z.preprocess(
    normalizeOptionalString,
    z.string().max(100).optional(),
  ),
  sort: gallerySortSchema,
});

export type PublicGalleryListQuery = z.infer<typeof publicGalleryListQuerySchema>;

export const createGallerySchema = z.object({
  title: z.string().trim().min(1, "title wajib diisi.").max(200),
  description: z.preprocess(
    normalizeOptionalNullableString,
    z.string().max(5000).nullable().optional(),
  ),
  category: z.string().trim().min(1, "category wajib diisi.").max(100),
  sortOrder: z.preprocess(
    normalizeOptionalNumber,
    z.coerce.number().int().optional().default(0),
  ),
  isActive: z.preprocess(
    normalizeOptionalBoolean,
    z.boolean().optional().default(true),
  ),
});

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;

export const updateGallerySchema = z.object({
  title: z
    .preprocess(normalizeOptionalString, z.string().max(200).optional()),
  description: z.preprocess(
    normalizeOptionalNullableString,
    z.string().max(5000).nullable().optional(),
  ),
  category: z
    .preprocess(normalizeOptionalString, z.string().max(100).optional()),
  sortOrder: z.preprocess(
    normalizeOptionalNumber,
    z.coerce.number().int().optional(),
  ),
  isActive: z.preprocess(normalizeOptionalBoolean, z.boolean().optional()),
});

export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;
