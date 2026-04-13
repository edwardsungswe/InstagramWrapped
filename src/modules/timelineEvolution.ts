import { filterByScope } from "./scope";
import type { Interaction, ProfileChange } from "@/model/events";
import type { InsightModule, TimeScope } from "./types";

/**
 * "Your Evolution" — combines two halves of historical data:
 *
 * - **Profile change milestones**: from `bundle.profileChanges`, filtered to
 *   the small set of fields that actually represent identity shifts
 *   (username changes, bio updates, profile photos, display name). Phone /
 *   email / privacy changes are excluded — they're admin churn, not story.
 *
 * - **Posting frequency by year**: groups `post` interactions (Phase 9
 *   own-media projection) by UTC year and surfaces the peak.
 *
 * Both halves honor the active `scope`. For the year scope, milestones are
 * filtered by their `Change Date` and posting counts only that year. For
 * all-time, everything is included.
 *
 * Skipped if both `milestones` and `totalPosts` are zero — handled by the
 * card's `KEEP` predicate, not the module itself (the module always returns
 * `ok` with possibly-empty arrays so the deck builder can decide).
 */

const INTERESTING_FIELDS = new Set([
  "Username",
  "Profile Bio Text",
  "Profile Photo",
  "Name",
  "Bio",
]);

export type Milestone = {
  ts: number;
  field: string;
  from?: string;
  to?: string;
};

export type TimelineEvolutionResult = {
  milestones: Milestone[];
  postingByYear: Array<{ year: number; count: number }>;
  peakYear: { year: number; count: number } | null;
  totalPosts: number;
};

export const timelineEvolution: InsightModule<TimelineEvolutionResult> = {
  id: "timeline-evolution",
  title: "Your Evolution",
  requires: ["personal_information/personal_information/profile_changes.json"],
  run: ({ bundle, scope }) => {
    const milestones = pickMilestones(bundle.profileChanges, scope);
    const scopedInteractions = filterByScope(bundle.interactions, scope);
    const postingByYear = groupPostsByYear(scopedInteractions);
    const peakYear = pickPeakYear(postingByYear);
    const totalPosts = postingByYear.reduce((acc, y) => acc + y.count, 0);

    return {
      status: "ok",
      data: {
        milestones,
        postingByYear,
        peakYear,
        totalPosts,
      },
    };
  },
};

function pickMilestones(
  changes: ProfileChange[],
  scope: TimeScope,
): Milestone[] {
  const filtered: Milestone[] = [];
  for (const c of changes) {
    if (!INTERESTING_FIELDS.has(c.field)) continue;
    if (scope.kind === "year") {
      const year = new Date(c.ts * 1000).getUTCFullYear();
      if (year !== scope.year) continue;
    }
    filtered.push({ ts: c.ts, field: c.field, from: c.from, to: c.to });
  }
  // Chronological — oldest → newest, so the timeline reads top-down naturally.
  filtered.sort((a, b) => a.ts - b.ts);
  return filtered;
}

function groupPostsByYear(
  interactions: Interaction[],
): Array<{ year: number; count: number }> {
  const counts = new Map<number, number>();
  for (const i of interactions) {
    if (i.kind !== "post") continue;
    const year = new Date(i.ts * 1000).getUTCFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

function pickPeakYear(
  postingByYear: Array<{ year: number; count: number }>,
): { year: number; count: number } | null {
  if (postingByYear.length === 0) return null;
  let best = postingByYear[0];
  for (const y of postingByYear) {
    if (y.count > best.count) best = y;
  }
  return best;
}
