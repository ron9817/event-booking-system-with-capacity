import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const extractUserId = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const userId = req.headers["x-user-id"];

  if (!userId || typeof userId !== "string" || !UUID_RE.test(userId)) {
    throw ApiError.badRequest("Missing or invalid x-user-id header");
  }

  req.userId = userId;
  next();
};
