import { AD_GROUPS, EMBARRASSING_KEYWORDS } from "./adInterestRules";
import type { AdInterest } from "@/model/events";
import type { InsightModule } from "./types";

/**
 * Buckets the ad interests Instagram has assigned the user into a small
 * number of human-readable groups (Financial / Tech / Demographic /
 * Lifestyle / Advertiser / Other) and surfaces the most embarrassing
 * category as a punchline.
 *
 * Reads `bundle.adInterests` directly — no scope filter applies because ad
 * interests aren't time-stamped (they're a snapshot of Instagram's current
 * targeting profile, not a historical event stream).
 */

export type AdPersonalityResult = {
  /** Group → list of interest names in that group, max 8 per group. */
  byGroup: Record<string, string[]>;
  /** Group → total count (no cap). */
  groupCounts: Record<string, number>;
  /** Group with the largest count, or null if there are no interests. */
  topGroup: string | null;
  /** First interest matching the embarrassing-keyword blacklist. */
  embarrassing: string | null;
  /** Total ad interests considered. */
  total: number;
};

const SAMPLES_PER_GROUP = 8;
const OTHER_GROUP = "Other";

export const adPersonality: InsightModule<AdPersonalityResult> = {
  id: "ad-personality",
  title: "Ad Personality",
  requires: [
    "ads_information/instagram_ads_and_businesses/other_categories_used_to_reach_you.json",
  ],
  run: ({ bundle }) => {
    const interests = bundle.adInterests;
    const byGroup: Record<string, string[]> = {};
    const groupCounts: Record<string, number> = {};
    let embarrassing: string | null = null;

    for (const interest of interests) {
      const group = pickGroup(interest);
      if (!byGroup[group]) byGroup[group] = [];
      if (byGroup[group].length < SAMPLES_PER_GROUP) {
        byGroup[group].push(interest.name);
      }
      groupCounts[group] = (groupCounts[group] ?? 0) + 1;

      if (embarrassing === null && isEmbarrassing(interest.name)) {
        embarrassing = interest.name;
      }
    }

    const topGroup = pickTopGroup(groupCounts);

    return {
      status: "ok",
      data: {
        byGroup,
        groupCounts,
        topGroup,
        embarrassing,
        total: interests.length,
      },
    };
  },
};

/**
 * Returns the bucket for an ad interest. Phase 2's projection sets
 * `group: "Advertiser"` for entries from `advertisers_using_your_activity_or_information.json`;
 * we honor that directly. Otherwise we walk the rules table.
 */
function pickGroup(interest: AdInterest): string {
  if (interest.group === "Advertiser") return "Advertiser";
  const lower = interest.name.toLowerCase();
  for (const rule of AD_GROUPS) {
    if (rule.name === "Advertiser") continue;
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) return rule.name;
    }
  }
  return OTHER_GROUP;
}

function pickTopGroup(counts: Record<string, number>): string | null {
  let best: string | null = null;
  let bestCount = -1;
  for (const [group, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = group;
      bestCount = count;
    }
  }
  return best;
}

function isEmbarrassing(name: string): boolean {
  const lower = name.toLowerCase();
  return EMBARRASSING_KEYWORDS.some((kw) => lower.includes(kw));
}
