export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly statusCode: number,
    message: string,
    readonly errors: unknown[] = [],
  ) {
    super(message);
  }

  static badRequest(message: string, errors: unknown[] = []) {
    return new ApiError(400, message, errors);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}
