import { describe, it, expect, vi, beforeEach } from "vitest";
import { validate } from "../../../src/middlewares/validate.js";
import {
  eventListQuerySchema,
  eventIdParamSchema,
} from "../../../src/schemas/event.schema.js";
import { ApiError } from "../../../src/utils/ApiError.js";

function mockReq(overrides: Record<string, unknown> = {}) {
  return { body: {}, query: {}, params: {}, headers: {}, ...overrides } as any;
}

describe("validate middleware", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
  });

  it("should call next() on valid input", () => {
    const req = mockReq({ query: { page: "2", limit: "20" } });
    validate(eventListQuerySchema, "query")(req, {} as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("should store parsed values on req.validated", () => {
    const req = mockReq({ query: { page: "3", limit: "25" } });
    validate(eventListQuerySchema, "query")(req, {} as any, next);
    expect(req.validated).toEqual({ page: 3, limit: 25 });
  });

  it("should apply default values from Zod schema", () => {
    const req = mockReq({ query: {} });
    validate(eventListQuerySchema, "query")(req, {} as any, next);
    expect(req.validated).toEqual({ page: 1, limit: 10 });
  });

  it("should throw ApiError with 400 on invalid input", () => {
    const req = mockReq({ params: { id: "not-a-uuid" } });
    expect(() =>
      validate(eventIdParamSchema, "params")(req, {} as any, next),
    ).toThrow(ApiError);

    try {
      validate(eventIdParamSchema, "params")(
        mockReq({ params: { id: "bad" } }),
        {} as any,
        vi.fn(),
      );
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(400);
    }
  });

  it("should include field-level errors in the ApiError", () => {
    const req = mockReq({ params: { id: "not-a-uuid" } });

    try {
      validate(eventIdParamSchema, "params")(req, {} as any, next);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.errors.length).toBeGreaterThan(0);
      expect(apiErr.errors[0]).toEqual(
        expect.objectContaining({ field: "id", message: expect.any(String) }),
      );
    }

    expect(next).not.toHaveBeenCalled();
  });

  it("should merge validated values from multiple validations (params + query)", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const req = mockReq({
      params: { id: uuid },
      query: { page: "2", limit: "15" },
    });

    validate(eventIdParamSchema, "params")(req, {} as any, next);
    validate(eventListQuerySchema, "query")(req, {} as any, next);

    expect(req.validated).toEqual({ id: uuid, page: 2, limit: 15 });
  });

  it("should initialize req.validated when it is undefined", () => {
    const req = mockReq({ query: { page: "1" } });
    delete req.validated;

    validate(eventListQuerySchema, "query")(req, {} as any, next);
    expect(req.validated).toBeDefined();
    expect(req.validated.page).toBe(1);
  });

  it("should forward non-Zod errors to next()", () => {
    const badSchema = {
      parse: () => {
        throw new TypeError("unexpected");
      },
    } as any;

    const req = mockReq({ body: {} });
    validate(badSchema, "body")(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(TypeError));
  });
});
