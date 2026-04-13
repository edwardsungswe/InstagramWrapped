import { describe, it, expect } from "vitest";
import { filterByScope, availableYears, parseScope } from "@/modules/scope";
import type { Interaction } from "@/model/events";

// 2024-06-15 12:00:00 UTC = 1718452800
// 2025-01-01 00:00:00 UTC = 1735689600
// 2025-12-31 23:59:59 UTC = 1767225599
// 2026-01-01 00:00:00 UTC = 1767225600
const sample: Interaction[] = [
  { kind: "like", ts: 1718452800 }, // 2024-06-15
  { kind: "view", ts: 1735689600 }, // 2025-01-01 (boundary - in 2025)
  { kind: "save", ts: 1767225599 }, // 2025-12-31 (boundary - in 2025)
  { kind: "follow", ts: 1767225600 }, // 2026-01-01 (boundary - in 2026)
];

describe("filterByScope", () => {
  it("returns the input array as-is for all-time scope", () => {
    const out = filterByScope(sample, { kind: "all" });
    expect(out).toBe(sample); // Reference equality — no copy.
  });

  it("filters to a single year (UTC)", () => {
    const out = filterByScope(sample, { kind: "year", year: 2025 });
    expect(out).toHaveLength(2);
    expect(out.map((i) => i.kind)).toEqual(["view", "save"]);
  });

  it("includes interactions on the year's first second", () => {
    const out = filterByScope(sample, { kind: "year", year: 2025 });
    expect(out.some((i) => i.ts === 1735689600)).toBe(true);
  });

  it("includes interactions on the year's last second", () => {
    const out = filterByScope(sample, { kind: "year", year: 2025 });
    expect(out.some((i) => i.ts === 1767225599)).toBe(true);
  });

  it("excludes the very next second (next year)", () => {
    const out = filterByScope(sample, { kind: "year", year: 2025 });
    expect(out.some((i) => i.ts === 1767225600)).toBe(false);
  });

  it("returns an empty array when nothing matches", () => {
    const out = filterByScope(sample, { kind: "year", year: 1999 });
    expect(out).toEqual([]);
  });

  it("handles an empty input list", () => {
    expect(filterByScope([], { kind: "all" })).toEqual([]);
    expect(filterByScope([], { kind: "year", year: 2025 })).toEqual([]);
  });
});

describe("availableYears", () => {
  it("returns distinct years sorted newest-first", () => {
    expect(availableYears(sample)).toEqual([2026, 2025, 2024]);
  });

  it("returns an empty array for empty input", () => {
    expect(availableYears([])).toEqual([]);
  });

  it("dedupes multiple interactions in the same year", () => {
    const stuffed: Interaction[] = [
      { kind: "like", ts: 1718452800 },
      { kind: "like", ts: 1718452900 },
      { kind: "like", ts: 1718453000 },
    ];
    expect(availableYears(stuffed)).toEqual([2024]);
  });
});

describe("parseScope", () => {
  const available = [2026, 2025, 2024];

  it("returns all-time when the param is null", () => {
    expect(parseScope(null, available)).toEqual({ kind: "all" });
  });

  it("returns all-time when the param is an empty string", () => {
    expect(parseScope("", available)).toEqual({ kind: "all" });
  });

  it("returns the year scope for a valid year present in the bundle", () => {
    expect(parseScope("2025", available)).toEqual({ kind: "year", year: 2025 });
  });

  it("falls back to all-time for a year that isn't in the bundle", () => {
    expect(parseScope("1999", available)).toEqual({ kind: "all" });
  });

  it("falls back to all-time for a non-numeric value", () => {
    expect(parseScope("banana", available)).toEqual({ kind: "all" });
  });

  it("falls back to all-time for floats / weird inputs", () => {
    expect(parseScope("2025.5", available)).toEqual({ kind: "all" });
  });

  it("returns all-time for an empty available list", () => {
    expect(parseScope("2025", [])).toEqual({ kind: "all" });
  });
});
