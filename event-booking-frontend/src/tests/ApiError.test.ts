import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/ApiError";

describe("ApiError", () => {
  it("stores message and status", () => {
    const err = new ApiError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.name).toBe("ApiError");
  });

  it("isNotFound returns true for 404", () => {
    expect(new ApiError("x", 404).isNotFound).toBe(true);
    expect(new ApiError("x", 400).isNotFound).toBe(false);
  });

  it("isConflict returns true for 409", () => {
    expect(new ApiError("x", 409).isConflict).toBe(true);
    expect(new ApiError("x", 400).isConflict).toBe(false);
  });

  it("isRateLimited returns true for 429", () => {
    expect(new ApiError("x", 429).isRateLimited).toBe(true);
    expect(new ApiError("x", 400).isRateLimited).toBe(false);
  });

  it("stores errors array", () => {
    const errors = [{ field: "page", message: "too low" }];
    const err = new ApiError("Validation failed", 400, errors);
    expect(err.errors).toEqual(errors);
  });

  it("defaults errors to empty array", () => {
    const err = new ApiError("x", 500);
    expect(err.errors).toEqual([]);
  });
});
