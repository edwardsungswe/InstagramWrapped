import { describe, it, expect } from "vitest";
import { fixMojibake, fixMojibakeDeep } from "@/parsing/mojibake";

describe("fixMojibake", () => {
  it("decodes a heart emoji from doubly-encoded form", () => {
    // ❤ (U+2764) → UTF-8 E2 9D A4 → JSON-escaped as \u00e2\u009d\u00a4
    expect(fixMojibake("\u00e2\u009d\u00a4")).toBe("\u2764");
  });

  it("decodes a multi-character mojibaked string", () => {
    // "café" (U+0063 U+0061 U+0066 U+00e9) → UTF-8 63 61 66 C3 A9
    // → JSON-escaped as "caf\u00c3\u00a9"
    expect(fixMojibake("caf\u00c3\u00a9")).toBe("café");
  });

  it("leaves clean ASCII strings unchanged", () => {
    expect(fixMojibake("hello world")).toBe("hello world");
  });

  it("leaves an empty string unchanged", () => {
    expect(fixMojibake("")).toBe("");
  });

  it("leaves already-correct UTF-16 strings unchanged", () => {
    // Real ❤ char (single code unit U+2764) — must NOT be re-decoded.
    expect(fixMojibake("\u2764")).toBe("\u2764");
  });

  it("leaves emoji that is outside the BMP unchanged", () => {
    // 🎉 = U+1F389 → surrogate pair in JS strings.
    expect(fixMojibake("\uD83C\uDF89")).toBe("\uD83C\uDF89");
  });

  it("returns the input unchanged when re-decoding produces replacement chars", () => {
    // Random Latin-1 bytes that are not valid UTF-8 should round-trip as-is.
    expect(fixMojibake("\u00ff\u00fe")).toBe("\u00ff\u00fe");
  });
});

describe("fixMojibakeDeep", () => {
  it("walks nested objects and arrays", () => {
    const input = {
      name: "caf\u00c3\u00a9",
      tags: ["\u00e2\u009d\u00a4", "ok"],
      nested: { value: "caf\u00c3\u00a9" },
      n: 42,
      flag: true,
      missing: null,
    };
    const out = fixMojibakeDeep(input);
    expect(out).toEqual({
      name: "café",
      tags: ["\u2764", "ok"],
      nested: { value: "café" },
      n: 42,
      flag: true,
      missing: null,
    });
  });

  it("does not mutate the input", () => {
    const input = { a: "caf\u00c3\u00a9" };
    fixMojibakeDeep(input);
    expect(input.a).toBe("caf\u00c3\u00a9");
  });
});
