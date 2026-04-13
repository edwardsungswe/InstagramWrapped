import {
  asStringMapArray,
  fieldTimestamp,
} from "../decoders/stringMap";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const SAVED_POSTS = "your_instagram_activity/saved/saved_posts.json";

/**
 * Reads `saved_posts.json` and emits `save` Interactions.
 *
 * Each item: `{ title: <handle>, string_map_data: { "Saved on": { href, timestamp } } }`
 */
export async function projectSaves(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const raw = await manifest.readJson(SAVED_POSTS);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const ts = toUnixSeconds(fieldTimestamp(item, "Saved on"));
    if (ts === undefined) continue;
    out.push({
      kind: "save",
      ts,
      withHandle: item.title || undefined,
      contentRef: item.fields["Saved on"]?.href,
    });
  }
  return out;
}
