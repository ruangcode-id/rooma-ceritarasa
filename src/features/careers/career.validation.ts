import { z } from "zod";

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalBoolean(value: unknown) {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function normalizeOptionalDeadline(value: unknown) {
  if (value === undefined || value === "") return undefined;
  if (value === null) return null;

  if (typeof value === "string" || value instanceof Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date;
  }

  return value;
}

export const careerSortSchema = z
  .enum(["latest", "oldest"])
  .optional()
  .default("latest");

export const adminCareerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  isOpen: z.preprocess(normalizeOptionalBoolean, z.boolean().optional()),
  search: z.preprocess(
    normalizeOptionalString,
    z.string().max(150).optional(),
  ),
  sort: careerSortSchema,
});

export type AdminCareerListQuery = z.infer<typeof adminCareerListQuerySchema>;

export const publicCareerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(
    normalizeOptionalString,
    z.string().max(150).optional(),
  ),
  sort: careerSortSchema,
});

export type PublicCareerListQuery = z.infer<typeof publicCareerListQuerySchema>;

export const createCareerJobSchema = z.object({
  title: z.string().trim().min(1, "title wajib diisi.").max(150),
  description: z.string().trim().min(1, "description wajib diisi."),
  requirements: z.string().trim().min(1, "requirements wajib diisi."),
  deadline: z.preprocess(
    normalizeOptionalDeadline,
    z.date("deadline harus berupa tanggal yang valid.").optional(),
  ),
  isOpen: z.preprocess(
    normalizeOptionalBoolean,
    z.boolean().optional().default(true),
  ),
});

export type CreateCareerJobInput = z.infer<typeof createCareerJobSchema>;

export const updateCareerJobSchema = z.object({
  title: z.preprocess(
    normalizeOptionalString,
    z.string().max(150).optional(),
  ),
  description: z.preprocess(normalizeOptionalString, z.string().optional()),
  requirements: z.preprocess(normalizeOptionalString, z.string().optional()),
  deadline: z.preprocess(
    normalizeOptionalDeadline,
    z.date("deadline harus berupa tanggal yang valid.").nullable().optional(),
  ),
  isOpen: z.preprocess(normalizeOptionalBoolean, z.boolean().optional()),
});

export type UpdateCareerJobInput = z.infer<typeof updateCareerJobSchema>;

export const careerApplicationStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "ACCEPTED",
  "REJECTED",
]);

export const applyCareerSchema = z.object({
  applicantName: z.string().trim().min(1, "applicantName wajib diisi.").max(100),
  applicantEmail: z
    .string()
    .trim()
    .min(1, "applicantEmail wajib diisi.")
    .email("applicantEmail harus berupa email valid.")
    .max(150),
  applicantPhone: z
    .string()
    .trim()
    .min(1, "applicantPhone wajib diisi.")
    .max(20),
  coverLetter: z.preprocess(
    normalizeOptionalString,
    z.string().max(5000).optional(),
  ),
});

export type ApplyCareerInput = z.infer<typeof applyCareerSchema>;

export const adminCareerApplicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  jobId: z.preprocess(
    normalizeOptionalString,
    z.string().uuid("jobId harus berupa UUID yang valid.").optional(),
  ),
  status: careerApplicationStatusSchema.optional(),
  search: z.preprocess(
    normalizeOptionalString,
    z.string().max(150).optional(),
  ),
});

export type AdminCareerApplicationListQuery = z.infer<
  typeof adminCareerApplicationListQuerySchema
>;
