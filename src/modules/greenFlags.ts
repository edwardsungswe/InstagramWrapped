import type { Interaction } from "@/model/events";
import { filterByScope } from "./scope";
import type { Flag } from "./redFlags";
import type { InsightModule } from "./types";

/**
 * Pattern detectors for behavioral green flags. Same composition pattern as
 * `redFlags.ts` — each detector is a pure function that returns one `Flag`
 * if its trigger condition is met, otherwise null.
 */

export type GreenFlagsResult = {
  flags: Flag[];
};

type Detector = (interactions: Interaction[]) => Flag | null;

export const greenFlags: InsightModule<GreenFlagsResult> = {
  id: "green-flags",
  title: "Green Flags",
  requires: ["your_instagram_activity/messages/inbox/**"],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);
    const flags: Flag[] = [];
    for (const detector of DETECTORS) {
      const flag = detector(scoped);
      if (flag) flags.push(flag);
    }
    return { status: "ok", data: { flags } };
  },
};

const DETECTORS: Detector[] = [
  detectBalancedReplies,
  detectCommenter,
  detectConsistentPresence,
];

/**
 * Fires when at least one heavy correspondent has a balanced send/receive
 * ratio (0.4–0.6) AND total volume ≥ 50. Healthy two-way friendship signal.
 */
function detectBalancedReplies(interactions: Interaction[]): Flag | null {
  const buckets = new Map<string, { sent: number; received: number }>();
  for (const i of interactions) {
    if ((i.kind !== "dm_sent" && i.kind !== "dm_received") || !i.withHandle) continue;
    const b = buckets.get(i.withHandle) ?? { sent: 0, received: 0 };
    if (i.kind === "dm_sent") b.sent += 1;
    else b.received += 1;
    buckets.set(i.withHandle, b);
  }
  let bestHandle: string | null = null;
  let bestTotal = 0;
  for (const [handle, b] of buckets) {
    const total = b.sent + b.received;
    if (total < 50) continue;
    const ratio = b.sent / total;
    if (ratio >= 0.4 && ratio <= 0.6 && total > bestTotal) {
      bestHandle = handle;
      bestTotal = total;
    }
  }
  if (!bestHandle) return null;
  return {
    id: "balanced-replies",
    label: "You have a real two-way friendship.",
    detail: `@${bestHandle} · ${bestTotal} messages, evenly split.`,
  };
}

/**
 * Fires when comments per like > 0.2 AND total comments ≥ 20. The user
 * actually engages instead of just lurking.
 */
function detectCommenter(interactions: Interaction[]): Flag | null {
  let likes = 0;
  let comments = 0;
  for (const i of interactions) {
    if (i.kind === "like") likes += 1;
    else if (i.kind === "comment") comments += 1;
  }
  if (comments < 20) return null;
  if (likes > 0 && comments / likes < 0.2) return null;
  return {
    id: "commenter",
    label: "You actually leave comments.",
    detail: `${comments.toLocaleString()} comments to ${likes.toLocaleString()} likes.`,
  };
}

/**
 * Fires when the user is active on > 100 distinct UTC days. Shows up
 * regularly rather than in bursts.
 */
function detectConsistentPresence(interactions: Interaction[]): Flag | null {
  const days = new Set<string>();
  for (const i of interactions) {
    days.add(utcDayString(i.ts));
  }
  if (days.size < 100) return null;
  return {
    id: "consistent-presence",
    label: "You show up — a lot.",
    detail: `${days.size.toLocaleString()} distinct days of activity.`,
  };
}

function utcDayString(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
