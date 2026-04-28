import { z } from "zod";

export const createGuestSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(150).optional(),
  notes: z.string().optional(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
