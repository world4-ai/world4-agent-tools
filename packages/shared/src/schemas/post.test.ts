import { describe, expect, it } from "vitest";
import { CreatePostSchema, FeedQuerySchema } from "./post.js";
const MINT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const MINT2 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const UUID = "0192c2b6-1f1e-7000-8000-000000000001";
describe("CreatePostSchema", () => {
  it("accepts a plain note", () => expect(CreatePostSchema.safeParse({ kind: "note", body: "hello" }).success).toBe(true));
  it("trims and rejects whitespace-only body", () => expect(CreatePostSchema.safeParse({ kind: "note", body: "   " }).success).toBe(false));
  it("rejects body over 2000 chars", () => expect(CreatePostSchema.safeParse({ kind: "note", body: "x".repeat(2001) }).success).toBe(false));
  it("rejects more than 5 mints and dedupes duplicates", () => {
    expect(CreatePostSchema.safeParse({ kind: "note", body: "x", mints: [MINT, MINT2, MINT, MINT2, MINT, MINT2] }).success).toBe(false);
    expect(CreatePostSchema.parse({ kind: "note", body: "x", mints: [MINT, MINT] }).mints).toEqual([MINT]);
  });
  it("rejects invalid mint", () => expect(CreatePostSchema.safeParse({ kind: "note", body: "x", mints: ["abc"] }).success).toBe(false));
  it("signal requires exactly one mint and a direction", () => {
    expect(CreatePostSchema.safeParse({ kind: "signal", body: "x", mints: [MINT] }).success).toBe(false);
    expect(CreatePostSchema.safeParse({ kind: "signal", body: "x", direction: "bullish" }).success).toBe(false);
    expect(CreatePostSchema.safeParse({ kind: "signal", body: "x", mints: [MINT, MINT2], direction: "bullish" }).success).toBe(false);
    expect(CreatePostSchema.safeParse({ kind: "signal", body: "x", mints: [MINT], direction: "bullish", confidence: 70 }).success).toBe(true);
  });
  it("confidence and direction are forbidden outside signals", () => {
    expect(CreatePostSchema.safeParse({ kind: "note", body: "x", confidence: 50 }).success).toBe(false);
    expect(CreatePostSchema.safeParse({ kind: "note", body: "x", direction: "bullish" }).success).toBe(false);
  });
  it("confidence must be 1..100 integer", () => {
    expect(CreatePostSchema.safeParse({ kind: "signal", body: "x", mints: [MINT], direction: "bearish", confidence: 0 }).success).toBe(false);
    expect(CreatePostSchema.safeParse({ kind: "signal", body: "x", mints: [MINT], direction: "bearish", confidence: 50.5 }).success).toBe(false);
  });
  it("reply requires parentId; others forbid it", () => {
    expect(CreatePostSchema.safeParse({ kind: "reply", body: "x" }).success).toBe(false);
    expect(CreatePostSchema.safeParse({ kind: "reply", body: "x", parentId: UUID }).success).toBe(true);
    expect(CreatePostSchema.safeParse({ kind: "note", body: "x", parentId: UUID }).success).toBe(false);
  });
});
describe("FeedQuerySchema", () => {
  it("defaults limit to 30 and caps at 100", () => {
    expect(FeedQuerySchema.parse({}).limit).toBe(30);
    expect(FeedQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(FeedQuerySchema.parse({ limit: "100" }).limit).toBe(100);
  });
  it("validates mint and agent filters as pubkeys", () => {
    expect(FeedQuerySchema.safeParse({ mint: "abc" }).success).toBe(false);
    expect(FeedQuerySchema.safeParse({ agent: MINT }).success).toBe(true);
  });
});
