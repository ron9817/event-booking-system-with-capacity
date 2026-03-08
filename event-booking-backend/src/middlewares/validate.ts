import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

type ValidationTarget = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, target: ValidationTarget = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.validated ??= {};
      Object.assign(req.validated, schema.parse(req[target]));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        throw ApiError.badRequest("Validation failed", errors);
      }
      next(err);
    }
  };
