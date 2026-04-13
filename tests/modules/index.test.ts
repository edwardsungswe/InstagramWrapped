import { describe, it, expect } from "vitest";
import { REGISTERED } from "@/modules";

describe("REGISTERED module list", () => {
  it("contains all MVP + Phase 7 + Phase 9 modules", () => {
    const ids = REGISTERED.map((m) => m.id).sort();
    expect(ids).toEqual([
      "activity-heatmap",
      "ad-personality",
      "content-categories",
      "device-locations",
      "green-flags",
      "personality-type",
      "red-flags",
      "relationship-insights",
      "timeline-evolution",
      "top-people",
      "year-summary",
    ]);
  });

  it("every module has a non-empty title", () => {
    for (const m of REGISTERED) {
      expect(typeof m.title).toBe("string");
      expect(m.title.length).toBeGreaterThan(0);
    }
  });

  it("every module returns a valid ModuleResult shape on an empty bundle", () => {
    for (const m of REGISTERED) {
      const result = m.run({
        bundle: {
          account: { type: "personal", owner: {} },
          interactions: [],
          profileChanges: [],
          logins: [],
          adInterests: [],
          errors: [],
        },
        scope: { kind: "all" },
      });
      expect(["ok", "skipped", "error"]).toContain(result.status);
    }
  });

  it("module IDs are unique", () => {
    const ids = REGISTERED.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
