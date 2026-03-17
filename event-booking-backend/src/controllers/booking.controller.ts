import type { Request, Response } from "express";
import { bookingService } from "../services/booking.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import type {
  BookingParams,
  UserBookingsParams,
  UserBookingsQuery,
} from "../schemas/booking.schema.js";

export const bookingController = {
  async listByUser(req: Request, res: Response) {
    const { userId } = req.validated as UserBookingsParams;
    const query = req.validated as UserBookingsQuery;
    const { data, meta } = await bookingService.listByUser(userId, query);
    ApiResponse.paginated(res, data, meta);
  },

  async book(req: Request, res: Response) {
    const { eventId } = req.validated as BookingParams;
    const result = await bookingService.bookEvent(eventId, req.userId);

    if (result.type === "waitlisted") {
      ApiResponse.success(res, result.data, 202);
    } else {
      ApiResponse.success(res, result.data, 201);
    }
  },

  async cancel(req: Request, res: Response) {
    const { eventId } = req.validated as BookingParams;
    const booking = await bookingService.cancelBooking(eventId, req.userId);
    ApiResponse.success(res, booking);
  },
};
