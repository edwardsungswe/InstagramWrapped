import type { ModuleRun } from "@/modules";
import type { TopPeopleResult } from "@/modules/topPeople";
import type { ActivityHeatmapResult } from "@/modules/activityHeatmap";
import type { PersonalityTypeResult } from "@/modules/personalityType";
import type { YearSummaryResult } from "@/modules/yearSummary";
import type { RelationshipInsightsResult } from "@/modules/relationshipInsights";
import type { ContentCategoriesResult } from "@/modules/contentCategories";
import type { AdPersonalityResult } from "@/modules/adPersonality";
import type { RedFlagsResult } from "@/modules/redFlags";
import type { GreenFlagsResult } from "@/modules/greenFlags";
import type { TimelineEvolutionResult } from "@/modules/timelineEvolution";
import type { DeviceLocationsResult } from "@/modules/deviceLocations";
import type { Card, CardId } from "./types";

/**
 * Display order for the deck. Strongest-first, with vibe-alternation:
 * headline → social hook → relationship zoom-in → identity reveal → red →
 * green → lifestyle → creepy ad closer → visual outro.
 *
 * Easy to reorder if user-tested feedback suggests otherwise.
 */
const ORDER: readonly CardId[] = [
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
];

/**
 * Tailwind background gradients per card. Each card has a distinct color
 * identity so the deck feels like a curated set, not a uniform list.
 */
const BACKGROUNDS: Record<CardId, string> = {
  "year-summary": "bg-gradient-to-br from-pink-600 to-purple-700",
  "timeline-evolution": "bg-gradient-to-br from-orange-500 to-pink-600",
  "top-people": "bg-gradient-to-br from-amber-500 to-rose-600",
  "relationship-insights": "bg-gradient-to-br from-fuchsia-600 to-indigo-700",
  "personality-type": "bg-gradient-to-br from-cyan-600 to-blue-800",
  "red-flags": "bg-gradient-to-br from-red-600 to-orange-700",
  "green-flags": "bg-gradient-to-br from-lime-600 to-emerald-700",
  "content-categories": "bg-gradient-to-br from-violet-600 to-fuchsia-700",
  "device-locations": "bg-gradient-to-br from-zinc-700 to-slate-900",
  "ad-personality": "bg-gradient-to-br from-slate-800 to-neutral-900",
  "activity-heatmap": "bg-gradient-to-br from-emerald-600 to-teal-800",
};

/**
 * Per-card "is this worth showing?" predicates. A card is suppressed if its
 * module returned `ok` but the data isn't substantive enough to be
 * interesting (zero people, no active days, default-fallback personality,
 * etc.). Returns `true` to KEEP the card.
 */
const KEEP: Record<CardId, (data: unknown) => boolean> = {
  "year-summary": (d) => (d as YearSummaryResult).totalInteractions > 0,
  "timeline-evolution": (d) => {
    const r = d as TimelineEvolutionResult;
    return r.milestones.length > 0 || r.totalPosts > 0;
  },
  "top-people": (d) => (d as TopPeopleResult).people.length > 0,
  "relationship-insights": (d) => {
    const r = d as RelationshipInsightsResult;
    return r.oneSided.length > 0 || r.situationships.length > 0;
  },
  "personality-type": (d) => !isPersonalityFallback(d as PersonalityTypeResult),
  "red-flags": (d) => (d as RedFlagsResult).flags.length > 0,
  "green-flags": (d) => (d as GreenFlagsResult).flags.length > 0,
  "content-categories": (d) => (d as ContentCategoriesResult).categories.length > 0,
  "device-locations": (d) => (d as DeviceLocationsResult).totalLoginEvents > 0,
  "ad-personality": (d) => (d as AdPersonalityResult).total > 0,
  "activity-heatmap": (d) => (d as ActivityHeatmapResult).activeDayCount > 0,
};

/**
 * Builds the ordered, suppressed list of cards from the registry's run list.
 *
 * - Walks `ORDER` so the result respects the canonical display order even if
 *   the input is in a different order.
 * - Skips runs whose status isn't `ok`.
 * - Skips runs whose data fails the per-card `KEEP` predicate.
 * - Returns an empty array if every card was suppressed (the deck UI then
 *   shows a "Not enough data" fallback).
 */
export function buildDeck(runs: ModuleRun[]): Card[] {
  const byId = new Map<string, ModuleRun>();
  for (const run of runs) byId.set(run.module.id, run);

  const out: Card[] = [];
  for (const id of ORDER) {
    const run = byId.get(id);
    if (!run) continue;
    if (run.result.status !== "ok") continue;
    if (!KEEP[id](run.result.data)) continue;
    out.push({ id, run, bg: BACKGROUNDS[id] });
  }
  return out;
}

/**
 * Detects the empty-input fallback the personality module returns when there
 * are no interactions in scope: every axis at 25%. We don't want to ship a
 * card that says "you're balanced!" when the truth is "we don't know."
 */
function isPersonalityFallback(d: PersonalityTypeResult): boolean {
  return (
    d.axes.social === 25 &&
    d.axes.lurker === 25 &&
    d.axes.creator === 25 &&
    d.axes.explorer === 25
  );
}
