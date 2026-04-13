import {
  asLabelValuesArray,
  extractOwnerHandle,
  extractUrl,
} from "../decoders/labelValues";
import { labelValuesFile } from "../schemas/labelValues";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const STORY_LIKES = "your_instagram_activity/story_interactions/story_likes.json";

/**
 * Reads `story_likes.json` and emits `story_like` Interactions.
 * Despite living under `story_interactions/`, the file uses Shape A
 * (label_values with an Owner block).
 */
export async function projectStoryLikes(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const raw = await manifest.readJson(STORY_LIKES);
  if (!raw) return [];
  const parsed = labelValuesFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asLabelValuesArray(parsed.data)) {
    const ts = toUnixSeconds(item.timestamp as number | undefined);
    if (ts === undefined) continue;
    out.push({
      kind: "story_like",
      ts,
      withHandle: extractOwnerHandle(item),
      contentRef: extractUrl(item),
    });
  }
  return out;
}
