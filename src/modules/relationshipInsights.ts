import type { Interaction } from "@/model/events";
import { filterByScope } from "./scope";
import type { InsightModule } from "./types";

/**
 * "The most shareable" card per PLAN.md § Phase 7. Surfaces two patterns
 * over the user's DM history:
 *
 * - **One-sided friendships**: people the user texts a lot, who don't text
 *   back. Filter: `sentRatio > 0.7` AND `total ≥ 20`.
 * - **Situationships**: high-volume DM correspondents whose conversations
 *   cluster late at night (22:00–04:00 UTC). Filter: `nightFraction > 0.7`
 *   AND `total ≥ 30`.
 *
 * Both lists are capped at 3 entries to keep the card concise. The
 * **ghost-friend** detector mentioned in PLAN.md is deferred — it needs
 * tuning to avoid false positives on people who naturally taper off.
 */

const ONE_SIDED_RATIO = 0.7;
const ONE_SIDED_MIN_TOTAL = 20;
const ONE_SIDED_TOP = 3;

const SITUATIONSHIP_NIGHT_FRACTION = 0.7;
const SITUATIONSHIP_MIN_TOTAL = 30;
const SITUATIONSHIP_TOP = 3;

export type OneSidedRow = {
  handle: string;
  sent: number;
  received: number;
  /** sent / (sent + received) — closer to 1.0 = more one-sided. */
  sentRatio: number;
};

export type SituationshipRow = {
  handle: string;
  total: number;
  /** Fraction of DMs that happened between 22:00 and 04:00 UTC. */
  nightFraction: number;
};

export type RelationshipInsightsResult = {
  oneSided: OneSidedRow[];
  situationships: SituationshipRow[];
};

type Bucket = {
  handle: string;
  sent: number;
  received: number;
  total: number;
  nightCount: number;
};

function newBucket(handle: string): Bucket {
  return { handle, sent: 0, received: 0, total: 0, nightCount: 0 };
}

export const relationshipInsights: InsightModule<RelationshipInsightsResult> = {
  id: "relationship-insights",
  title: "Relationship Insights",
  requires: ["your_instagram_activity/messages/inbox/**"],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);
    const buckets = new Map<string, Bucket>();
    const ownerHandle = bundle.account.owner.handle;

    for (const i of scoped) {
      if (i.kind !== "dm_sent" && i.kind !== "dm_received") continue;
      if (!i.withHandle) continue;
      if (ownerHandle && i.withHandle === ownerHandle) continue;

      const bucket = buckets.get(i.withHandle) ?? newBucket(i.withHandle);
      bucket.total += 1;
      if (i.kind === "dm_sent") bucket.sent += 1;
      else bucket.received += 1;
      if (isNightHourUTC(i.ts)) bucket.nightCount += 1;
      buckets.set(i.withHandle, bucket);
    }

    const oneSided: OneSidedRow[] = [];
    const situationships: SituationshipRow[] = [];

    for (const b of buckets.values()) {
      if (b.total >= ONE_SIDED_MIN_TOTAL) {
        const sentRatio = b.sent / b.total;
        if (sentRatio > ONE_SIDED_RATIO) {
          oneSided.push({
            handle: b.handle,
            sent: b.sent,
            received: b.received,
            sentRatio,
          });
        }
      }
      if (b.total >= SITUATIONSHIP_MIN_TOTAL) {
        const nightFraction = b.nightCount / b.total;
        if (nightFraction > SITUATIONSHIP_NIGHT_FRACTION) {
          situationships.push({
            handle: b.handle,
            total: b.total,
            nightFraction,
          });
        }
      }
    }

    oneSided.sort((a, b) => b.sentRatio - a.sentRatio);
    situationships.sort((a, b) => b.nightFraction - a.nightFraction);

    return {
      status: "ok",
      data: {
        oneSided: oneSided.slice(0, ONE_SIDED_TOP),
        situationships: situationships.slice(0, SITUATIONSHIP_TOP),
      },
    };
  },
};

/**
 * UTC night window: 22:00 (10pm) inclusive through 04:59 (almost 5am)
 * inclusive. Same convention as `personalityType.ts`'s "night" bucket.
 */
function isNightHourUTC(unixSeconds: number): boolean {
  const hour = new Date(unixSeconds * 1000).getUTCHours();
  return hour >= 22 || hour < 5;
}
