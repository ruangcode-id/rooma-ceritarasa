import { z } from "zod";

// Regular expression to validate time format HH:MM or HH:MM:SS
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

export const createSessionSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters").max(50),
  startTime: z.string().regex(timeRegex, "Invalid start time format (HH:MM or HH:MM:SS)"),
  endTime: z.string().regex(timeRegex, "Invalid end time format (HH:MM or HH:MM:SS)"),
  capacity: z.number().int().positive("Capacity must be a positive integer"),
  isActive: z.boolean().optional(),
}).refine(data => {
  // Validate that startTime is before endTime
  const start = new Date(`1970-01-01T${data.startTime.length === 5 ? data.startTime + ':00' : data.startTime}Z`);
  const end = new Date(`1970-01-01T${data.endTime.length === 5 ? data.endTime + ':00' : data.endTime}Z`);
  return start < end;
}, {
  message: "Start time must be before end time",
  path: ["startTime"], // Attach error to startTime
});

export const updateSessionSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters").max(50).optional(),
  startTime: z.string().regex(timeRegex, "Invalid start time format (HH:MM or HH:MM:SS)").optional(),
  endTime: z.string().regex(timeRegex, "Invalid end time format (HH:MM or HH:MM:SS)").optional(),
  capacity: z.number().int().positive("Capacity must be a positive integer").optional(),
  isActive: z.boolean().optional(),
}).refine(data => {
  // If both are provided, validate they are in order
  if (data.startTime && data.endTime) {
    const start = new Date(`1970-01-01T${data.startTime.length === 5 ? data.startTime + ':00' : data.startTime}Z`);
    const end = new Date(`1970-01-01T${data.endTime.length === 5 ? data.endTime + ':00' : data.endTime}Z`);
    return start < end;
  }
  return true; // if only one is provided, we can't reliably check order without fetching current state
}, {
  message: "Start time must be before end time",
  path: ["startTime"],
});
