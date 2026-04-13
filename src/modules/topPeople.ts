import type { Interaction } from "@/model/events";
import { filterByScope } from "./scope";
import type { InsightModule } from "./types";

/**
 * Per-handle weights for the closeness score. Tuned for the MVP — DMs you
 * sent count more than DMs you received (you initiated), and reactions count
 * less than full conversations.
 */
const WEIGHTS = {
  dm_sent: 2.0,
  dm_received: 1.0,
  like: 0.5,
  story_like: 0.5,
} as const;

/**
 * Minimum weighted score for a person to appear in the top-people list.
 * Filters out one-off interactions and accounts you only liked once.
 */
const MIN_SCORE = 30;

/**
 * Maximum number of people to surface. Phase 6's story card will probably
 * focus on the top 5; we keep 10 here so the inline list is interesting.
 */
const TOP_N = 10;

export type TopPersonRow = {
  handle: string;
  score: number;
  breakdown: {
    dmSent: number;
    dmReceived: number;
    likes: number;
    storyLikes: number;
  };
};

export type TopPeopleResult = {
  people: TopPersonRow[];
  /** Distinct handles considered before applying the threshold. */
  totalConsidered: number;
  /** Score threshold used. Surfaced so the UI can explain "min N to appear". */
  threshold: number;
};

type Bucket = {
  handle: string;
  score: number;
  dmSent: number;
  dmReceived: number;
  likes: number;
  storyLikes: number;
};

export const topPeople: InsightModule<TopPeopleResult> = {
  id: "top-people",
  title: "Top People",
  requires: ["your_instagram_activity/messages/inbox/**"],
  optional: [
    "your_instagram_activity/likes/liked_posts.json",
    "your_instagram_activity/story_interactions/story_likes.json",
  ],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);
    const buckets = new Map<string, Bucket>();

    for (const i of scoped) {
      const weight = scoreFor(i);
      if (weight === 0) continue;
      if (!i.withHandle) continue;
      // Skip self-references defensively (shouldn't happen given the parser).
      if (bundle.account.owner.handle && i.withHandle === bundle.account.owner.handle) continue;

      const bucket = buckets.get(i.withHandle) ?? createBucket(i.withHandle);
      bucket.score += weight;
      switch (i.kind) {
        case "dm_sent":
          bucket.dmSent += 1;
          break;
        case "dm_received":
          bucket.dmReceived += 1;
          break;
        case "like":
          bucket.likes += 1;
          break;
        case "story_like":
          bucket.storyLikes += 1;
          break;
      }
      buckets.set(i.withHandle, bucket);
    }

    const totalConsidered = buckets.size;
    const ranked = Array.from(buckets.values())
      .filter((b) => b.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N)
      .map(toRow);

    return {
      status: "ok",
      data: {
        people: ranked,
        totalConsidered,
        threshold: MIN_SCORE,
      },
    };
  },
};

function scoreFor(i: Interaction): number {
  switch (i.kind) {
    case "dm_sent":
      return WEIGHTS.dm_sent;
    case "dm_received":
      return WEIGHTS.dm_received;
    case "like":
      return WEIGHTS.like;
    case "story_like":
      return WEIGHTS.story_like;
    default:
      return 0;
  }
}

function createBucket(handle: string): Bucket {
  return {
    handle,
    score: 0,
    dmSent: 0,
    dmReceived: 0,
    likes: 0,
    storyLikes: 0,
  };
}

function toRow(b: Bucket): TopPersonRow {
  return {
    handle: b.handle,
    score: b.score,
    breakdown: {
      dmSent: b.dmSent,
      dmReceived: b.dmReceived,
      likes: b.likes,
      storyLikes: b.storyLikes,
    },
  };
}
