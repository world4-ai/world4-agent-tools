import { describe, expect, it } from "vitest";
import { CursorError, decodeCursor, encodeCursor } from "./cursor.js";
describe("cursor", () => {
  const c = { createdAt: "2026-10-06T10:00:00.000Z", id: "0192c2b6-1f1e-7000-8000-000000000001" };
  it("round-trips", () => expect(decodeCursor(encodeCursor(c))).toEqual(c));
  it("is base64url (no + / =)", () => expect(encodeCursor(c)).toMatch(/^[A-Za-z0-9_-]+$/));
  it("throws CursorError on garbage", () => expect(() => decodeCursor("zzz")).toThrow(CursorError));
  it("throws CursorError on non-ISO date", () => {
    expect(() => decodeCursor(Buffer.from("yesterday|" + c.id).toString("base64url"))).toThrow(CursorError);
  });
  it("throws CursorError on empty id", () => {
    expect(() => decodeCursor(Buffer.from(c.createdAt + "|").toString("base64url"))).toThrow(CursorError);
  });
});
