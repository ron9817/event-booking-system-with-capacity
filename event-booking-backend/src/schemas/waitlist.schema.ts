import { z } from "zod";

export const waitlistParamsSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format"),
});

export const waitlistListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type WaitlistParams = z.infer<typeof waitlistParamsSchema>;
export type WaitlistListQuery = z.infer<typeof waitlistListQuerySchema>;
