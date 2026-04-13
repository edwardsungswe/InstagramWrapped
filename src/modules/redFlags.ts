import type { Interaction } from "@/model/events";
import { filterByScope } from "./scope";
import type { InsightModule } from "./types";

/**
 * Pattern detectors for behavioral red flags. Each detector is a pure
 * function that returns one `Flag` if its trigger condition is met,
 * otherwise null. The module composes them into a single result.
 *
 * Adding a new detector = appending to `DETECTORS`. Removing one = deleting
 * its entry. Tests cover each detector in isolation.
 */

export type Flag = {
  id: string;
  label: string;
  detail?: string;
};

export type RedFlagsResult = {
  flags: Flag[];
};

type Detector = (interactions: Interaction[]) => Flag | null;

export const redFlags: InsightModule<RedFlagsResult> = {
  id: "red-flags",
  title: "Red Flags",
  requires: ["your_instagram_activity/likes/liked_posts.json"],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);
    const flags: Flag[] = [];
    for (const detector of DETECTORS) {
      const flag = detector(scoped);
      if (flag) flags.push(flag);
    }
    return { status: "ok", data: { flags } };
  },
};

const DETECTORS: Detector[] = [
  detectLikeNoComment,
  detectRepeatSearch,
  detectLateNightOnly,
];

/**
 * Fires when the user likes ≥ 10× more posts than they comment on.
 * Threshold: total likes ≥ 50, ratio likes:comments > 10:1.
 */
function detectLikeNoComment(interactions: Interaction[]): Flag | null {
  let likes = 0;
  let comments = 0;
  for (const i of interactions) {
    if (i.kind === "like") likes += 1;
    else if (i.kind === "comment") comments += 1;
  }
  if (likes < 50) return null;
  if (likes < (comments + 1) * 10) return null;
  return {
    id: "like-no-comment",
    label: "You like, but you never comment.",
    detail: `${likes.toLocaleString()} likes vs ${comments.toLocaleString()} comments.`,
  };
}

/**
 * Fires when the same handle appears in `search` interactions ≥ 3 times.
 * Reveals the "I keep checking up on this person" pattern.
 */
function detectRepeatSearch(interactions: Interaction[]): Flag | null {
  const counts = new Map<string, number>();
  for (const i of interactions) {
    if (i.kind !== "search" || !i.withHandle) continue;
    counts.set(i.withHandle, (counts.get(i.withHandle) ?? 0) + 1);
  }
  let topHandle: string | null = null;
  let topCount = 0;
  for (const [handle, count] of counts) {
    if (count > topCount) {
      topHandle = handle;
      topCount = count;
    }
  }
  if (!topHandle || topCount < 3) return null;
  return {
    id: "repeat-search",
    label: "You searched the same person, repeatedly.",
    detail: `@${topHandle} · ${topCount} times.`,
  };
}

/**
 * Fires when > 60% of all DMs sent happened between 22:00 and 04:59 UTC and
 * total `dm_sent` ≥ 100. The "you only text people late at night" pattern.
 */
function detectLateNightOnly(interactions: Interaction[]): Flag | null {
  let total = 0;
  let night = 0;
  for (const i of interactions) {
    if (i.kind !== "dm_sent") continue;
    total += 1;
    const hour = new Date(i.ts * 1000).getUTCHours();
    if (hour >= 22 || hour < 5) night += 1;
  }
  if (total < 100) return null;
  if (night / total <= 0.6) return null;
  return {
    id: "late-night-only",
    label: "Your DMs only come out after dark.",
    detail: `${Math.round((night / total) * 100)}% of your sent DMs were after 10pm.`,
  };
}
