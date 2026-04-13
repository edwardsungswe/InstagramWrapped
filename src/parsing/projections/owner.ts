import { asStringMapArray, fieldValue } from "../decoders/stringMap";
import { personalInfoFile } from "../schemas/personalInfo";
import type { Owner } from "@/model/events";
import type { FileManifest } from "../types";

const SOURCE = "personal_information/personal_information/personal_information.json";

/**
 * Reads the export owner's display name and handle from
 * `personal_information.json`. Both fields are optional — graceful
 * degradation if either is missing.
 *
 * The display name is critical for the messages projection, which uses it to
 * tell `dm_sent` from `dm_received`.
 */
export async function projectOwner(manifest: FileManifest): Promise<Owner> {
  const raw = await manifest.readJson(SOURCE);
  if (!raw) return {};

  const parsed = personalInfoFile.safeParse(raw);
  if (!parsed.success) return {};

  // The container looks like { profile_user: [ { string_map_data: {...} } ] }
  // — we feed it through the stringMap decoder to get a uniform StringMapItem.
  const items = asStringMapArray(parsed.data);
  if (items.length === 0) return {};

  const item = items[0];
  return {
    displayName: fieldValue(item, "Name"),
    handle: fieldValue(item, "Username"),
  };
}
