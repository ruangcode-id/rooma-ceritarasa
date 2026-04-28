import { z } from "zod";

export const createEventRequestSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(150).optional(),
  sessionId: z.string().uuid().optional(),
  eventType: z.string().max(100).optional(),
  eventDate: z.string().date(),
  partySize: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export type CreateEventRequestInput = z.infer<typeof createEventRequestSchema>;
