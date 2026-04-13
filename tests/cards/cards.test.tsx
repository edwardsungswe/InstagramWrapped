import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { YearSummaryCard } from "@/cards/YearSummaryCard";
import { TopPeopleCard } from "@/cards/TopPeopleCard";
import { PersonalityCard } from "@/cards/PersonalityCard";
import { HeatmapCard } from "@/cards/HeatmapCard";
import { RelationshipInsightsCard } from "@/cards/RelationshipInsightsCard";
import { ContentCategoriesCard } from "@/cards/ContentCategoriesCard";
import { AdPersonalityCard } from "@/cards/AdPersonalityCard";
import { RedFlagsCard } from "@/cards/RedFlagsCard";
import { GreenFlagsCard } from "@/cards/GreenFlagsCard";
import { TimelineEvolutionCard } from "@/cards/TimelineEvolutionCard";
import { DeviceLocationsCard } from "@/cards/DeviceLocationsCard";
import type { Card } from "@/cards/types";
import type { YearSummaryResult } from "@/modules/yearSummary";
import type { TopPeopleResult } from "@/modules/topPeople";
import type { PersonalityTypeResult } from "@/modules/personalityType";
import type { ActivityHeatmapResult } from "@/modules/activityHeatmap";
import type { RelationshipInsightsResult } from "@/modules/relationshipInsights";
import type { ContentCategoriesResult } from "@/modules/contentCategories";
import type { AdPersonalityResult } from "@/modules/adPersonality";
import type { RedFlagsResult } from "@/modules/redFlags";
import type { GreenFlagsResult } from "@/modules/greenFlags";
import type { TimelineEvolutionResult } from "@/modules/timelineEvolution";
import type { DeviceLocationsResult } from "@/modules/deviceLocations";
import type { ModuleRun } from "@/modules";

function fakeRun<T>(id: string, data: T): ModuleRun {
  return {
    module: { id, title: id, requires: [], run: () => ({ status: "ok", data }) },
    result: { status: "ok", data },
  };
}

const YEAR_SUMMARY_DATA: YearSummaryResult = {
  totalInteractions: 12_294,
  mostActiveMonth: { label: "2024-11", count: 582 },
  peakDay: { date: "2024-06-15", count: 87 },
  longestDmStreak: { days: 43, startDay: "2024-04-10", endDay: "2024-05-22" },
};

const TOP_PEOPLE_DATA: TopPeopleResult = {
  people: [
    { handle: "ryan", score: 1432, breakdown: { dmSent: 502, dmReceived: 418, likes: 12, storyLikes: 0 } },
    { handle: "drew", score: 1108, breakdown: { dmSent: 400, dmReceived: 308, likes: 0, storyLikes: 0 } },
    { handle: "alice", score: 800, breakdown: { dmSent: 250, dmReceived: 300, likes: 0, storyLikes: 0 } },
    { handle: "bob", score: 600, breakdown: { dmSent: 200, dmReceived: 200, likes: 0, storyLikes: 0 } },
    { handle: "carol", score: 400, breakdown: { dmSent: 150, dmReceived: 100, likes: 0, storyLikes: 0 } },
  ],
  totalConsidered: 47,
  threshold: 30,
};

const PERSONALITY_DATA: PersonalityTypeResult = {
  axes: { social: 60, lurker: 25, creator: 0, explorer: 15 },
  dominantAxis: "social",
  timeOfDay: "night",
  label: "Late-Night Texter",
  description: "Your inbox lives between midnight and the sunrise.",
};

const HEATMAP_DATA: ActivityHeatmapResult = {
  days: [
    { day: "2024-06-15", count: 87 },
    { day: "2024-06-16", count: 42 },
    { day: "2024-06-17", count: 30 },
  ],
  maxCount: 87,
  totalCount: 159,
  startDay: "2024-06-15",
  endDay: "2024-06-17",
  activeDayCount: 3,
};

const card = (id: string, data: unknown): Card => ({
  id: id as Card["id"],
  run: fakeRun(id, data),
  bg: "bg-gradient-to-br from-pink-600 to-purple-700",
});

