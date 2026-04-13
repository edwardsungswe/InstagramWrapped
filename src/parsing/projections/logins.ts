import {
  asStringMapArray,
  fieldTimestamp,
  fieldValue,
  type StringMapItem,
} from "../decoders/stringMap";
import { stringMapFile } from "../schemas/stringMap";
import { toUnixSeconds } from "../time";
import type { LoginEvent } from "@/model/events";
import type { FileManifest } from "../types";

const LOGIN_ACTIVITY =
  "security_and_login_information/login_and_profile_creation/login_activity.json";
const LOGOUT_ACTIVITY =
  "security_and_login_information/login_and_profile_creation/logout_activity.json";
const LAST_KNOWN_LOCATION =
  "security_and_login_information/login_and_profile_creation/last_known_location.json";
const DEVICES = "personal_information/device_information/devices.json";

/**
 * Reads login_activity, logout_activity, last_known_location, and devices,
 * normalizing all of them into a single `LoginEvent[]` sidecar.
 *
 * Each source uses string_map_data with fields like "Time" / "Last Login" /
 * "GPS Time Uploaded" — the projection picks whichever timestamp field is
 * available per source.
 */
export async function projectLogins(
  manifest: FileManifest,
): Promise<LoginEvent[]> {
  const [logins, logouts, locations, devices] = await Promise.all([
    readLoginFile(manifest, LOGIN_ACTIVITY, "login", "Time"),
    readLoginFile(manifest, LOGOUT_ACTIVITY, "logout", "Time"),
    readLoginFile(manifest, LAST_KNOWN_LOCATION, "location", "GPS Time Uploaded"),
    readLoginFile(manifest, DEVICES, "device", "Last Login"),
  ]);
  return [...logins, ...logouts, ...locations, ...devices];
}

async function readLoginFile(
  manifest: FileManifest,
  source: string,
  kind: LoginEvent["source"],
  timeField: string,
): Promise<LoginEvent[]> {
  const raw = await manifest.readJson(source);
  if (!raw) return [];
  const parsed = stringMapFile.safeParse(raw);
  if (!parsed.success) return [];

  const out: LoginEvent[] = [];
  for (const item of asStringMapArray(parsed.data)) {
    const event = toLoginEvent(item, kind, timeField);
    if (event) out.push(event);
  }
  return out;
}

function toLoginEvent(
  item: StringMapItem,
  source: LoginEvent["source"],
  timeField: string,
): LoginEvent | undefined {
  const ts = toUnixSeconds(fieldTimestamp(item, timeField));
  if (ts === undefined) return undefined;
  return {
    ts,
    source,
    ip: fieldValue(item, "IP Address"),
    userAgent: fieldValue(item, "User Agent"),
    device: fieldValue(item, "Device") ?? fieldValue(item, "Hardware Model"),
  };
}
