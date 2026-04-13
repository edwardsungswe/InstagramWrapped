import type { LoginEvent } from "@/model/events";
import type { InsightModule } from "./types";

/**
 * "Where you log in from" — a snapshot view of the user's login history.
 *
 * **Known PLAN.md deviation**: PLAN.md's deliverable says "You logged in
 * from 7 cities," but city-level geolocation is impossible client-side.
 * The export has IP addresses but no city data; deriving cities would
 * need a third-party API (privacy violation) or a 50MB+ static GeoIP DB.
 * **We pivot the headline to devices** — same emotional weight, honestly
 * derivable from `bundle.logins`. The card copy reads "You logged in from
 * N different devices."
 *
 * Reads `bundle.logins` directly. **Ignores `scope`** because login events
 * come from snapshot files (login_activity.json, devices.json, etc.) — not
 * a temporal stream the same way DMs are. Same convention as `adPersonality`.
 */

export type DeviceLocationsResult = {
  totalLoginEvents: number;
  distinctDevices: number;
  distinctUserAgents: number;
  topUserAgent: { name: string; count: number } | null;
  busiestMonth: { label: string; count: number } | null;
};

export const deviceLocations: InsightModule<DeviceLocationsResult> = {
  id: "device-locations",
  title: "Device Locations",
  requires: [
    "security_and_login_information/login_and_profile_creation/login_activity.json",
  ],
  optional: [
    "personal_information/device_information/devices.json",
    "security_and_login_information/login_and_profile_creation/last_known_location.json",
  ],
  run: ({ bundle }) => {
    const logins = bundle.logins;
    if (logins.length === 0) {
      return {
        status: "ok",
        data: {
          totalLoginEvents: 0,
          distinctDevices: 0,
          distinctUserAgents: 0,
          topUserAgent: null,
          busiestMonth: null,
        },
      };
    }

    const devices = new Set<string>();
    const userAgentCounts = new Map<string, number>();
    const monthCounts = new Map<string, number>();

    for (const event of logins) {
      if (event.device) devices.add(event.device);
      if (event.userAgent) {
        const friendly = friendlyUserAgent(event.userAgent);
        userAgentCounts.set(friendly, (userAgentCounts.get(friendly) ?? 0) + 1);
      }
      const month = utcMonthString(event.ts);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }

    return {
      status: "ok",
      data: {
        totalLoginEvents: logins.length,
        distinctDevices: devices.size,
        distinctUserAgents: userAgentCounts.size,
        topUserAgent: pickTop(userAgentCounts),
        busiestMonth: pickTopMonth(monthCounts),
      },
    };
  },
};

/**
 * Collapses verbose user-agent strings into a recognizable label, e.g.
 * "Mozilla/5.0 ... Chrome/137.0.0.0 Safari/537.36" → "Chrome on Mac".
 * Falls back to a truncated version of the input for unknown UAs.
 */
function friendlyUserAgent(ua: string): string {
  const browser = pickBrowser(ua);
  const platform = pickPlatform(ua);
  if (browser && platform) return `${browser} on ${platform}`;
  if (browser) return browser;
  if (platform) return platform;
  return ua.length > 30 ? `${ua.slice(0, 27)}…` : ua;
}

function pickBrowser(ua: string): string | null {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Instagram /.test(ua)) return "Instagram app";
  return null;
}

function pickPlatform(ua: string): string | null {
  if (/Mac OS X|Macintosh/.test(ua)) return "Mac";
  if (/iPhone|iOS/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return null;
}

function pickTop(
  counts: Map<string, number>,
): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

function pickTopMonth(
  counts: Map<string, number>,
): { label: string; count: number } | null {
  let best: { label: string; count: number } | null = null;
  for (const [label, count] of counts) {
    if (!best || count > best.count) best = { label, count };
  }
  return best;
}

function utcMonthString(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}
