import { describe, it, expect } from "vitest";
import { buildDeck } from "@/cards/buildDeck";
import type { ModuleRun, InsightModule } from "@/modules";
import type { TopPeopleResult } from "@/modules/topPeople";
import type { ActivityHeatmapResult } from "@/modules/activityHeatmap";
import type { PersonalityTypeResult } from "@/modules/personalityType";
import type { YearSummaryResult } from "@/modules/yearSummary";

function fakeModule(id: string): InsightModule {
  return {
    id,
    title: id,
    requires: [],
    run: () => ({ status: "ok", data: null }),
  };
}

function ok<T>(id: string, data: T): ModuleRun {
  return {
    module: fakeModule(id),
    result: { status: "ok", data },
  };
}

function skipped(id: string, reason = "test"): ModuleRun {
  return {
    module: fakeModule(id),
    result: { status: "skipped", reason },
  };
}

function errored(id: string, error = "boom"): ModuleRun {
  return {
    module: fakeModule(id),
    result: { status: "error", error },
  };
}

const FULL_YEAR_SUMMARY: YearSummaryResult = {
  totalInteractions: 100,
  mostActiveMonth: { label: "2024-06", count: 50 },
  peakDay: { date: "2024-06-15", count: 10 },
  longestDmStreak: { days: 7, startDay: "2024-06-01", endDay: "2024-06-07" },
};

const FULL_TOP_PEOPLE: TopPeopleResult = {
  people: [
    {
      handle: "alice",
      score: 100,
      breakdown: { dmSent: 20, dmReceived: 20, likes: 0, storyLikes: 0 },
    },
  ],
  totalConsidered: 5,
  threshold: 30,
};

const FULL_PERSONALITY: PersonalityTypeResult = {
  axes: { social: 60, lurker: 30, creator: 0, explorer: 10 },
  dominantAxis: "social",
  timeOfDay: "night",
  label: "Late-Night Texter",
  description: "Your inbox lives between midnight and the sunrise.",
};

const FULL_HEATMAP: ActivityHeatmapResult = {
  days: [{ day: "2024-06-15", count: 10 }],
  maxCount: 10,
  totalCount: 10,
  startDay: "2024-06-15",
  endDay: "2024-06-15",
  activeDayCount: 1,
};

describe("buildDeck — ordering", () => {
  it("returns cards in canonical order regardless of input order", () => {
    const runs: ModuleRun[] = [
      ok("activity-heatmap", FULL_HEATMAP),
      ok("personality-type", FULL_PERSONALITY),
      ok("top-people", FULL_TOP_PEOPLE),
      ok("year-summary", FULL_YEAR_SUMMARY),
      ok("relationship-insights", { oneSided: [{ handle: "x", sent: 18, received: 2, sentRatio: 0.9 }], situationships: [] }),
      ok("red-flags", { flags: [{ id: "x", label: "x" }] }),
      ok("green-flags", { flags: [{ id: "y", label: "y" }] }),
      ok("content-categories", { categories: [{ name: "Memes", count: 5, sampleHandles: ["a"] }], topCategory: "Memes", uncategorizedCount: 0 }),
      ok("ad-personality", { byGroup: { Tech: ["Wi-Fi"] }, groupCounts: { Tech: 1 }, topGroup: "Tech", embarrassing: "Wi-Fi", total: 1 }),
      ok("timeline-evolution", { milestones: [{ ts: 1, field: "Username", to: "x" }], postingByYear: [{ year: 2024, count: 5 }], peakYear: { year: 2024, count: 5 }, totalPosts: 5 }),
      ok("device-locations", { totalLoginEvents: 10, distinctDevices: 2, distinctUserAgents: 1, topUserAgent: { name: "Chrome", count: 10 }, busiestMonth: { label: "2024-06", count: 5 } }),
    ];
    const deck = buildDeck(runs);
    expect(deck.map((c) => c.id)).toEqual([
      "year-summary",
      "timeline-evolution",
      "top-people",
      "relationship-insights",
      "personality-type",
      "red-flags",
      "green-flags",
      "content-categories",
      "device-locations",
      "ad-personality",
      "activity-heatmap",
    ]);
  });
});

describe("buildDeck — status filtering", () => {
  it("skips modules whose status is 'skipped'", () => {
    const runs: ModuleRun[] = [
      ok("year-summary", FULL_YEAR_SUMMARY),
      skipped("top-people"),
      ok("personality-type", FULL_PERSONALITY),
      ok("activity-heatmap", FULL_HEATMAP),
    ];
    const deck = buildDeck(runs);
    expect(deck.map((c) => c.id)).toEqual([
      "year-summary",
      "personality-type",
      "activity-heatmap",
    ]);
  });

  it("skips modules whose status is 'error'", () => {
    const runs: ModuleRun[] = [
      ok("year-summary", FULL_YEAR_SUMMARY),
      errored("top-people"),
    ];
    const deck = buildDeck(runs);
    expect(deck.map((c) => c.id)).toEqual(["year-summary"]);
  });

  it("ignores unknown module ids", () => {
    const runs: ModuleRun[] = [
      ok("not-a-real-id", { whatever: true }),
      ok("year-summary", FULL_YEAR_SUMMARY),
    ];
    const deck = buildDeck(runs);
    expect(deck.map((c) => c.id)).toEqual(["year-summary"]);
  });
});

