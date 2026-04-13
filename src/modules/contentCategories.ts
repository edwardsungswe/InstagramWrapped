import { filterByScope } from "./scope";
import { CATEGORY_RULES } from "./contentCategoryRules";
import type { Interaction } from "@/model/events";
import type { InsightModule } from "./types";

/**
 * Maps liked-post owner handles to content categories via the rules table
 * in `contentCategoryRules.ts`. Naive substring matching is the MVP — handles
 * like `afterhoursmelody` won't match anything and fall into the
 * uncategorized bucket. PLAN.md notes this can later upgrade to embeddings.
 *
 * Counts every distinct (handle, category) pairing once per category to
 * avoid one-celebrity-with-100-likes from dominating the result.
 */

const TOP_CATEGORIES = 6;
const SAMPLE_HANDLES_PER_CATEGORY = 3;

export type CategoryRow = {
  name: string;
  count: number;
  /** Up to 3 example handles in this category, for the card. */
  sampleHandles: string[];
};

export type ContentCategoriesResult = {
  categories: CategoryRow[];
  topCategory: string | null;
  uncategorizedCount: number;
};

export const contentCategories: InsightModule<ContentCategoriesResult> = {
  id: "content-categories",
  title: "Content Categories",
  requires: ["your_instagram_activity/likes/liked_posts.json"],
  optional: [
    "your_instagram_activity/saved/saved_posts.json",
    "your_instagram_activity/likes/liked_comments.json",
  ],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);

    // Distinct handles the user has interacted with via like/save/story_like.
    const handles = new Set<string>();
    for (const i of scoped) {
      if (!i.withHandle) continue;
      if (i.kind === "like" || i.kind === "save" || i.kind === "story_like") {
        handles.add(i.withHandle);
      }
    }

    const buckets = new Map<string, { count: number; samples: string[] }>();
    let uncategorizedCount = 0;

    for (const handle of handles) {
      const category = matchCategory(handle);
      if (category === null) {
        uncategorizedCount += 1;
        continue;
      }
      const bucket = buckets.get(category) ?? { count: 0, samples: [] };
      bucket.count += 1;
      if (bucket.samples.length < SAMPLE_HANDLES_PER_CATEGORY) {
        bucket.samples.push(handle);
      }
      buckets.set(category, bucket);
    }

    const categories: CategoryRow[] = Array.from(buckets.entries())
      .map(([name, b]) => ({ name, count: b.count, sampleHandles: b.samples }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_CATEGORIES);

    return {
      status: "ok",
      data: {
        categories,
        topCategory: categories[0]?.name ?? null,
        uncategorizedCount,
      },
    };
  },
};

/**
 * Walks the rules table and returns the first category whose any keyword
 * appears as a substring of the handle (case-insensitive). Returns null if
 * nothing matches.
 */
function matchCategory(handle: string): string | null {
  const lower = handle.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) return rule.name;
    }
  }
  return null;
}
