import { describe, it, expect } from "vitest";
import { contentCategories } from "@/modules/contentCategories";
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

function liked(handle: string, ts = 1700000000): Interaction {
  return { kind: "like", ts, withHandle: handle };
}

describe("contentCategories — empty input", () => {
  it("returns empty categories", () => {
    const bundle = bundleFromInteractions([]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.categories).toEqual([]);
    expect(result.data.topCategory).toBeNull();
    expect(result.data.uncategorizedCount).toBe(0);
  });
});

describe("contentCategories — rule matching", () => {
  it("buckets handles by keyword substring (case-insensitive)", () => {
    const bundle = bundleFromInteractions([
      liked("dailymemepage"),       // Memes
      liked("gymbro2024"),          // Fitness
      liked("recipequeen"),         // Food
      liked("CHEF_johnson"),        // Food (case-insensitive)
    ]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    const byName = Object.fromEntries(
      result.data.categories.map((c) => [c.name, c.count]),
    );
    expect(byName.Memes).toBe(1);
    expect(byName.Fitness).toBe(1);
    expect(byName.Food).toBe(2);
  });

  it("counts each handle once even with multiple likes", () => {
    const bundle = bundleFromInteractions([
      liked("dailymemepage", 1700000000),
      liked("dailymemepage", 1700000001),
      liked("dailymemepage", 1700000002),
    ]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.categories[0].count).toBe(1);
  });

  it("falls into uncategorized when no rule matches", () => {
    const bundle = bundleFromInteractions([
      liked("afterhoursmelody"),
      liked("randomhandle123"),
    ]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.categories).toEqual([]);
    expect(result.data.uncategorizedCount).toBe(2);
  });

  it("identifies the topCategory", () => {
    const bundle = bundleFromInteractions([
      liked("memepage1"),
      liked("memepage2"),
      liked("memepage3"),
      liked("gymrat"),
    ]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.topCategory).toBe("Memes");
  });

  it("attaches sample handles per category (max 3)", () => {
    const bundle = bundleFromInteractions([
      liked("memepage1"),
      liked("memepage2"),
      liked("memepage3"),
      liked("memepage4"),
      liked("memepage5"),
    ]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.categories[0].count).toBe(5);
    expect(result.data.categories[0].sampleHandles).toHaveLength(3);
  });
});

describe("contentCategories — interaction kinds", () => {
  it("considers like + save + story_like, not view/dm/comment", () => {
    const bundle = bundleFromInteractions([
      { kind: "like", ts: 1, withHandle: "memepage1" },
      { kind: "save", ts: 2, withHandle: "memepage2" },
      { kind: "story_like", ts: 3, withHandle: "memepage3" },
      { kind: "view", ts: 4, withHandle: "memepage4" },
      { kind: "comment", ts: 5, withHandle: "memepage5" },
      { kind: "dm_sent", ts: 6, withHandle: "memepage6" },
    ]);
    const result = contentCategories.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.categories[0].count).toBe(3);
  });
});

describe("contentCategories — scope filtering", () => {
  it("respects year scope", () => {
    const bundle = bundleFromInteractions([
      liked("memepage1", 1718452800), // 2024
      liked("memepage2", 1749988800), // 2025
    ]);
    const result = contentCategories.run({
      bundle,
      scope: { kind: "year", year: 2025 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.categories[0].count).toBe(1);
  });
});
