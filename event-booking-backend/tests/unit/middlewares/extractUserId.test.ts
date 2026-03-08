import { describe, it, expect, vi } from "vitest";
import { extractUserId } from "../../../src/middlewares/extractUserId.js";
import { ApiError } from "../../../src/utils/ApiError.js";

function mockReq(headers: Record<string, unknown> = {}) {
  return { headers } as any;
}

describe("extractUserId middleware", () => {
  const res = {} as any;

  it("should set req.userId on valid UUID header", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const req = mockReq({ "x-user-id": uuid });
    const next = vi.fn();

    extractUserId(req, res, next);

    expect(req.userId).toBe(uuid);
    expect(next).toHaveBeenCalledOnce();
  });

  it("should throw ApiError 400 when header is missing", () => {
    const req = mockReq({});
    const next = vi.fn();

    expect(() => extractUserId(req, res, next)).toThrow(ApiError);
    try {
      extractUserId(mockReq({}), res, vi.fn());
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(400);
      expect((err as ApiError).message).toBe(
        "Missing or invalid x-user-id header",
      );
    }
  });

  it("should throw ApiError 400 when header is not a valid UUID", () => {
    const req = mockReq({ "x-user-id": "not-a-uuid" });
    const next = vi.fn();

    expect(() => extractUserId(req, res, next)).toThrow(ApiError);
  });

  it("should throw ApiError 400 when header is an empty string", () => {
    const req = mockReq({ "x-user-id": "" });
    const next = vi.fn();

    expect(() => extractUserId(req, res, next)).toThrow(ApiError);
  });

  it("should throw ApiError 400 when header is an array", () => {
    const req = mockReq({
      "x-user-id": ["550e8400-e29b-41d4-a716-446655440000"],
    });
    const next = vi.fn();

    expect(() => extractUserId(req, res, next)).toThrow(ApiError);
  });

  it("should accept uppercase UUID", () => {
    const uuid = "550E8400-E29B-41D4-A716-446655440000";
    const req = mockReq({ "x-user-id": uuid });
    const next = vi.fn();

    extractUserId(req, res, next);
    expect(req.userId).toBe(uuid);
    expect(next).toHaveBeenCalledOnce();
  });
});
