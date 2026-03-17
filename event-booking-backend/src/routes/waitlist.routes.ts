import { Router } from "express";
import { waitlistController } from "../controllers/waitlist.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import { extractUserId } from "../middlewares/extractUserId.js";
import { bookingLimiter } from "../middlewares/rateLimiter.js";
import {
  waitlistParamsSchema,
  waitlistListQuerySchema,
} from "../schemas/waitlist.schema.js";

const router = Router();

router.get(
  "/:eventId/waitlist/me",
  bookingLimiter,
  extractUserId,
  validate(waitlistParamsSchema, "params"),
  asyncHandler(waitlistController.getMyPosition),
);

router.delete(
  "/:eventId/waitlist/me",
  bookingLimiter,
  extractUserId,
  validate(waitlistParamsSchema, "params"),
  asyncHandler(waitlistController.leave),
);

router.get(
  "/:eventId/waitlist",
  validate(waitlistParamsSchema, "params"),
  validate(waitlistListQuerySchema, "query"),
  asyncHandler(waitlistController.list),
);

export default router;
