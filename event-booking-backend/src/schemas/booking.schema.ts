import { z } from "zod";

export const bookingParamsSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format"),
});

export const userBookingsParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

export const userBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
});

export type BookingParams = z.infer<typeof bookingParamsSchema>;
export type UserBookingsParams = z.infer<typeof userBookingsParamsSchema>;
export type UserBookingsQuery = z.infer<typeof userBookingsQuerySchema>;
