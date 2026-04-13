import { describe, it, expect } from "vitest";
import { deviceLocations } from "@/modules/deviceLocations";
import type { LoginEvent, ParsedBundle } from "@/model/events";

function bundleFrom(logins: LoginEvent[]): ParsedBundle {
  return {
    account: { type: "personal", owner: {} },
    interactions: [],
    profileChanges: [],
    logins,
    adInterests: [],
    errors: [],
  };
}

const TS_JUNE = Math.floor(Date.UTC(2024, 5, 15) / 1000);
const TS_JULY = Math.floor(Date.UTC(2024, 6, 15) / 1000);
const TS_AUG = Math.floor(Date.UTC(2024, 7, 15) / 1000);

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

describe("deviceLocations — empty input", () => {
  it("returns zeroed result", () => {
    const result = deviceLocations.run({
      bundle: bundleFrom([]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalLoginEvents).toBe(0);
    expect(result.data.distinctDevices).toBe(0);
    expect(result.data.distinctUserAgents).toBe(0);
    expect(result.data.topUserAgent).toBeNull();
    expect(result.data.busiestMonth).toBeNull();
  });
});

describe("deviceLocations — counting", () => {
  it("counts distinct devices", () => {
    const result = deviceLocations.run({
      bundle: bundleFrom([
        { ts: TS_JUNE, device: "iPhone", source: "device" },
        { ts: TS_JUNE, device: "iPhone", source: "device" },
        { ts: TS_JUNE, device: "MacBook", source: "device" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.distinctDevices).toBe(2);
  });

  it("counts total login events including those without device info", () => {
    const result = deviceLocations.run({
      bundle: bundleFrom([
        { ts: TS_JUNE, source: "login" },
        { ts: TS_JUNE, source: "login" },
        { ts: TS_JUNE, source: "logout" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.totalLoginEvents).toBe(3);
  });

  it("collapses user agents to friendly labels", () => {
    const result = deviceLocations.run({
      bundle: bundleFrom([
        { ts: TS_JUNE, userAgent: CHROME_MAC, source: "login" },
        { ts: TS_JUNE, userAgent: CHROME_MAC, source: "login" },
        { ts: TS_JUNE, userAgent: SAFARI_IPHONE, source: "login" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.distinctUserAgents).toBe(2);
    expect(result.data.topUserAgent?.name).toBe("Chrome on Mac");
    expect(result.data.topUserAgent?.count).toBe(2);
  });
});

describe("deviceLocations — busiest month", () => {
  it("identifies the busiest UTC month", () => {
    const result = deviceLocations.run({
      bundle: bundleFrom([
        { ts: TS_JUNE, source: "login" },
        { ts: TS_JULY, source: "login" },
        { ts: TS_JULY, source: "login" },
        { ts: TS_AUG, source: "login" },
      ]),
      scope: { kind: "all" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.busiestMonth).toEqual({ label: "2024-07", count: 2 });
  });
});

describe("deviceLocations — ignores scope", () => {
  it("returns the same data regardless of scope (snapshot view)", () => {
    const logins: LoginEvent[] = [
      { ts: TS_JUNE, device: "iPhone", source: "device" },
      { ts: Math.floor(Date.UTC(2025, 5, 15) / 1000), device: "MacBook", source: "device" },
    ];
    const allTime = deviceLocations.run({
      bundle: bundleFrom(logins),
      scope: { kind: "all" },
    });
    const year2024 = deviceLocations.run({
      bundle: bundleFrom(logins),
      scope: { kind: "year", year: 2024 },
    });
    if (allTime.status !== "ok" || year2024.status !== "ok") {
      throw new Error("expected ok");
    }
    expect(allTime.data.distinctDevices).toBe(2);
    expect(year2024.data.distinctDevices).toBe(2);
  });
});
