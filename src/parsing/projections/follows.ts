import { asStringMapArray } from "../decoders/stringMap";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { Interaction } from "@/model/events";
import type { FileManifest } from "../types";

const FOLLOWING = "connections/followers_and_following/following.json";

/**
 * Reads the following list (Layout B1, wrapped) and the followers files
 * (Layout B2, array-at-root, may be split across `followers_1.json`,
 * `followers_2.json`, …).
 *
 * Both produce `follow` Interactions; the `meta.direction` field disambiguates
 * "you followed them" from "they follow you".
 */
export async function projectFollows(
  manifest: FileManifest,
): Promise<Interaction[]> {
  const followerPaths = manifest.paths.filter((p) =>
    /^connections\/followers_and_following\/followers_\d+\.json$/.test(p),
  );

  const [following, ...followerChunks] = await Promise.all([
    readFollowList(manifest, FOLLOWING, "following"),
    ...followerPaths.map((path) =>
      readFollowList(manifest, path, "follower"),
    ),
  ]);
  return [...following, ...followerChunks.flat()];
}

async function readFollowList(
  manifest: FileManifest,
  source: string,
  direction: "following" | "follower",
): Promise<Interaction[]> {
  const raw = await manifest.readJson(source);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: Interaction[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const entry = item.list[0];
    const ts = toUnixSeconds(entry?.timestamp);
    if (ts === undefined) continue;
    // For `following.json` the per-item title is the username; for the
    // bare-array followers files the title is empty and the username sits
    // in `string_list_data[0].value`.
    const handle = item.title || entry?.value;
    if (!handle) continue;
    out.push({
      kind: "follow",
      ts,
      withHandle: handle,
      meta: { direction },
    });
  }
  return out;
}
