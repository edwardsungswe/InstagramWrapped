import { filterByScope } from "./scope";
import type { Interaction } from "@/model/events";
import type { InsightModule } from "./types";

/**
 * The "Your Year" / "Your Wrapped" headline numbers.
 *
 * Outputs:
 *   - totalInteractions: count after the active scope filter
 *   - mostActiveMonth:   `YYYY-MM` with the most interactions in the scope
 *   - peakDay:           `YYYY-MM-DD` with the most interactions in the scope
 *   - longestDmStreak:   the longest run of consecutive UTC days with at
 *                        least one `dm_sent` interaction (the user texted
 *                        someone every day)
 *
 * Months and days use UTC bucketing so the same scope returns the same
 * answers regardless of viewer timezone.
 */

export type YearSummaryResult = {
  totalInteractions: number;
  mostActiveMonth: { label: string; count: number } | null;
  peakDay: { date: string; count: number } | null;
  longestDmStreak: { days: number; startDay?: string; endDay?: string };
};

export const yearSummary: InsightModule<YearSummaryResult> = {
  id: "year-summary",
  title: "Your Year",
  requires: ["your_instagram_activity/messages/inbox/**"],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);

    return {
      status: "ok",
      data: {
        totalInteractions: scoped.length,
        mostActiveMonth: pickMostActive(
          scoped,
          (ts) => utcMonthString(ts),
        ),
        peakDay: pickPeakDay(scoped),
        longestDmStreak: longestDmStreak(scoped),
      },
    };
  },
};

function utcMonthString(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function utcDayString(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the bucket with the highest interaction count, or `null` if input
 * is empty. Tie-breaks pick the bucket encountered first (i.e., earliest in
 * the source order, which after `parseManifest`'s newest-first sort is the
 * most recent bucket).
 */
function pickMostActive(
  interactions: Interaction[],
  bucketFn: (ts: number) => string,
): { label: string; count: number } | null {
  if (interactions.length === 0) return null;
  const counts = new Map<string, number>();
  for (const i of interactions) {
    const key = bucketFn(i.ts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestLabel = "";
  let bestCount = -1;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      bestLabel = label;
      bestCount = count;
    }
  }
  return { label: bestLabel, count: bestCount };
}

function pickPeakDay(
  interactions: Interaction[],
): { date: string; count: number } | null {
  const result = pickMostActive(interactions, utcDayString);
  if (!result) return null;
  return { date: result.label, count: result.count };
}

/**
 * Walks the dm_sent interactions in chronological order and returns the
 * longest run of consecutive UTC days. Returns `{days: 0}` if there are no
 * dm_sent interactions in scope.
 */
function longestDmStreak(
  interactions: Interaction[],
): { days: number; startDay?: string; endDay?: string } {
  // Collect distinct dm_sent days, ascending.
  const days = new Set<string>();
  for (const i of interactions) {
    if (i.kind === "dm_sent") days.add(utcDayString(i.ts));
  }
  if (days.size === 0) return { days: 0 };

  const sorted = Array.from(days).sort();

  let bestLen = 1;
  let bestStart = sorted[0];
  let bestEnd = sorted[0];
  let curLen = 1;
  let curStart = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (isNextDay(sorted[i - 1], sorted[i])) {
      curLen += 1;
    } else {
      curLen = 1;
      curStart = sorted[i];
    }
    if (curLen > bestLen) {
      bestLen = curLen;
      bestStart = curStart;
      bestEnd = sorted[i];
    }
  }

  return { days: bestLen, startDay: bestStart, endDay: bestEnd };
}

/**
 * Returns true if `b` is the calendar day immediately after `a`. Both
 * arguments are UTC `YYYY-MM-DD` strings.
 */
function isNextDay(a: string, b: string): boolean {
  const aDate = new Date(`${a}T00:00:00Z`).getTime();
  const bDate = new Date(`${b}T00:00:00Z`).getTime();
  return bDate - aDate === 86_400_000;
}
