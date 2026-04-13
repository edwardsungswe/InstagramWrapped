import { describe, it, expect } from "vitest";
import { topPeople } from "@/modules/topPeople";
import type { Interaction, ParsedBundle } from "@/model/events";

function bundleFromInteractions(interactions: Interaction[]): ParsedBundle {
  return {
    account: { type: "personal", owner: { handle: "owner_handle", displayName: "Owner" } },
    interactions,
    profileChanges: [],
    logins: [],
    adInterests: [],
    errors: [],
  };
}

function dms(handle: string, sent: number, received: number, baseTs = 1700000000): Interaction[] {
  const out: Interaction[] = [];
  let ts = baseTs;
  for (let i = 0; i < sent; i++) out.push({ kind: "dm_sent", ts: ts++, withHandle: handle });
  for (let i = 0; i < received; i++) out.push({ kind: "dm_received", ts: ts++, withHandle: handle });
  return out;
}

describe("topPeople — empty input", () => {
  it("returns empty people list", () => {
    const bundle = bundleFromInteractions([]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.people).toEqual([]);
    expect(result.data.totalConsidered).toBe(0);
  });
});

describe("topPeople — threshold filtering", () => {
  it("excludes handles below the score threshold", () => {
    // alice: 5 dm_sent (10) + 5 dm_received (5) = 15 → below 30
    // bob:   20 dm_sent (40) → above 30
    const bundle = bundleFromInteractions([
      ...dms("alice", 5, 5),
      ...dms("bob", 20, 0),
    ]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people.map((p) => p.handle)).toEqual(["bob"]);
    // totalConsidered counts everyone with any interaction, pre-threshold.
    expect(result.data.totalConsidered).toBe(2);
  });

  it("surfaces the threshold value in the result", () => {
    const bundle = bundleFromInteractions([]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.threshold).toBe(30);
  });
});

describe("topPeople — sort and breakdown", () => {
  it("sorts descending by score", () => {
    const bundle = bundleFromInteractions([
      ...dms("alice", 100, 0),
      ...dms("bob", 50, 0),
      ...dms("carol", 75, 0),
    ]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people.map((p) => p.handle)).toEqual(["alice", "carol", "bob"]);
  });

  it("counts dm_sent at weight 2 and dm_received at weight 1", () => {
    const bundle = bundleFromInteractions(dms("alice", 10, 10));
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people[0].score).toBe(10 * 2 + 10 * 1); // 30
    expect(result.data.people[0].breakdown.dmSent).toBe(10);
    expect(result.data.people[0].breakdown.dmReceived).toBe(10);
  });

  it("counts likes and story_likes at weight 0.5", () => {
    // bob: 20 likes (10) + 25 dm_sent (50) = 60
    const bundle = bundleFromInteractions([
      ...dms("bob", 25, 0),
      ...Array.from({ length: 20 }, (_, i) => ({
        kind: "like" as const,
        ts: 1700000100 + i,
        withHandle: "bob",
      })),
    ]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people[0].breakdown.likes).toBe(20);
    expect(result.data.people[0].score).toBe(60);
  });
});

describe("topPeople — exclusions", () => {
  it("ignores interactions without a withHandle", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: 1700000000 }, // no withHandle
      ...dms("alice", 20, 0),
    ]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalConsidered).toBe(1);
  });

  it("excludes self-references when owner handle is known", () => {
    const bundle = bundleFromInteractions([
      ...dms("owner_handle", 50, 50),
      ...dms("alice", 20, 0),
    ]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people.map((p) => p.handle)).toEqual(["alice"]);
  });

  it("ignores interaction kinds with no weight (e.g. view, search)", () => {
    const bundle = bundleFromInteractions([
      { kind: "view", ts: 1700000000, withHandle: "alice" },
      { kind: "search", ts: 1700000001, withHandle: "alice" },
    ]);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people).toEqual([]);
    expect(result.data.totalConsidered).toBe(0);
  });
});

describe("topPeople — scope filtering", () => {
  it("filters by year scope", () => {
    // 2024-06-15 12:00 UTC = 1718452800
    // 2025-06-15 12:00 UTC = 1749988800
    const bundle = bundleFromInteractions([
      ...dms("alice", 20, 0, 1718452800), // 2024
      ...dms("bob", 20, 0, 1749988800),   // 2025
    ]);
    const result = topPeople.run({
      bundle,
      scope: { kind: "year", year: 2025 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people.map((p) => p.handle)).toEqual(["bob"]);
  });
});

describe("topPeople — caps at TOP_N", () => {
  it("returns at most 10 people", () => {
    const interactions: Interaction[] = [];
    // 20 different friends, each with enough score to qualify.
    for (let i = 0; i < 20; i++) {
      interactions.push(...dms(`friend${i}`, 20, 0));
    }
    const bundle = bundleFromInteractions(interactions);
    const result = topPeople.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.people).toHaveLength(10);
    expect(result.data.totalConsidered).toBe(20);
  });
});
