import {
  asLabelValuesArray,
  extractOwnerHandle,
  extractUrl,
} from "../decoders/labelValues";
import { asStringMapArray } from "../decoders/stringMap";
import { labelValuesFile } from "../schemas/labelValues";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const LIKED_POSTS = "your_instagram_activity/likes/liked_posts.json";
const LIKED_COMMENTS = "your_instagram_activity/likes/liked_comments.json";

/**
 * Reads liked posts and liked comments and emits `like` Interactions.
 *
 * - `liked_posts.json` is Shape A: each item has a `label_values` block with
 *   the post URL and an `Owner` sub-dict with the post author's username.
 * - `liked_comments.json` is Shape B (wrapped): each item's `title` is the
 *   author of the comment you liked, and `string_list_data[0].href` is the
 *   post URL.
 */
export async function projectLikes(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const [postLikes, commentLikes] = await Promise.all([
    readLikedPosts(manifest),
    readLikedComments(manifest),
  ]);
  return [...postLikes, ...commentLikes];
}

async function readLikedPosts(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const raw = await manifest.readJson(LIKED_POSTS);
  if (!raw) return [];
  const parsed = labelValuesFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asLabelValuesArray(parsed.data)) {
    const ts = toUnixSeconds(item.timestamp as number | undefined);
    if (ts === undefined) continue;
    out.push({
      kind: "like",
      ts,
      withHandle: extractOwnerHandle(item),
      contentRef: extractUrl(item),
    });
  }
  return out;
}

async function readLikedComments(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const raw = await manifest.readJson(LIKED_COMMENTS);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const entry = item.list[0];
    const ts = toUnixSeconds(entry?.timestamp);
    if (ts === undefined) continue;
    out.push({
      kind: "like",
      ts,
      // For liked comments, the item's `title` is the username whose
      // comment you liked.
      withHandle: item.title || undefined,
      contentRef: entry?.href,
      meta: { source: "comment" },
    });
  }
  return out;
}
