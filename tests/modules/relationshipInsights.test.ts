import { describe, it, expect } from "vitest";
import { relationshipInsights } from "@/modules/relationshipInsights";
import type { Interaction, ParsedBundle } from "@/model/events";

function bundleFromInteractions(interactions: Interaction[]): ParsedBundle {
  return {
    account: { type: "personal", owner: { handle: "owner" } },
    interactions,
    profileChanges: [],
    logins: [],
    adInterests: [],
    errors: [],
  };
}

// 14:00 UTC on 2024-06-15 — afternoon, NOT night
function tsAfternoon(offset = 0): number {
  return Math.floor(Date.UTC(2024, 5, 15, 14, 0, offset) / 1000);
}
// 02:00 UTC — night
function tsNight(offset = 0): number {
  return Math.floor(Date.UTC(2024, 5, 15, 2, 0, offset) / 1000);
}

function dms(
  handle: string,
  sent: number,
  received: number,
  tsFn: (i: number) => number = tsAfternoon,
): Interaction[] {
  const out: Interaction[] = [];
  let i = 0;
  for (let s = 0; s < sent; s++) out.push({ kind: "dm_sent", ts: tsFn(i++), withHandle: handle });
  for (let r = 0; r < received; r++) out.push({ kind: "dm_received", ts: tsFn(i++), withHandle: handle });
  return out;
}

describe("relationshipInsights — empty input", () => {
  it("returns empty arrays", () => {
    const bundle = bundleFromInteractions([]);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided).toEqual([]);
    expect(result.data.situationships).toEqual([]);
  });
});

describe("relationshipInsights — one-sided detection", () => {
  it("flags handles with sentRatio > 0.7 and total ≥ 20", () => {
    // alice: 18 sent, 2 received → ratio 0.9, total 20 → flagged
    const bundle = bundleFromInteractions(dms("alice", 18, 2));
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided).toHaveLength(1);
    expect(result.data.oneSided[0].handle).toBe("alice");
    expect(result.data.oneSided[0].sent).toBe(18);
    expect(result.data.oneSided[0].received).toBe(2);
  });

  it("does not flag handles below the volume threshold", () => {
    // bob: 9 sent, 1 received → ratio 0.9 BUT total only 10 → ignored
    const bundle = bundleFromInteractions(dms("bob", 9, 1));
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided).toEqual([]);
  });

  it("does not flag balanced friendships", () => {
    // carol: 50 sent, 50 received → ratio 0.5 → ignored
    const bundle = bundleFromInteractions(dms("carol", 50, 50));
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided).toEqual([]);
  });

  it("sorts by sentRatio descending and caps at 3", () => {
    const bundle = bundleFromInteractions([
      ...dms("a", 18, 2), // 0.90
      ...dms("b", 19, 1), // 0.95
      ...dms("c", 17, 3), // 0.85
      ...dms("d", 16, 4), // 0.80
    ]);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided.map((r) => r.handle)).toEqual(["b", "a", "c"]);
  });
});

describe("relationshipInsights — situationship detection", () => {
  it("flags handles with > 70% of DMs at night and total ≥ 30", () => {
    // 25 night DMs, 5 day DMs → 25/30 = 0.833 → flagged
    const interactions: Interaction[] = [
      ...Array.from({ length: 25 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsNight(i),
        withHandle: "sarah",
      })),
      ...Array.from({ length: 5 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAfternoon(i),
        withHandle: "sarah",
      })),
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.situationships).toHaveLength(1);
    expect(result.data.situationships[0].handle).toBe("sarah");
    expect(result.data.situationships[0].total).toBe(30);
  });

  it("does not flag below the volume threshold", () => {
    const interactions: Interaction[] = Array.from({ length: 20 }, (_, i): Interaction => ({
      kind: "dm_sent",
      ts: tsNight(i),
      withHandle: "low",
    }));
    const bundle = bundleFromInteractions(interactions);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.situationships).toEqual([]);
  });

  it("does not flag balanced day/night users", () => {
    // 15 night, 15 day → 0.5 fraction → ignored
    const interactions: Interaction[] = [
      ...Array.from({ length: 15 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsNight(i),
        withHandle: "balanced",
      })),
      ...Array.from({ length: 15 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAfternoon(i),
        withHandle: "balanced",
      })),
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.situationships).toEqual([]);
  });
});

describe("relationshipInsights — exclusions", () => {
  it("ignores interactions without a withHandle", () => {
    const bundle = bundleFromInteractions([
      ...Array.from({ length: 30 }, (_, i): Interaction => ({
        kind: "dm_sent",
        ts: tsAfternoon(i),
      })),
    ]);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided).toEqual([]);
  });

  it("ignores self-references when owner handle is known", () => {
    const bundle = bundleFromInteractions([
      ...dms("owner", 50, 0),
      ...dms("alice", 18, 2),
    ]);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided.map((r) => r.handle)).toEqual(["alice"]);
  });

  it("ignores non-DM interaction kinds", () => {
    const bundle = bundleFromInteractions([
      ...Array.from({ length: 30 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsAfternoon(i),
        withHandle: "alice",
      })),
    ]);
    const result = relationshipInsights.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided).toEqual([]);
  });
});

describe("relationshipInsights — scope filtering", () => {
  it("respects year scope", () => {
    const bundle = bundleFromInteractions([
      ...dms("alice", 18, 2, (i) => 1718452800 + i), // 2024
      ...dms("bob", 18, 2, (i) => 1749988800 + i),   // 2025
    ]);
    const result = relationshipInsights.run({
      bundle,
      scope: { kind: "year", year: 2025 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.oneSided.map((r) => r.handle)).toEqual(["bob"]);
  });
});
