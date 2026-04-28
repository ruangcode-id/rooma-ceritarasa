import { z } from "zod";

export const createReservationSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(150).optional(),
  sessionId: z.string().uuid(),
  date: z.string().date(),
  partySize: z.number().int().positive(),
  specialRequest: z.string().optional(),
});

export const cancelReservationSchema = z.object({
  cancelToken: z.string().min(1).max(100),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
