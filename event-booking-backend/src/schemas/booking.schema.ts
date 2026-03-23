import { z } from "zod";

export const MAX_BOOKING_QUANTITY = 10;

export const bookingParamsSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format"),
});

export const bookingBodySchema = z.object({
  quantity: z
    .number({ error: "quantity must be a number" })
    .int({ error: "quantity must be an integer" })
    .min(1, { error: "quantity must be at least 1" })
    .max(MAX_BOOKING_QUANTITY, { error: `quantity must not exceed ${MAX_BOOKING_QUANTITY}` }),
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
export type BookingBody = z.infer<typeof bookingBodySchema>;
export type UserBookingsParams = z.infer<typeof userBookingsParamsSchema>;
export type UserBookingsQuery = z.infer<typeof userBookingsQuerySchema>;
