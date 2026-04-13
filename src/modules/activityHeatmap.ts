import { filterByScope } from "./scope";
import type { InsightModule } from "./types";

/**
 * Per-day interaction counts for the GitHub-contributions-style heatmap.
 *
 * The module returns a sparse list — only days with > 0 activity. The visual
 * grid component (Phase 8) is responsible for filling in the gaps. Returning
 * a sparse list keeps the payload small for users with multi-year exports
 * (one day per active day, not 365 per year).
 *
 * Days are bucketed by **UTC** date (`YYYY-MM-DD`). Two users in different
 * timezones see the same buckets — see `scope.ts` for the same trade-off.
 */

export type HeatmapDay = { day: string; count: number };

export type ActivityHeatmapResult = {
  /** Sorted oldest → newest, only days with activity. */
  days: HeatmapDay[];
  /** Highest single-day count, useful for color scaling. */
  maxCount: number;
  /** Sum of all per-day counts. */
  totalCount: number;
  /** First day with any activity, ISO `YYYY-MM-DD`. */
  startDay?: string;
  /** Last day with any activity. */
  endDay?: string;
  /** Number of distinct days with activity (= `days.length`). */
  activeDayCount: number;
};

export const activityHeatmap: InsightModule<ActivityHeatmapResult> = {
  id: "activity-heatmap",
  title: "Activity Heatmap",
  requires: ["your_instagram_activity/messages/inbox/**"],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);
    const counts = new Map<string, number>();

    for (const i of scoped) {
      const day = utcDayString(i.ts);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    const days: HeatmapDay[] = Array.from(counts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

    let maxCount = 0;
    let totalCount = 0;
    for (const d of days) {
      if (d.count > maxCount) maxCount = d.count;
      totalCount += d.count;
    }

    return {
      status: "ok",
      data: {
        days,
        maxCount,
        totalCount,
        startDay: days[0]?.day,
        endDay: days[days.length - 1]?.day,
        activeDayCount: days.length,
      },
    };
  },
};

/**
 * Converts a unix-second timestamp to a UTC `YYYY-MM-DD` string. Avoids
 * `toISOString().slice(0, 10)` because it would re-parse the timestamp into
 * a Date and back; the manual approach is faster on large interaction lists.
 */
function utcDayString(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
