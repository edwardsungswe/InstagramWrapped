import { asStringMapArray } from "../decoders/stringMap";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const PROFILE_SEARCHES = "logged_information/recent_searches/profile_searches.json";

/**
 * Reads `profile_searches.json` and emits `search` Interactions.
 *
 * Each item: `{ title: <handle>, string_list_data: [{ href, timestamp }] }`
 */
export async function projectSearches(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const raw = await manifest.readJson(PROFILE_SEARCHES);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const entry = item.list[0];
    const ts = toUnixSeconds(entry?.timestamp);
    if (ts === undefined) continue;
    out.push({
      kind: "search",
      ts,
      withHandle: item.title || undefined,
    });
  }
  return out;
}
