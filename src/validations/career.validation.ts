import { z } from "zod";

export const careerApplySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(150),
  phone: z.string().min(1).max(20),
  jobListingId: z.string().uuid(),
  coverLetter: z.string().optional(),
});

export type CareerApplyInput = z.infer<typeof careerApplySchema>;
