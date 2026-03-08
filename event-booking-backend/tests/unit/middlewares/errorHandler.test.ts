import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../../../src/utils/ApiError.js";

vi.mock("../../../src/utils/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("../../../src/config.js", () => ({
  config: { NODE_ENV: "development" },
}));

import { errorHandler } from "../../../src/middlewares/errorHandler.js";
import { config } from "../../../src/config.js";

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  return res;
}

describe("errorHandler middleware", () => {
  const req = {} as any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return correct status and message for ApiError", () => {
    const res = mockRes();
    const err = ApiError.notFound("Event not found");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Event not found",
      }),
    );
  });

  it("should include errors array for ApiError with errors", () => {
    const res = mockRes();
    const fieldErrors = [{ field: "name", message: "required" }];
    const err = ApiError.badRequest("Validation failed", fieldErrors);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Validation failed",
        errors: fieldErrors,
      }),
    );
  });

  it("should not include errors key when ApiError has empty errors array", () => {
    const res = mockRes();
    const err = ApiError.internal();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonPayload = res.json.mock.calls[0]![0] as Record<string, unknown>;
    expect(jsonPayload).not.toHaveProperty("errors");
  });

  it("should return 500 with original message for generic Error in non-production", () => {
    const res = mockRes();
    const err = new Error("Something broke");

    (config as any).NODE_ENV = "development";

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Something broke",
      }),
    );
  });

  it("should hide error message in production mode", () => {
    const res = mockRes();
    const err = new Error("secret db details");

    (config as any).NODE_ENV = "production";

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Internal server error",
      }),
    );

    (config as any).NODE_ENV = "development";
  });
});
