import { Router } from "express";
import { eventController } from "../controllers/event.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import {
  eventListQuerySchema,
  eventIdParamSchema,
} from "../schemas/event.schema.js";

const router = Router();

router.get(
  "/",
  validate(eventListQuerySchema, "query"),
  asyncHandler(eventController.list),
);

router.get(
  "/:id",
  validate(eventIdParamSchema, "params"),
  asyncHandler(eventController.getById),
);

export default router;
