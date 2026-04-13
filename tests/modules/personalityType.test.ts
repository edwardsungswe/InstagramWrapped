import { describe, it, expect } from "vitest";
import { personalityType } from "@/modules/personalityType";
import { LABELS } from "@/modules/personalityLabels";
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

// Helper: timestamp at a given UTC hour on 2024-06-15.
function tsAtHour(hour: number, minute = 0): number {
  return Math.floor(Date.UTC(2024, 5, 15, hour, minute) / 1000);
}

describe("personalityType — empty input", () => {
  it("returns equal axes and a benign default label", () => {
    const bundle = bundleFromInteractions([]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.axes).toEqual({
      social: 25,
      lurker: 25,
      creator: 25,
      explorer: 25,
    });
    expect(typeof result.data.label).toBe("string");
    expect(result.data.label.length).toBeGreaterThan(0);
  });
});

describe("personalityType — axis math", () => {
  it("axes sum to 100 (within float tolerance)", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAtHour(14), withHandle: "alice" },
      { kind: "dm_received", ts: tsAtHour(14), withHandle: "alice" },
      { kind: "view", ts: tsAtHour(14), withHandle: "bob" },
      { kind: "like", ts: tsAtHour(14), withHandle: "carol" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    const sum =
      result.data.axes.social +
      result.data.axes.lurker +
      result.data.axes.creator +
      result.data.axes.explorer;
    expect(sum).toBeCloseTo(100, 5);
  });

  it("creator axis is 0 when there are no post interactions", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAtHour(14), withHandle: "alice" },
      { kind: "view", ts: tsAtHour(14), withHandle: "bob" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.axes.creator).toBe(0);
  });

  it("creator axis counts post interactions (Phase 9)", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAtHour(14), withHandle: "alice" },
      { kind: "post", ts: tsAtHour(14), meta: { mediaKind: "post" } },
      { kind: "post", ts: tsAtHour(14), meta: { mediaKind: "reel" } },
      { kind: "post", ts: tsAtHour(14), meta: { mediaKind: "story" } },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.axes.creator).toBeGreaterThan(0);
    // Three posts vs one DM → creator should dominate.
    expect(result.data.dominantAxis).toBe("creator");
  });

  it("axes still sum to 100 with post interactions in the mix", () => {
    const bundle = bundleFromInteractions([
      { kind: "dm_sent", ts: tsAtHour(14), withHandle: "alice" },
      { kind: "view", ts: tsAtHour(14), withHandle: "bob" },
      { kind: "like", ts: tsAtHour(14), withHandle: "carol" },
      { kind: "post", ts: tsAtHour(14), meta: { mediaKind: "post" } },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    const sum =
      result.data.axes.social +
      result.data.axes.lurker +
      result.data.axes.creator +
      result.data.axes.explorer;
    expect(sum).toBeCloseTo(100, 5);
  });

  it("identifies a social-dominant user", () => {
    // 50 DMs vs 1 view → dominantAxis = social
    const interactions: Interaction[] = [];
    for (let i = 0; i < 50; i++) {
      interactions.push({
        kind: "dm_sent",
        ts: tsAtHour(14, i),
        withHandle: `friend${i}`,
      });
    }
    interactions.push({ kind: "view", ts: tsAtHour(14), withHandle: "x" });
    const bundle = bundleFromInteractions(interactions);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.dominantAxis).toBe("social");
  });

  it("identifies a lurker-dominant user", () => {
    const interactions: Interaction[] = [];
    // 100 views, all of the same account → low explorer, high lurker
    for (let i = 0; i < 100; i++) {
      interactions.push({
        kind: "view",
        ts: tsAtHour(14, i % 60),
        withHandle: "celebrity",
      });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.dominantAxis).toBe("lurker");
  });
});

describe("personalityType — time of day buckets", () => {
  it("classifies 02:00 UTC as night", () => {
    const bundle = bundleFromInteractions([
      { kind: "view", ts: tsAtHour(2), withHandle: "x" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.timeOfDay).toBe("night");
  });

  it("classifies 23:00 UTC as night", () => {
    const bundle = bundleFromInteractions([
      { kind: "view", ts: tsAtHour(23), withHandle: "x" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.timeOfDay).toBe("night");
  });

  it("classifies 09:00 UTC as morning", () => {
    const bundle = bundleFromInteractions([
      { kind: "view", ts: tsAtHour(9), withHandle: "x" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.timeOfDay).toBe("morning");
  });

  it("classifies 14:00 UTC as afternoon", () => {
    const bundle = bundleFromInteractions([
      { kind: "view", ts: tsAtHour(14), withHandle: "x" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.timeOfDay).toBe("afternoon");
  });

  it("classifies 19:00 UTC as evening", () => {
    const bundle = bundleFromInteractions([
      { kind: "view", ts: tsAtHour(19), withHandle: "x" },
    ]);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.timeOfDay).toBe("evening");
  });

  it("picks the modal bucket when multiple are present", () => {
    const interactions: Interaction[] = [];
    // 10 night, 3 afternoon → night wins
    for (let i = 0; i < 10; i++) {
      interactions.push({ kind: "view", ts: tsAtHour(2, i), withHandle: "x" });
    }
    for (let i = 0; i < 3; i++) {
      interactions.push({ kind: "view", ts: tsAtHour(14, i), withHandle: "x" });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.timeOfDay).toBe("night");
  });
});

describe("personalityType — label dispatch", () => {
  it("returns the label from the LABELS table for the (dominant, timeOfDay) cell", () => {
    // Many DMs at night → social/night
    const interactions: Interaction[] = [];
    for (let i = 0; i < 50; i++) {
      interactions.push({
        kind: "dm_sent",
        ts: tsAtHour(2, i),
        withHandle: `friend${i}`,
      });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = personalityType.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.label).toBe(LABELS.social.night.label);
    expect(result.data.description).toBe(LABELS.social.night.description);
  });
});
