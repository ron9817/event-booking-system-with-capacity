import type { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../utils/logger.js";
import { config } from "../config.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.statusCode, err.message, err.errors);
  }

  logger.error({ err }, "Unhandled error");

  return ApiResponse.error(
    res,
    500,
    config.NODE_ENV === "production" ? "Internal server error" : err.message,
  );
};
