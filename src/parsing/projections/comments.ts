import {
  asStringMapArray,
  fieldTimestamp,
  fieldValue,
  type StringMapItem,
} from "../decoders/stringMap";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const REELS_COMMENTS = "your_instagram_activity/comments/reels_comments.json";

/**
 * Reads post_comments_*.json (numbered chunks) and reels_comments.json,
 * emitting `comment` Interactions.
 *
 * Both files use the string_map_data variant with `Comment`, `Media Owner`,
 * and `Time` fields. The post-comments file may be split across numbered
 * chunks (`post_comments_1.json`, `post_comments_2.json`, …).
 */
export async function projectComments(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const postCommentPaths = manifest.paths.filter((p) =>
    /^your_instagram_activity\/comments\/post_comments_\d+\.json$/.test(p),
  );

  const all = await Promise.all([
    ...postCommentPaths.map((path) => readCommentsFile(manifest, path)),
    readCommentsFile(manifest, REELS_COMMENTS),
  ]);
  return all.flat();
}

async function readCommentsFile(
  manifest: FileManifest,
  source: string,
): Promise<Interaction[]> {
  const raw = await manifest.readJson(source);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const interaction = toInteraction(item);
    if (interaction) out.push(interaction);
  }
  return out;
}

function toInteraction(item: StringMapItem): Interaction | undefined {
  const tsRaw = fieldTimestamp(item, "Time");
  const ts = toUnixSeconds(tsRaw);
  if (ts === undefined) return undefined;
  return {
    kind: "comment",
    ts,
    withHandle: fieldValue(item, "Media Owner"),
    meta: {
      text: fieldValue(item, "Comment"),
    },
  };
}