describe("buildDeck — quality suppression", () => {
  it("suppresses year-summary when totalInteractions is 0", () => {
    const runs: ModuleRun[] = [
      ok("year-summary", { ...FULL_YEAR_SUMMARY, totalInteractions: 0 }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses top-people when no one cleared the threshold", () => {
    const runs: ModuleRun[] = [
      ok("top-people", { ...FULL_TOP_PEOPLE, people: [] }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses personality-type when axes are the empty fallback", () => {
    const runs: ModuleRun[] = [
      ok("personality-type", {
        ...FULL_PERSONALITY,
        axes: { social: 25, lurker: 25, creator: 25, explorer: 25 },
      }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("does NOT suppress personality-type when only some axes are 25", () => {
    // Lurker-dominant case where lurker happens to land at 25 — keep it.
    const runs: ModuleRun[] = [
      ok("personality-type", {
        ...FULL_PERSONALITY,
        axes: { social: 50, lurker: 25, creator: 0, explorer: 25 },
      }),
    ];
    expect(buildDeck(runs)).toHaveLength(1);
  });

  it("suppresses activity-heatmap when activeDayCount is 0", () => {
    const runs: ModuleRun[] = [
      ok("activity-heatmap", {
        ...FULL_HEATMAP,
        days: [],
        activeDayCount: 0,
      }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses relationship-insights when both lists are empty", () => {
    const runs: ModuleRun[] = [
      ok("relationship-insights", { oneSided: [], situationships: [] }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("keeps relationship-insights when at least one list has entries", () => {
    const runs: ModuleRun[] = [
      ok("relationship-insights", {
        oneSided: [{ handle: "x", sent: 18, received: 2, sentRatio: 0.9 }],
        situationships: [],
      }),
    ];
    expect(buildDeck(runs)).toHaveLength(1);
  });

  it("suppresses red-flags when there are no flags", () => {
    const runs: ModuleRun[] = [ok("red-flags", { flags: [] })];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses green-flags when there are no flags", () => {
    const runs: ModuleRun[] = [ok("green-flags", { flags: [] })];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses content-categories when no categories were derived", () => {
    const runs: ModuleRun[] = [
      ok("content-categories", {
        categories: [],
        topCategory: null,
        uncategorizedCount: 5,
      }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses ad-personality when total is 0", () => {
    const runs: ModuleRun[] = [
      ok("ad-personality", {
        byGroup: {},
        groupCounts: {},
        topGroup: null,
        embarrassing: null,
        total: 0,
      }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("suppresses timeline-evolution when both milestones and totalPosts are zero", () => {
    const runs: ModuleRun[] = [
      ok("timeline-evolution", {
        milestones: [],
        postingByYear: [],
        peakYear: null,
        totalPosts: 0,
      }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("keeps timeline-evolution when only milestones exist", () => {
    const runs: ModuleRun[] = [
      ok("timeline-evolution", {
        milestones: [{ ts: 1, field: "Username", to: "x" }],
        postingByYear: [],
        peakYear: null,
        totalPosts: 0,
      }),
    ];
    expect(buildDeck(runs)).toHaveLength(1);
  });

  it("keeps timeline-evolution when only posts exist", () => {
    const runs: ModuleRun[] = [
      ok("timeline-evolution", {
        milestones: [],
        postingByYear: [{ year: 2024, count: 5 }],
        peakYear: { year: 2024, count: 5 },
        totalPosts: 5,
      }),
    ];
    expect(buildDeck(runs)).toHaveLength(1);
  });

  it("suppresses device-locations when there are no login events", () => {
    const runs: ModuleRun[] = [
      ok("device-locations", {
        totalLoginEvents: 0,
        distinctDevices: 0,
        distinctUserAgents: 0,
        topUserAgent: null,
        busiestMonth: null,
      }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });
});

describe("buildDeck — empty deck", () => {
  it("returns an empty array when every card is suppressed", () => {
    const runs: ModuleRun[] = [
      ok("year-summary", { ...FULL_YEAR_SUMMARY, totalInteractions: 0 }),
      ok("top-people", { ...FULL_TOP_PEOPLE, people: [] }),
    ];
    expect(buildDeck(runs)).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(buildDeck([])).toEqual([]);
  });
});

describe("buildDeck — backgrounds", () => {
  it("attaches a non-empty Tailwind background to every card", () => {
    const runs: ModuleRun[] = [
      ok("year-summary", FULL_YEAR_SUMMARY),
      ok("top-people", FULL_TOP_PEOPLE),
      ok("personality-type", FULL_PERSONALITY),
      ok("activity-heatmap", FULL_HEATMAP),
    ];
    const deck = buildDeck(runs);
    for (const card of deck) {
      expect(card.bg.length).toBeGreaterThan(0);
    }
  });
});
