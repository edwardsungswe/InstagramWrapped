import { describe, it, expect } from "vitest";
import { yearSummary } from "@/modules/yearSummary";
import type { Interaction, ParsedBundle } from "@/model/events";

function bundleFromInteractions(interactions: Interaction[]): ParsedBundle {
  return {
    account: { type: "personal", owner: {} },
    interactions,
    profileChanges: [],
    logins: [],
    adInterests: [],
    errors: [],
  };
}

function tsAt(year: number, month: number, day: number, hour = 12): number {
  return Math.floor(Date.UTC(year, month - 1, day, hour) / 1000);
}

describe("yearSummary — empty input", () => {
  it("returns zero totals and null buckets", () => {
    const bundle = bundleFromInteractions([]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalInteractions).toBe(0);
    expect(result.data.mostActiveMonth).toBeNull();
    expect(result.data.peakDay).toBeNull();
    expect(result.data.longestDmStreak.days).toBe(0);
  });
});

describe("yearSummary — totals", () => {
  it("counts every scoped interaction", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: tsAt(2024, 6, 15) },
      { kind: "view", ts: tsAt(2024, 6, 15) },
      { kind: "dm_sent", ts: tsAt(2024, 6, 15), withHandle: "alice" },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalInteractions).toBe(3);
  });
});

describe("yearSummary — most active month", () => {
  it("identifies the busiest month", () => {
    const bundle = bundleFromInteractions([
      // 5 in March
      ...Array.from({ length: 5 }, (_, i) => ({
        kind: "like" as const,
        ts: tsAt(2024, 3, i + 1),
      })),
      // 10 in June
      ...Array.from({ length: 10 }, (_, i) => ({
        kind: "like" as const,
        ts: tsAt(2024, 6, i + 1),
      })),
      // 3 in September
      ...Array.from({ length: 3 }, (_, i) => ({
        kind: "like" as const,
        ts: tsAt(2024, 9, i + 1),
      })),
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.mostActiveMonth).toEqual({ label: "2024-06", count: 10 });
  });
});

describe("yearSummary — peak day", () => {
  it("identifies the single busiest day", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: tsAt(2024, 6, 15, 1) },
      { kind: "like", ts: tsAt(2024, 6, 15, 2) },
      { kind: "like", ts: tsAt(2024, 6, 15, 3) },
      { kind: "like", ts: tsAt(2024, 6, 16, 1) },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.peakDay).toEqual({ date: "2024-06-15", count: 3 });
  });
});

describe("yearSummary — longest DM streak", () => {
  it("returns 0 days when there are no DMs sent", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: tsAt(2024, 6, 15) },
      { kind: "view", ts: tsAt(2024, 6, 15) },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.longestDmStreak.days).toBe(0);
  });

  it("counts a single day as a streak of 1", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAt(2024, 6, 15), withHandle: "alice" },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.longestDmStreak).toEqual({
      days: 1,
      startDay: "2024-06-15",
      endDay: "2024-06-15",
    });
  });

  it("finds the longest consecutive run", () => {
    const bundle = bundleFromInteractions([
      // Streak A: June 1-3 (3 days)
      { kind: "dm_sent", ts: tsAt(2024, 6, 1), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 2), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 3), withHandle: "alice" },
      // Gap
      { kind: "dm_sent", ts: tsAt(2024, 6, 6), withHandle: "alice" },
      // Streak B: June 10-14 (5 days) — should win
      { kind: "dm_sent", ts: tsAt(2024, 6, 10), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 11), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 12), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 13), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 14), withHandle: "alice" },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.longestDmStreak.days).toBe(5);
    expect(result.data.longestDmStreak.startDay).toBe("2024-06-10");
    expect(result.data.longestDmStreak.endDay).toBe("2024-06-14");
  });

  it("dedupes multiple DMs on the same day", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAt(2024, 6, 1, 1), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 1, 5), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 1, 23), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 2, 1), withHandle: "alice" },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.longestDmStreak.days).toBe(2);
  });

  it("handles a streak that crosses a month boundary", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAt(2024, 5, 30), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 5, 31), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 1), withHandle: "alice" },
      { kind: "dm_sent", ts: tsAt(2024, 6, 2), withHandle: "alice" },
    ]);
    const result = yearSummary.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.longestDmStreak.days).toBe(4);
  });
});

describe("yearSummary — scope filtering", () => {
  it("respects year scope", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: tsAt(2024, 6, 15) },
      { kind: "like", ts: tsAt(2025, 6, 15) },
      { kind: "like", ts: tsAt(2025, 6, 16) },
    ]);
    const result = yearSummary.run({
      bundle,
      scope: { kind: "year", year: 2025 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalInteractions).toBe(2);
    expect(result.data.mostActiveMonth?.label).toBe("2025-06");
  });
});
