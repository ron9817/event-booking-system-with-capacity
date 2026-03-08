import { Router } from "express";
import { bookingController } from "../controllers/booking.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import {
  userBookingsParamsSchema,
  userBookingsQuerySchema,
} from "../schemas/booking.schema.js";

const router = Router();

router.get(
  "/:userId/bookings",
  validate(userBookingsParamsSchema, "params"),
  validate(userBookingsQuerySchema, "query"),
  asyncHandler(bookingController.listByUser),
);

export default router;
