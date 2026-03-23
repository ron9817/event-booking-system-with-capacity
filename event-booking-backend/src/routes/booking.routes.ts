import { Router } from "express";
import { bookingController } from "../controllers/booking.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import { extractUserId } from "../middlewares/extractUserId.js";
import { bookingLimiter } from "../middlewares/rateLimiter.js";
import { bookingParamsSchema, bookingBodySchema } from "../schemas/booking.schema.js";

const router = Router();

router.post(
  "/:eventId/bookings",
  bookingLimiter,
  extractUserId,
  validate(bookingParamsSchema, "params"),
  validate(bookingBodySchema, "body"),
  asyncHandler(bookingController.book),
);

router.delete(
  "/:eventId/bookings",
  bookingLimiter,
  extractUserId,
  validate(bookingParamsSchema, "params"),
  asyncHandler(bookingController.cancel),
);

export default router;
