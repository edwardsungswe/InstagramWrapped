import { describe, it, expect } from "vitest";
import { timelineEvolution } from "@/modules/timelineEvolution";
import type {
  Interaction,
  ParsedBundle,
  ProfileChange,
} from "@/model/events";

function bundleFrom({
  interactions = [],
  profileChanges = [],
}: {
  interactions?: Interaction[];
  profileChanges?: ProfileChange[];
}): ParsedBundle {
  return {
    account: { type: "personal", owner: {} },
    interactions,
    profileChanges,
    logins: [],
    adInterests: [],
    errors: [],
  };
}

const TS_2018 = Math.floor(Date.UTC(2018, 5, 15) / 1000);
const TS_2019 = Math.floor(Date.UTC(2019, 5, 15) / 1000);
const TS_2024 = Math.floor(Date.UTC(2024, 5, 15) / 1000);
const TS_2025 = Math.floor(Date.UTC(2025, 5, 15) / 1000);

describe("timelineEvolution — empty input", () => {
  it("returns empty result", () => {
    const result = timelineEvolution.run({
      bundle: bundleFrom({}),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.milestones).toEqual([]);
    expect(result.data.postingByYear).toEqual([]);
    expect(result.data.peakYear).toBeNull();
    expect(result.data.totalPosts).toBe(0);
  });
});

describe("timelineEvolution — milestone filtering", () => {
  it("keeps only interesting profile change fields", () => {
    const bundle = bundleFrom({
      profileChanges: [
        { ts: TS_2018, field: "Username", from: "old", to: "new" },
        { ts: TS_2019, field: "Phone Number", to: "+1" }, // skipped
        { ts: TS_2019, field: "Profile Bio Text", to: "bio" },
        { ts: TS_2024, field: "Email", to: "x@y" }, // skipped
      ],
    });
    const result = timelineEvolution.run({
      bundle,
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.milestones.map((m) => m.field)).toEqual([
      "Username",
      "Profile Bio Text",
    ]);
  });

  it("sorts milestones chronologically (oldest → newest)", () => {
    const bundle = bundleFrom({
      profileChanges: [
        { ts: TS_2024, field: "Username", to: "z" },
        { ts: TS_2018, field: "Username", to: "a" },
        { ts: TS_2019, field: "Username", to: "b" },
      ],
    });
    const result = timelineEvolution.run({
      bundle,
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.milestones.map((m) => m.to)).toEqual(["a", "b", "z"]);
  });
});

describe("timelineEvolution — posting by year", () => {
  it("groups post interactions by UTC year", () => {
    const bundle = bundleFrom({
      interactions: [
        { kind: "post", ts: TS_2018, meta: { mediaKind: "post" } },
        { kind: "post", ts: TS_2019, meta: { mediaKind: "post" } },
        { kind: "post", ts: TS_2019, meta: { mediaKind: "reel" } },
        { kind: "post", ts: TS_2024, meta: { mediaKind: "story" } },
      ],
    });
    const result = timelineEvolution.run({
      bundle,
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.postingByYear).toEqual([
      { year: 2018, count: 1 },
      { year: 2019, count: 2 },
      { year: 2024, count: 1 },
    ]);
    expect(result.data.peakYear).toEqual({ year: 2019, count: 2 });
    expect(result.data.totalPosts).toBe(4);
  });

  it("ignores non-post interactions", () => {
    const bundle = bundleFrom({
      interactions: [
        { kind: "view", ts: TS_2024 },
        { kind: "like", ts: TS_2024 },
      ],
    });
    const result = timelineEvolution.run({
      bundle,
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.postingByYear).toEqual([]);
    expect(result.data.totalPosts).toBe(0);
  });
});

describe("timelineEvolution — scope filtering", () => {
  it("filters milestones by year scope", () => {
    const bundle = bundleFrom({
      profileChanges: [
        { ts: TS_2024, field: "Username", to: "old_name" },
        { ts: TS_2025, field: "Username", to: "new_name" },
      ],
    });
    const result = timelineEvolution.run({
      bundle,
      scope: { kind: "year", year: 2025 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.milestones).toHaveLength(1);
    expect(result.data.milestones[0].to).toBe("new_name");
  });

  it("filters posting counts by year scope", () => {
    const bundle = bundleFrom({
      interactions: [
        { kind: "post", ts: TS_2024, meta: { mediaKind: "post" } },
        { kind: "post", ts: TS_2025, meta: { mediaKind: "post" } },
        { kind: "post", ts: TS_2025, meta: { mediaKind: "reel" } },
      ],
    });
    const result = timelineEvolution.run({
      bundle,
      scope: { kind: "year", year: 2025 },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalPosts).toBe(2);
    expect(result.data.peakYear).toEqual({ year: 2025, count: 2 });
  });
});
