import { describe, it, expect } from "vitest";
import { adPersonality } from "@/modules/adPersonality";
import type { AdInterest, ParsedBundle } from "@/model/events";

function bundleFrom(adInterests: AdInterest[]): ParsedBundle {
  return {
    account: { type: "personal", owner: {} },
    interactions: [],
    profileChanges: [],
    logins: [],
    adInterests,
    errors: [],
  };
}

describe("adPersonality — empty input", () => {
  it("returns empty result", () => {
    const result = adPersonality.run({ bundle: bundleFrom([]), scope: { kind: "all" } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.total).toBe(0);
    expect(result.data.byGroup).toEqual({});
    expect(result.data.topGroup).toBeNull();
    expect(result.data.embarrassing).toBeNull();
  });
});

describe("adPersonality — group bucketing", () => {
  it("groups by keyword match", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([
        { name: "Household income: top 10%" },
        { name: "Mobile network or device users" },
        { name: "Travel enthusiasts" },
        { name: "Coffee lovers" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.groupCounts.Financial).toBe(1);
    expect(result.data.groupCounts.Tech).toBe(1);
    expect(result.data.groupCounts.Lifestyle).toBe(2);
  });

  it("respects the Advertiser group from the parser", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([
        { name: "gorjana", group: "Advertiser" },
        { name: "Travel enthusiasts" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.groupCounts.Advertiser).toBe(1);
    expect(result.data.byGroup.Advertiser).toContain("gorjana");
  });

  it("falls into Other when nothing matches", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([{ name: "Some weird category" }]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.groupCounts.Other).toBe(1);
  });

  it("identifies the topGroup", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([
        { name: "Travel" },
        { name: "Coffee" },
        { name: "Yoga" },
        { name: "Mobile users" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.topGroup).toBe("Lifestyle");
  });

  it("caps samples per group at 8", () => {
    const result = adPersonality.run({
      bundle: bundleFrom(
        Array.from({ length: 20 }, (_, i) => ({ name: `Travel ${i}` })),
      ),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.groupCounts.Lifestyle).toBe(20);
    expect(result.data.byGroup.Lifestyle).toHaveLength(8);
  });
});

describe("adPersonality — embarrassing pick", () => {
  it("matches against the keyword blacklist", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([
        { name: "Travel" },
        { name: "Wi-Fi Usage" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.embarrassing).toBe("Wi-Fi Usage");
  });

  it("returns the first match in source order", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([
        { name: "Household income: top 10%" },
        { name: "Wi-Fi Usage" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.embarrassing).toBe("Household income: top 10%");
  });

  it("returns null when nothing matches the blacklist", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([{ name: "Travel" }, { name: "Coffee" }]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.embarrassing).toBeNull();
  });
});

describe("adPersonality — total count", () => {
  it("counts every input interest regardless of group", () => {
    const result = adPersonality.run({
      bundle: bundleFrom([
        { name: "Travel" },
        { name: "Some weird category" },
        { name: "gorjana", group: "Advertiser" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.total).toBe(3);
  });
});
