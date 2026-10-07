import { describe, expect, it } from "vitest";
import { isValidPubkey, PubkeySchema } from "./pubkey.js";
const GOOD = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
describe("pubkey", () => {
  it("accepts an Ethereum address", () => expect(isValidPubkey(GOOD)).toBe(true));
  it("rejects short base58", () => expect(isValidPubkey("abc")).toBe(false));
  it("rejects non-base58 chars", () => expect(isValidPubkey("0OIl" + GOOD.slice(4))).toBe(false));
  it("rejects empty", () => expect(isValidPubkey("")).toBe(false));
  it("schema mirrors the predicate", () => {
    expect(PubkeySchema.safeParse(GOOD).success).toBe(true);
    expect(PubkeySchema.safeParse("abc").success).toBe(false);
  });
  it("canonicalizes lowercase addresses and rejects invalid mixed-case checksums", () => {
    expect(PubkeySchema.parse(GOOD.toLowerCase())).toBe(GOOD);
    expect(isValidPubkey("0xc02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")).toBe(false);
    expect(isValidPubkey("So11111111111111111111111111111111111111112")).toBe(false);
  });
});
