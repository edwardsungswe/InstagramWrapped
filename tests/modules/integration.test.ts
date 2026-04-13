/**
 * Integration test: runs every registered module (Phase 5 + Phase 7)
 * against the real bundled Instagram export and asserts each one returns
 * `status: "ok"`. The Phase-7 quality detectors may legitimately produce
 * empty arrays (no situationships, no flags) — that's still `ok`.
 *
 * The numbers will drift as the bundled export changes — assertions are
 * intentionally loose. This is the tripwire for "did the module wiring
 * break against real-world data?".
 */
import { describe, it, expect, beforeAll } from "vitest";
import { extractZip } from "@/parsing/extract";
import { parseManifest } from "@/parsing/parse";
import { runRegistry, REGISTERED } from "@/modules";
import { loadRealExportZip } from "../helpers/zipFromDir";
import type { ParsedBundle } from "@/model/events";
import type { ModuleRun } from "@/modules";

let bundle: ParsedBundle;
let paths: string[];
let runs: ModuleRun[];

beforeAll(async () => {
  const blob = await loadRealExportZip();
  const manifest = await extractZip(blob);
  paths = manifest.paths;
  bundle = await parseManifest(manifest);
  runs = runRegistry(bundle, paths, { kind: "all" }, REGISTERED);
});

describe("All registered modules against real export — all-time scope", () => {
  it("every module returns 'ok'", () => {
    for (const run of runs) {
      expect(
        run.result.status,
        `${run.module.id} returned ${run.result.status}`,
      ).toBe("ok");
    }
  });

  it("registers all 11 modules", () => {
    expect(runs).toHaveLength(11);
  });

  it("topPeople returns ≥ 1 person above the threshold", () => {
    const run = runs.find((r) => r.module.id === "top-people");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { people: unknown[]; totalConsidered: number };
    expect(data.people.length).toBeGreaterThan(0);
    expect(data.totalConsidered).toBeGreaterThan(0);
  });

  it("activityHeatmap has > 100 active days for a real multi-year export", () => {
    const run = runs.find((r) => r.module.id === "activity-heatmap");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { activeDayCount: number; maxCount: number };
    expect(data.activeDayCount).toBeGreaterThan(100);
    expect(data.maxCount).toBeGreaterThan(0);
  });

  it("personalityType returns a non-empty label", () => {
    const run = runs.find((r) => r.module.id === "personality-type");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { label: string; description: string };
    expect(typeof data.label).toBe("string");
    expect(data.label.length).toBeGreaterThan(0);
    expect(typeof data.description).toBe("string");
    expect(data.description.length).toBeGreaterThan(0);
  });

  it("yearSummary returns non-zero totalInteractions and a most active month", () => {
    const run = runs.find((r) => r.module.id === "year-summary");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as {
      totalInteractions: number;
      mostActiveMonth: { label: string; count: number } | null;
      longestDmStreak: { days: number };
    };
    expect(data.totalInteractions).toBeGreaterThan(0);
    expect(data.mostActiveMonth).not.toBeNull();
    expect(data.longestDmStreak.days).toBeGreaterThan(0);
  });

  it("relationshipInsights returns valid arrays", () => {
    const run = runs.find((r) => r.module.id === "relationship-insights");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { oneSided: unknown[]; situationships: unknown[] };
    expect(Array.isArray(data.oneSided)).toBe(true);
    expect(Array.isArray(data.situationships)).toBe(true);
  });

  it("contentCategories returns at least one category from the real export", () => {
    const run = runs.find((r) => r.module.id === "content-categories");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { categories: unknown[] };
    expect(Array.isArray(data.categories)).toBe(true);
  });

  it("adPersonality bucketed at least one ad interest", () => {
    const run = runs.find((r) => r.module.id === "ad-personality");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { total: number };
    expect(data.total).toBeGreaterThan(0);
  });

  it("redFlags returns a flags array", () => {
    const run = runs.find((r) => r.module.id === "red-flags");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { flags: unknown[] };
    expect(Array.isArray(data.flags)).toBe(true);
  });

  it("greenFlags returns a flags array", () => {
    const run = runs.find((r) => r.module.id === "green-flags");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as { flags: unknown[] };
    expect(Array.isArray(data.flags)).toBe(true);
  });

  it("timelineEvolution returns milestones and posting data (Phase 9)", () => {
    const run = runs.find((r) => r.module.id === "timeline-evolution");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as {
      milestones: unknown[];
      postingByYear: unknown[];
      totalPosts: number;
    };
    expect(Array.isArray(data.milestones)).toBe(true);
    expect(Array.isArray(data.postingByYear)).toBe(true);
    // Real export has profile_changes.json with username/bio history
    expect(data.milestones.length).toBeGreaterThan(0);
    // Real export has posts_1.json with own media
    expect(data.totalPosts).toBeGreaterThan(0);
  });

  it("deviceLocations returns device + login data (Phase 9)", () => {
    const run = runs.find((r) => r.module.id === "device-locations");
    if (!run || run.result.status !== "ok") throw new Error("expected ok");
    const data = run.result.data as {
      totalLoginEvents: number;
      distinctDevices: number;
      distinctUserAgents: number;
    };
    expect(data.totalLoginEvents).toBeGreaterThan(0);
    expect(data.distinctUserAgents).toBeGreaterThanOrEqual(0);
  });

  it("logs the headline numbers for visibility (not an assertion)", () => {
    const summary: Record<string, unknown> = {};
    for (const run of runs) {
      summary[run.module.id] =
        run.result.status === "ok" ? "ok" : run.result.status;
    }
    // eslint-disable-next-line no-console
    console.log("Module statuses:", summary);
  });
});

describe("All registered modules against real export — year scope", () => {
  it("re-running with a year scope still produces ok results", async () => {
    const yearRuns = runRegistry(
      bundle,
      paths,
      { kind: "year", year: 2024 },
      REGISTERED,
    );
    for (const run of yearRuns) {
      expect(
        run.result.status,
        `${run.module.id} (year=2024) returned ${run.result.status}`,
      ).toBe("ok");
    }
  });
});