describe("YearSummaryCard", () => {
  it("renders without throwing on full data", () => {
    const { container } = render(
      <YearSummaryCard card={card("year-summary", YEAR_SUMMARY_DATA)} />,
    );
    expect(container.textContent).toContain("12,294");
    expect(container.textContent).toContain("November 2024");
    expect(container.textContent).toContain("43 days");
  });

  it("hides streak section when streak is 0", () => {
    const { container } = render(
      <YearSummaryCard
        card={card("year-summary", {
          ...YEAR_SUMMARY_DATA,
          longestDmStreak: { days: 0 },
        })}
      />,
    );
    expect(container.textContent).not.toContain("days in a row");
  });
});

describe("TopPeopleCard", () => {
  it("renders the top 5 handles", () => {
    const { container } = render(
      <TopPeopleCard card={card("top-people", TOP_PEOPLE_DATA)} />,
    );
    expect(container.textContent).toContain("@ryan");
    expect(container.textContent).toContain("@drew");
    expect(container.textContent).toContain("@carol");
  });

  it("emits the runaway-#1 headline when the lead is dominant", () => {
    const { container } = render(
      <TopPeopleCard
        card={card("top-people", {
          ...TOP_PEOPLE_DATA,
          people: [TOP_PEOPLE_DATA.people[0], { ...TOP_PEOPLE_DATA.people[1], score: 100 }],
        })}
      />,
    );
    expect(container.textContent).toContain("inseparable");
  });

  it("emits the group headline when the pack is tight", () => {
    const { container } = render(
      <TopPeopleCard card={card("top-people", TOP_PEOPLE_DATA)} />,
    );
    // ryan=1432, drew=1108 → not 2x → group headline
    expect(container.textContent).toContain("These are your people");
  });
});

describe("PersonalityCard", () => {
  it("renders label, description, and axes", () => {
    const { container } = render(
      <PersonalityCard card={card("personality-type", PERSONALITY_DATA)} />,
    );
    expect(container.textContent).toContain("Late-Night Texter");
    expect(container.textContent).toContain("midnight");
    expect(container.textContent).toContain("Social");
    expect(container.textContent).toContain("Explorer");
  });
});

describe("HeatmapCard", () => {
  it("renders the active day count and peak", () => {
    const { container } = render(
      <HeatmapCard card={card("activity-heatmap", HEATMAP_DATA)} />,
    );
    expect(container.textContent).toContain("3"); // activeDayCount
    expect(container.textContent).toContain("87"); // peak count
    expect(container.textContent).toContain("June 15");
  });
});

const RELATIONSHIP_DATA: RelationshipInsightsResult = {
  oneSided: [{ handle: "alice", sent: 50, received: 5, sentRatio: 50 / 55 }],
  situationships: [{ handle: "sarah", total: 100, nightFraction: 0.85 }],
};

describe("RelationshipInsightsCard", () => {
  it("renders one-sided + situationship lists", () => {
    const { container } = render(
      <RelationshipInsightsCard
        card={card("relationship-insights", RELATIONSHIP_DATA)}
      />,
    );
    expect(container.textContent).toContain("@alice");
    expect(container.textContent).toContain("@sarah");
    expect(container.textContent).toContain("85%");
  });

  it("renders one-sided headline alone when situationships are empty", () => {
    const { container } = render(
      <RelationshipInsightsCard
        card={card("relationship-insights", {
          ...RELATIONSHIP_DATA,
          situationships: [],
        })}
      />,
    );
    expect(container.textContent).toContain("@alice");
    expect(container.textContent).toContain("one-sided");
  });
});

const CATEGORY_DATA: ContentCategoriesResult = {
  categories: [
    { name: "Memes", count: 50, sampleHandles: ["m1", "m2", "m3"] },
    { name: "Fitness", count: 20, sampleHandles: ["f1", "f2"] },
    { name: "Food", count: 15, sampleHandles: ["food1"] },
  ],
  topCategory: "Memes",
  uncategorizedCount: 8,
};

