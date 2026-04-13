import { describe, it, expect } from "vitest";
import { redFlags } from "@/modules/redFlags";
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

function tsAt(hour: number, offset = 0): number {
  return Math.floor(Date.UTC(2024, 5, 15, hour, 0, offset) / 1000);
}

describe("redFlags — empty input", () => {
  it("returns no flags", () => {
    const bundle = bundleFromInteractions([]);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags).toEqual([]);
  });
});

describe("redFlags — like-no-comment detector", () => {
  it("fires when likes ≥ 50 and ratio likes:comments > 10:1", () => {
    const bundle = bundleFromInteractions([
      ...Array.from({ length: 100 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsAt(14, i),
      })),
      ...Array.from({ length: 5 }, (_, i): Interaction => ({
        kind: "comment",
        ts: tsAt(14, i),
      })),
    ]);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    const flag = result.data.flags.find((f) => f.id === "like-no-comment");
    expect(flag).toBeDefined();
  });

  it("does not fire when likes < 50", () => {
    const bundle = bundleFromInteractions([
      ...Array.from({ length: 30 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsAt(14, i),
      })),
    ]);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "like-no-comment")).toBeUndefined();
  });

  it("does not fire when comments are roughly proportional", () => {
    const bundle = bundleFromInteractions([
      ...Array.from({ length: 100 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsAt(14, i),
      })),
      ...Array.from({ length: 50 }, (_, i): Interaction => ({
        kind: "comment",
        ts: tsAt(14, i),
      })),
    ]);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "like-no-comment")).toBeUndefined();
  });
});

describe("redFlags — repeat-search detector", () => {
  it("fires when the same handle is searched ≥ 3 times", () => {
    const bundle = bundleFromInteractions([
      { kind: "search", ts: tsAt(14, 0), withHandle: "ex" },
      { kind: "search", ts: tsAt(14, 1), withHandle: "ex" },
      { kind: "search", ts: tsAt(14, 2), withHandle: "ex" },
    ]);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    const flag = result.data.flags.find((f) => f.id === "repeat-search");
    expect(flag).toBeDefined();
    expect(flag?.detail).toContain("ex");
  });

  it("does not fire when each search is unique", () => {
    const bundle = bundleFromInteractions([
      { kind: "search", ts: tsAt(14, 0), withHandle: "alice" },
      { kind: "search", ts: tsAt(14, 1), withHandle: "bob" },
      { kind: "search", ts: tsAt(14, 2), withHandle: "carol" },
    ]);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "repeat-search")).toBeUndefined();
  });
});

describe("redFlags — late-night-only detector", () => {
  it("fires when > 60% of sent DMs are between 22:00 and 04:59 UTC", () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 80 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAt(2, i),
        withHandle: "x",
      })),
      ...Array.from({ length: 20 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAt(14, i),
        withHandle: "x",
      })),
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "late-night-only")).toBeDefined();
  });

  it("does not fire when total sent DMs < 100", () => {
    const bundle = bundleFromInteractions(
      Array.from({ length: 50 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAt(2, i),
        withHandle: "x",
      })),
    );
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "late-night-only")).toBeUndefined();
  });

  it("does not fire on balanced day/night users", () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 50 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAt(2, i),
        withHandle: "x",
      })),
      ...Array.from({ length: 60 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAt(14, i),
        withHandle: "x",
      })),
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "late-night-only")).toBeUndefined();
  });
});

describe("redFlags — composition", () => {
  it("returns multiple flags when multiple detectors fire", () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 100 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsAt(14, i),
      })),
      { kind: "search", ts: tsAt(14, 1000), withHandle: "ex" },
      { kind: "search", ts: tsAt(14, 1001), withHandle: "ex" },
      { kind: "search", ts: tsAt(14, 1002), withHandle: "ex" },
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = redFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.length).toBeGreaterThanOrEqual(2);
  });
});
