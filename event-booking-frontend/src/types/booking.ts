import type { BookingEvent } from "./event";

export type BookingStatus = "CONFIRMED" | "CANCELLED";

/** Booking returned by POST/DELETE (has eventId/userId, no nested event) */
export interface BookingResult {
  id: string;
  eventId: string;
  userId: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

/** Booking returned by GET /users/:userId/bookings (has nested event, no eventId/userId) */
export interface Booking {
  id: string;
  eventId?: string;
  userId?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  event?: BookingEvent;
}
