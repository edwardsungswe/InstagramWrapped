import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

/**
 * Reads the user's own published media (posts, reels, stories) and emits
 * `post` Interactions. One interaction per post/reel/story (NOT one per
 * media item — multi-image carousel posts collapse to a single event).
 *
 * The file shapes differ from `posts_viewed.json` etc. (which use Shape A
 * `label_values`). Own-media files use nested `media: [{creation_timestamp}]`
 * arrays for posts and reels, and direct `creation_timestamp` items for
 * stories. The shape is unique enough to warrant a small custom walker
 * rather than reusing the Shape A decoder.
 *
 * Sources:
 *   - posts_1.json    — top-level array; each item has a `media[]` with one
 *                       or more photos sharing the same creation_timestamp
 *   - reels.json      — `{ ig_reels_media: [...] }` wrapper, same nested shape
 *   - stories.json    — `{ ig_stories: [...] }` wrapper, items have
 *                       `creation_timestamp` directly (no inner media array)
 */

const POSTS = "your_instagram_activity/media/posts_1.json";
const REELS = "your_instagram_activity/media/reels.json";
const STORIES = "your_instagram_activity/media/stories.json";

type MediaInner = {
  creation_timestamp?: number;
  uri?: string;
};

type PostsArrayItem = {
  media?: MediaInner[];
  creation_timestamp?: number;
  title?: string;
};

type ReelsFile = {
  ig_reels_media?: PostsArrayItem[];
};

type StoriesFile = {
  ig_stories?: MediaInner[];
};

export async function projectPosts(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const [posts, reels, stories] = await Promise.all([
    readPosts(manifest),
    readReels(manifest),
    readStories(manifest),
  ]);
  return [...posts, ...reels, ...stories];
}

async function readPosts(manifest: FileManifest): Promise<Interaction[]> {
  const raw = await manifest.readJson<PostsArrayItem[]>(POSTS);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => toInteraction(item, "post"))
    .filter((i): i is Interaction => i !== null);
}

async function readReels(manifest: FileManifest): Promise<Interaction[]> {
  const raw = await manifest.readJson<ReelsFile>(REELS);
  const items = raw?.ig_reels_media;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => toInteraction(item, "reel"))
    .filter((i): i is Interaction => i !== null);
}

async function readStories(manifest: FileManifest): Promise<Interaction[]> {
  const raw = await manifest.readJson<StoriesFile>(STORIES);
  const items = raw?.ig_stories;
  if (!Array.isArray(items)) return [];
  const out: Interaction[] = [];
  for (const item of items) {
    const ts = toUnixSeconds(item?.creation_timestamp);
    if (ts === undefined) continue;
    out.push({
      kind: "post",
      ts,
      contentRef: item.uri,
      meta: { mediaKind: "story" },
    });
  }
  return out;
}

/**
 * Converts a posts/reels item to a single `post` Interaction. Picks the
 * timestamp from the first media inner (or the top-level field if present);
 * skips items with no usable timestamp.
 */
function toInteraction(
  item: PostsArrayItem,
  mediaKind: "post" | "reel",
): Interaction | null {
  const inner = item.media?.[0];
  const tsCandidate = inner?.creation_timestamp ?? item.creation_timestamp;
  const ts = toUnixSeconds(tsCandidate);
  if (ts === undefined) return null;
  return {
    kind: "post",
    ts,
    contentRef: inner?.uri,
    meta: { mediaKind },
  };
}
