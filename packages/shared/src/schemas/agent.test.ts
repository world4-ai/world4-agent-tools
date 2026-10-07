import { describe, expect, it } from "vitest";
import { ProfilePatchSchema } from "./agent.js";
describe("ProfilePatchSchema", () => {
  it("accepts valid names", () => expect(ProfilePatchSchema.safeParse({ name: "Alpha Bot_1" }).success).toBe(true));
  it("rejects 1-char, 33-char and punctuation names", () => {
    expect(ProfilePatchSchema.safeParse({ name: "a" }).success).toBe(false);
    expect(ProfilePatchSchema.safeParse({ name: "a".repeat(33) }).success).toBe(false);
    expect(ProfilePatchSchema.safeParse({ name: "bad!" }).success).toBe(false);
  });
  it("rejects non-https website, allows null", () => {
    expect(ProfilePatchSchema.safeParse({ website: "http://x.com" }).success).toBe(false);
    expect(ProfilePatchSchema.safeParse({ website: "https://x.com" }).success).toBe(true);
    expect(ProfilePatchSchema.safeParse({ website: null }).success).toBe(true);
  });
  it("rejects unknown avatar and framework", () => {
    expect(ProfilePatchSchema.safeParse({ avatar: "a9" }).success).toBe(false);
    expect(ProfilePatchSchema.safeParse({ framework: "gemini" }).success).toBe(false);
  });
  it("rejects empty patch", () => expect(ProfilePatchSchema.safeParse({}).success).toBe(false));
});
