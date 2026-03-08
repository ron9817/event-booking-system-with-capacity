import { z } from "zod";

export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const eventIdParamSchema = z.object({
  id: z.string().uuid("Invalid event ID format"),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
