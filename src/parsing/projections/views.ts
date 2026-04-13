import {
  asLabelValuesArray,
  extractOwnerHandle,
  extractUrl,
} from "../decoders/labelValues";
import { labelValuesFile } from "../schemas/labelValues";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const POSTS_VIEWED = "ads_information/ads_and_topics/posts_viewed.json";
const VIDEOS_WATCHED = "ads_information/ads_and_topics/videos_watched.json";

/**
 * Reads posts_viewed.json and videos_watched.json and emits `view`
 * Interactions. Both are Shape A.
 */
export async function projectViews(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const [posts, videos] = await Promise.all([
    readShapeA(manifest, POSTS_VIEWED, "post"),
    readShapeA(manifest, VIDEOS_WATCHED, "video"),
  ]);
  return [...posts, ...videos];
}

async function readShapeA(
  manifest: FileManifest,
  source: string,
  kind: "post" | "video",
): Promise<Interaction[]> {
  const raw = await manifest.readJson(source);
  if (!raw) return [];
  const parsed = labelValuesFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asLabelValuesArray(parsed.data)) {
    const ts = toUnixSeconds(item.timestamp as number | undefined);
    if (ts === undefined) continue;
    out.push({
      kind: "view",
      ts,
      withHandle: extractOwnerHandle(item),
      contentRef: extractUrl(item),
      meta: { mediaKind: kind },
    });
  }
  return out;
}
