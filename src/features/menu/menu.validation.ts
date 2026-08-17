import { z } from "zod";

export const menuSortSchema = z
  .enum(["latest", "oldest", "sort_order"])
  .optional()
  .default("sort_order");

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

export const adminMenuListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  category: z.preprocess(normalizeOptionalString, z.string().max(100).optional()),
  isActive: z.preprocess(normalizeOptionalBoolean, z.boolean().optional()),
  sort: menuSortSchema,
});

export type AdminMenuListQuery = z.infer<typeof adminMenuListQuerySchema>;

export const publicMenuListQuerySchema = z.object({
  category: z.preprocess(normalizeOptionalString, z.string().max(100).optional()),
  sort: menuSortSchema,
});

export type PublicMenuListQuery = z.infer<typeof publicMenuListQuerySchema>;

export const createMenuPhotoSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.preprocess(
    normalizeOptionalNullableString,
    z.string().max(5000).nullable().optional(),
  ),
  category: z.string().trim().min(1, "Category is required.").max(100).default("Signature"),
  price: z.preprocess(
    normalizeOptionalNumber,
    z.coerce.number().int().nonnegative().nullable().optional(),
  ),
  sortOrder: z.preprocess(
    normalizeOptionalNumber,
    z.coerce.number().int().optional().default(0),
  ),
  isActive: z.preprocess(normalizeOptionalBoolean, z.boolean().optional().default(true)),
});

export type CreateMenuPhotoInput = z.infer<typeof createMenuPhotoSchema>;

export const updateMenuPhotoSchema = z.object({
  title: z.preprocess(normalizeOptionalString, z.string().max(200).optional()),
  description: z.preprocess(
    normalizeOptionalNullableString,
    z.string().max(5000).nullable().optional(),
  ),
  category: z.preprocess(normalizeOptionalString, z.string().max(100).optional()),
  price: z.preprocess(
    normalizeOptionalNumber,
    z.coerce.number().int().nonnegative().nullable().optional(),
  ),
  sortOrder: z.preprocess(normalizeOptionalNumber, z.coerce.number().int().optional()),
  isActive: z.preprocess(normalizeOptionalBoolean, z.boolean().optional()),
});

export type UpdateMenuPhotoInput = z.infer<typeof updateMenuPhotoSchema>;
