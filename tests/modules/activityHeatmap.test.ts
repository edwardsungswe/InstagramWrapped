import { describe, it, expect } from "vitest";
import { activityHeatmap } from "@/modules/activityHeatmap";
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

describe("activityHeatmap — empty input", () => {
  it("returns an empty result", () => {
    const bundle = bundleFromInteractions([]);
    const result = activityHeatmap.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.days).toEqual([]);
    expect(result.data.maxCount).toBe(0);
    expect(result.data.totalCount).toBe(0);
    expect(result.data.activeDayCount).toBe(0);
    expect(result.data.startDay).toBeUndefined();
    expect(result.data.endDay).toBeUndefined();
  });
});

describe("activityHeatmap — bucketing", () => {
  it("groups by UTC day", () => {
    // 2024-06-15 00:00:00 UTC = 1718409600
    // 2024-06-15 23:59:59 UTC = 1718495999
    // 2024-06-16 00:00:00 UTC = 1718496000
    const bundle = bundleFromInteractions([
      { kind: "like", ts: 1718409600 },
      { kind: "like", ts: 1718495999 },
      { kind: "like", ts: 1718496000 },
    ]);
    const result = activityHeatmap.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.days).toEqual([
      { day: "2024-06-15", count: 2 },
      { day: "2024-06-16", count: 1 },
    ]);
  });

  it("returns days sorted oldest → newest", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: 1718496000 }, // 2024-06-16
      { kind: "like", ts: 1718409600 }, // 2024-06-15
      { kind: "like", ts: 1718582400 }, // 2024-06-17
    ]);
    const result = activityHeatmap.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.days.map((d) => d.day)).toEqual([
      "2024-06-15",
      "2024-06-16",
      "2024-06-17",
    ]);
  });

  it("computes maxCount, totalCount, startDay, endDay correctly", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: 1718409600 }, // 2024-06-15 (1)
      { kind: "like", ts: 1718496000 }, // 2024-06-16 (1)
      { kind: "like", ts: 1718496000 }, // 2024-06-16 (2)
      { kind: "like", ts: 1718496000 }, // 2024-06-16 (3)
      { kind: "like", ts: 1718582400 }, // 2024-06-17 (1)
    ]);
    const result = activityHeatmap.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.maxCount).toBe(3);
    expect(result.data.totalCount).toBe(5);
    expect(result.data.startDay).toBe("2024-06-15");
    expect(result.data.endDay).toBe("2024-06-17");
    expect(result.data.activeDayCount).toBe(3);
  });

  it("counts every interaction kind, not just one", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: 1718409600 },
      { kind: "view", ts: 1718409601 },
      { kind: "dm_sent", ts: 1718409602, withHandle: "alice" },
    ]);
    const result = activityHeatmap.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.days).toEqual([{ day: "2024-06-15", count: 3 }]);
  });
});

describe("activityHeatmap — scope filtering", () => {
  it("respects year scope", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: 1718409600 }, // 2024-06-15
      { kind: "like", ts: 1749988800 }, // 2025-06-15
    ]);
    const result = activityHeatmap.run({
      bundle,
      scope: { kind: "year", year: 2024 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.days).toEqual([{ day: "2024-06-15", count: 1 }]);
  });
});
