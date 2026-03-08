import rateLimit from "express-rate-limit";
import { config } from "../config.js";

const skipInTest = () => config.NODE_ENV === "test";

export const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

export const bookingLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_BOOKING_WINDOW_MS,
  limit: config.RATE_LIMIT_BOOKING_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => (req.headers["x-user-id"] as string) || "unknown",
  message: {
    success: false,
    message: "Too many booking requests, please try again later",
  },
});
