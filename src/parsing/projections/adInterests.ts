import { extractVecValues } from "../decoders/labelValues";
import { labelValuesFile } from "../schemas/labelValues";
import type { AdInterest } from "@/model/events";
import type { FileManifest } from "../types";

const OTHER_CATEGORIES =
  "ads_information/instagram_ads_and_businesses/other_categories_used_to_reach_you.json";
const ADVERTISERS =
  "ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json";

/**
 * Reads Instagram's ad-targeting categories and the list of advertisers that
 * have uploaded data about you, normalizing both into `AdInterest[]` records.
 *
 * - `other_categories_used_to_reach_you.json` is a single label_values block
 *   with a `vec` of category names under the `Name` label.
 * - `advertisers_using_your_activity_or_information.json` uses a custom shape
 *   with `ig_custom_audiences_all_types[].advertiser_name`.
 *
 * The Phase 7 grouping pass will assign `group` (Lifestyle / Financial / etc).
 * Phase 2 leaves it undefined.
 */
export async function projectAdInterests(
  manifest: FileManifest,
): Promise<AdInterest[]> {
  const [categories, advertisers] = await Promise.all([
    readCategories(manifest),
    readAdvertisers(manifest),
  ]);
  return [...categories, ...advertisers];
}

async function readCategories(
  manifest: FileManifest,
): Promise<AdInterest[]> {
  const raw = await manifest.readJson(OTHER_CATEGORIES);
  if (!raw) return [];
  // This file is a single label_values object, NOT an array. The schema's
  // union accepts either; we hand the object straight to the helper.
  const parsed = labelValuesFile.safeParse(raw);
  if (!parsed.success) return [];

  // The single object has its own label_values directly. Wrap it in an array
  // so we can reuse the existing helper.
  const item = parsed.data as { label_values?: unknown };
  if (!item.label_values) return [];

  return extractVecValues(item as never, "Name").map((name) => ({ name }));
}

type AdvertisersFile = {
  ig_custom_audiences_all_types?: Array<{
    advertiser_name?: unknown;
  }>;
};

async function readAdvertisers(
  manifest: FileManifest,
): Promise<AdInterest[]> {
  const raw = await manifest.readJson<AdvertisersFile>(ADVERTISERS);
  if (!raw?.ig_custom_audiences_all_types) return [];

  const out: AdInterest[] = [];
  for (const entry of raw.ig_custom_audiences_all_types) {
    const name =
      typeof entry?.advertiser_name === "string"
        ? entry.advertiser_name
        : undefined;
    if (name) out.push({ name, group: "Advertiser" });
  }
  return out;
}
