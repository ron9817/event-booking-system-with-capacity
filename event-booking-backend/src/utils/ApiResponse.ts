import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
    });
  }

  static paginated<T>(res: Response, data: T[], meta: PaginationMeta) {
    return res.status(200).json({
      success: true,
      data,
      meta,
    });
  }

  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors: unknown[] = [],
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors.length > 0 && { errors }),
    });
  }
}
