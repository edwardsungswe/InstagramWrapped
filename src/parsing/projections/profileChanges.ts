import {
  asStringMapArray,
  fieldTimestamp,
  fieldValue,
} from "../decoders/stringMap";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { ProfileChange } from "@/model/events";
import type { FileManifest } from "../types";

const PROFILE_CHANGES =
  "personal_information/personal_information/profile_changes.json";

/**
 * Reads `profile_changes.json` and emits `ProfileChange[]` sidecar records.
 *
 * Each item has fields: `Changed`, `Previous Value`, `New Value`, `Change Date`.
 * Note that `Previous Value` is often empty (e.g. for the very first phone
 * number set) — preserve as undefined rather than empty string.
 */
export async function projectProfileChanges(
  manifest: FileManifest,
): Promise<ProfileChange[]> {
  const raw = await manifest.readJson(PROFILE_CHANGES);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: ProfileChange[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const ts = toUnixSeconds(fieldTimestamp(item, "Change Date"));
    const field = fieldValue(item, "Changed");
    if (ts === undefined || !field) continue;
    out.push({
      ts,
      field,
      from: emptyToUndefined(fieldValue(item, "Previous Value")),
      to: emptyToUndefined(fieldValue(item, "New Value")),
    });
  }
  return out;
}

function emptyToUndefined(s: string | undefined): string | undefined {
  return s && s.length > 0 ? s : undefined;
}
