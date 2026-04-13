import { describe, it, expect } from "vitest";
import { toUnixSeconds } from "@/parsing/time";

describe("toUnixSeconds", () => {
  it("passes through a normal seconds-precision timestamp", () => {
    expect(toUnixSeconds(1750014910)).toBe(1750014910);
  });

  it("converts a millisecond-precision timestamp by auto-detection", () => {
    // 1729667182194 ms ≈ Oct 23 2024
    expect(toUnixSeconds(1729667182194)).toBe(1729667182);
  });

  it("respects an explicit unit override", () => {
    // Explicit ms even when the value is small.
    expect(toUnixSeconds(1_000_000, { unit: "ms" })).toBe(1000);
    // Explicit seconds even when the value is huge.
    expect(toUnixSeconds(1729667182194, { unit: "s" })).toBe(1729667182194);
  });

  it("returns undefined for zero (Instagram's 'no timestamp' marker)", () => {
    expect(toUnixSeconds(0)).toBeUndefined();
  });

  it("returns undefined for negative values", () => {
    expect(toUnixSeconds(-1)).toBeUndefined();
  });

  it("returns undefined for missing inputs", () => {
    expect(toUnixSeconds(undefined)).toBeUndefined();
    expect(toUnixSeconds(null)).toBeUndefined();
  });

  it("returns undefined for NaN / non-numeric strings", () => {
    expect(toUnixSeconds("nope")).toBeUndefined();
    expect(toUnixSeconds(Number.NaN)).toBeUndefined();
  });

  it("parses numeric strings", () => {
    expect(toUnixSeconds("1750014910")).toBe(1750014910);
  });

  it("floors fractional seconds", () => {
    expect(toUnixSeconds(1750014910.7)).toBe(1750014910);
  });
});
