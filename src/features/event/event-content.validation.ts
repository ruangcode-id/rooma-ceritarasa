import { z } from "zod";

export const createEventContentSchema = z.object({
  title: z.string().min(1, { error: "Judul wajib diisi" }).max(200),
  description: z.string().optional(),
  imageUrl: z.string().url({ error: "imageUrl harus berupa URL yang valid" }).optional(),
  eventDate: z
    .string()
    .datetime({ offset: true, message: "eventDate harus berupa ISO 8601 date string" })
    .optional(),
  isPublished: z.boolean().optional().default(false),
});

export const updateEventContentSchema = createEventContentSchema.partial();

export type CreateEventContentInput = z.infer<typeof createEventContentSchema>;
export type UpdateEventContentInput = z.infer<typeof updateEventContentSchema>;
