import { describe, it, expect } from "vitest";
import { greenFlags } from "@/modules/greenFlags";
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

function tsDay(day: number, hour = 14): number {
  return Math.floor(Date.UTC(2024, 5, day, hour) / 1000);
}

describe("greenFlags — empty input", () => {
  it("returns no flags", () => {
    const bundle = bundleFromInteractions([]);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags).toEqual([]);
  });
});

describe("greenFlags — balanced-replies detector", () => {
  it("fires when a heavy correspondent has 0.4–0.6 send ratio", () => {
    const interactions: Interaction[] = [];
    for (let i = 0; i < 30; i++) {
      interactions.push({ kind: "dm_sent", ts: tsDay(1) + i, withHandle: "alice" });
    }
    for (let i = 0; i < 30; i++) {
      interactions.push({ kind: "dm_received", ts: tsDay(2) + i, withHandle: "alice" });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    const flag = result.data.flags.find((f) => f.id === "balanced-replies");
    expect(flag).toBeDefined();
    expect(flag?.detail).toContain("alice");
  });

  it("does not fire when below the volume threshold", () => {
    const interactions: Interaction[] = [];
    for (let i = 0; i < 10; i++) {
      interactions.push({ kind: "dm_sent", ts: tsDay(1) + i, withHandle: "alice" });
    }
    for (let i = 0; i < 10; i++) {
      interactions.push({ kind: "dm_received", ts: tsDay(2) + i, withHandle: "alice" });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "balanced-replies")).toBeUndefined();
  });

  it("does not fire on one-sided correspondents", () => {
    const interactions: Interaction[] = [];
    for (let i = 0; i < 60; i++) {
      interactions.push({ kind: "dm_sent", ts: tsDay(1) + i, withHandle: "alice" });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "balanced-replies")).toBeUndefined();
  });
});

describe("greenFlags — commenter detector", () => {
  it("fires when comments ≥ 20 and ratio is healthy", () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 50 }, (_, i): Interaction => ({
        kind: "comment",
        ts: tsDay(1) + i,
      })),
      ...Array.from({ length: 100 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsDay(2) + i,
      })),
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "commenter")).toBeDefined();
  });

  it("does not fire when comments < 20", () => {
    const interactions: Interaction[] = Array.from({ length: 10 }, (_, i): Interaction => ({
      kind: "comment",
      ts: tsDay(1) + i,
    }));
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "commenter")).toBeUndefined();
  });

  it("does not fire when likes drown out comments", () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 25 }, (_, i): Interaction => ({
        kind: "comment",
        ts: tsDay(1) + i,
      })),
      ...Array.from({ length: 1000 }, (_, i): Interaction => ({
        kind: "like",
        ts: tsDay(2) + i,
      })),
    ];
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "commenter")).toBeUndefined();
  });
});

describe("greenFlags — consistent-presence detector", () => {
  it("fires when active on > 100 distinct UTC days", () => {
    const interactions: Interaction[] = [];
    for (let day = 1; day <= 120; day++) {
      interactions.push({ kind: "like", ts: tsDay(day) });
    }
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "consistent-presence")).toBeDefined();
  });

  it("does not fire on bursty users", () => {
    const interactions: Interaction[] = Array.from({ length: 1000 }, (_, i): Interaction => ({
      kind: "like",
      ts: tsDay(1) + i,
    }));
    const bundle = bundleFromInteractions(interactions);
    const result = greenFlags.run({ bundle, scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.flags.find((f) => f.id === "consistent-presence")).toBeUndefined();
  });
});
