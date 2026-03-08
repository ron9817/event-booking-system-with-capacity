import { describe, it, expect } from "vitest";
import { ApiError } from "../../../src/utils/ApiError.js";

describe("ApiError", () => {
  it("should be an instance of Error", () => {
    const err = new ApiError(400, "bad");
    expect(err).toBeInstanceOf(Error);
  });

  it("should be an instance of ApiError", () => {
    const err = new ApiError(500, "oops");
    expect(err).toBeInstanceOf(ApiError);
  });

  it("should set statusCode and message correctly", () => {
    const err = new ApiError(422, "Unprocessable");
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Unprocessable");
  });

  it("should default errors array to empty", () => {
    const err = new ApiError(400, "bad");
    expect(err.errors).toEqual([]);
  });

  it("should store a custom errors array", () => {
    const details = [{ field: "email", message: "required" }];
    const err = new ApiError(400, "Validation", details);
    expect(err.errors).toEqual(details);
  });

  it("should have name set to 'ApiError'", () => {
    const err = new ApiError(400, "bad");
    expect(err.name).toBe("ApiError");
  });

  describe("factory methods", () => {
    it("badRequest creates a 400 error", () => {
      const err = ApiError.badRequest("Invalid input");
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Invalid input");
      expect(err.errors).toEqual([]);
    });

    it("badRequest forwards errors array", () => {
      const errors = [{ field: "name", message: "required" }];
      const err = ApiError.badRequest("Validation failed", errors);
      expect(err.errors).toEqual(errors);
    });

    it("notFound creates a 404 error with default message", () => {
      const err = ApiError.notFound();
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Resource not found");
    });

    it("notFound accepts a custom message", () => {
      const err = ApiError.notFound("Event not found");
      expect(err.message).toBe("Event not found");
    });

    it("conflict creates a 409 error", () => {
      const err = ApiError.conflict("Already exists");
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe("Already exists");
    });

    it("internal creates a 500 error with default message", () => {
      const err = ApiError.internal();
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe("Internal server error");
    });

    it("internal accepts a custom message", () => {
      const err = ApiError.internal("DB down");
      expect(err.message).toBe("DB down");
    });
  });
});