describe("ContentCategoriesCard", () => {
  it("renders the top category in the headline", () => {
    const { container } = render(
      <ContentCategoriesCard card={card("content-categories", CATEGORY_DATA)} />,
    );
    expect(container.textContent).toContain("memes");
  });

  it("shows the uncategorized footnote", () => {
    const { container } = render(
      <ContentCategoriesCard card={card("content-categories", CATEGORY_DATA)} />,
    );
    expect(container.textContent).toContain("8");
  });
});

const AD_DATA: AdPersonalityResult = {
  byGroup: {
    Tech: ["Wi-Fi Usage", "Mobile network or device users"],
    Lifestyle: ["Travel"],
  },
  groupCounts: { Tech: 2, Lifestyle: 1 },
  topGroup: "Tech",
  embarrassing: "Wi-Fi Usage",
  total: 3,
};

describe("AdPersonalityCard", () => {
  it("renders the embarrassing punchline", () => {
    const { container } = render(
      <AdPersonalityCard card={card("ad-personality", AD_DATA)} />,
    );
    expect(container.textContent).toContain("Wi-Fi Usage");
  });
});

const RED_DATA: RedFlagsResult = {
  flags: [
    { id: "like-no-comment", label: "You like, but you never comment.", detail: "100 likes vs 5 comments." },
    { id: "repeat-search", label: "You searched the same person, repeatedly.", detail: "@ex · 5 times." },
  ],
};

describe("RedFlagsCard", () => {
  it("renders all flags with the 🚩 prefix", () => {
    const { container } = render(
      <RedFlagsCard card={card("red-flags", RED_DATA)} />,
    );
    expect(container.textContent).toContain("never comment");
    expect(container.textContent).toContain("repeatedly");
    expect(container.textContent).toContain("🚩");
  });
});

const GREEN_DATA: GreenFlagsResult = {
  flags: [
    { id: "balanced-replies", label: "You have a real two-way friendship.", detail: "@alice · 60 messages." },
  ],
};

describe("GreenFlagsCard", () => {
  it("renders the flag with the 🌱 prefix", () => {
    const { container } = render(
      <GreenFlagsCard card={card("green-flags", GREEN_DATA)} />,
    );
    expect(container.textContent).toContain("two-way friendship");
    expect(container.textContent).toContain("🌱");
  });
});

const TS_2018 = Math.floor(Date.UTC(2018, 5, 15) / 1000);
const TS_2019 = Math.floor(Date.UTC(2019, 5, 15) / 1000);

const TIMELINE_DATA: TimelineEvolutionResult = {
  milestones: [
    { ts: TS_2018, field: "Username", from: "old_handle", to: "mit_yea" },
    { ts: TS_2019, field: "Profile Bio Text", to: "vibes only" },
  ],
  postingByYear: [
    { year: 2018, count: 5 },
    { year: 2019, count: 32 },
    { year: 2020, count: 12 },
  ],
  peakYear: { year: 2019, count: 32 },
  totalPosts: 49,
};

describe("TimelineEvolutionCard", () => {
  it("renders peak year headline + milestones", () => {
    const { container } = render(
      <TimelineEvolutionCard card={card("timeline-evolution", TIMELINE_DATA)} />,
    );
    expect(container.textContent).toContain("2019 was your peak");
    expect(container.textContent).toContain("Became @mit_yea");
    expect(container.textContent).toContain("Updated bio");
  });
});

const DEVICE_DATA: DeviceLocationsResult = {
  totalLoginEvents: 40,
  distinctDevices: 3,
  distinctUserAgents: 2,
  topUserAgent: { name: "Chrome on Mac", count: 25 },
  busiestMonth: { label: "2024-07", count: 12 },
};

describe("DeviceLocationsCard", () => {
  it("renders the device count headline", () => {
    const { container } = render(
      <DeviceLocationsCard card={card("device-locations", DEVICE_DATA)} />,
    );
    expect(container.textContent).toContain("3 devices");
    expect(container.textContent).toContain("Chrome on Mac");
    expect(container.textContent).toContain("July 2024");
  });
});
