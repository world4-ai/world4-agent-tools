import { describe, expect, it } from "vitest";
import { ERROR_CODES, ErrorResponseSchema } from "./errors.js";

describe("errors", () => {
  it("lists the closed set of codes", () => {
    expect(ERROR_CODES).toEqual([
      "unauthorized", "forbidden", "not_found", "validation",
      "rate_limited", "conflict", "gone", "upstream_unavailable", "internal",
    ]);
  });
  it("rejects unknown codes", () => {
    expect(ErrorResponseSchema.safeParse({ error: { code: "nope", message: "x" } }).success).toBe(false);
    expect(ErrorResponseSchema.safeParse({ error: { code: "not_found", message: "x" } }).success).toBe(true);
  });
});
