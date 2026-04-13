import type { Interaction } from "@/model/events";
import type { TimeScope } from "./types";

/**
 * Filters an interaction list by time scope. The all-time scope returns the
 * input array as-is (same reference, no copy).
 *
 * Year boundaries are computed in **UTC** so two users in different
 * timezones see the same set of interactions for "2025". The Instagram
 * export uses Unix-second timestamps; we convert to a `Date` and compare
 * `getUTCFullYear()`.
 */
export function filterByScope(
  interactions: Interaction[],
  scope: TimeScope,
): Interaction[] {
  if (scope.kind === "all") return interactions;
  return interactions.filter(
    (i) => new Date(i.ts * 1000).getUTCFullYear() === scope.year,
  );
}

/**
 * Returns the distinct calendar years (UTC) present in an interaction list,
 * sorted newest-first. Used by the year picker UI in Phase 4 so it only
 * offers years the user actually has data for.
 */
export function availableYears(interactions: Interaction[]): number[] {
  const years = new Set<number>();
  for (const i of interactions) {
    years.add(new Date(i.ts * 1000).getUTCFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Validates a `?year=` URL parameter against the years actually present in
 * the parsed bundle. Stale or malformed values fall back to all-time
 * gracefully — better to show too much data than to crash on a bad URL.
 *
 * Used by `/wrapped` and `/wrapped/cards` to derive a `TimeScope` from the
 * query string.
 */
export function parseScope(
  yearParam: string | null,
  available: number[],
): TimeScope {
  if (!yearParam) return { kind: "all" };
  const year = Number(yearParam);
  if (!Number.isFinite(year) || !available.includes(year)) {
    return { kind: "all" };
  }
  return { kind: "year", year };
}
