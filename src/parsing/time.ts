/**
 * Normalize Instagram's mixed timestamp formats to Unix seconds.
 *
 * - Most files use `timestamp` in seconds (e.g. 1750014910).
 * - DM messages use `timestamp_ms` in milliseconds (e.g. 1729667182194).
 * - Many `string_map_data` entries have `timestamp: 0` for fields that
 *   carry no time (e.g. "Cookie Name") — those should be treated as missing.
 *
 * Returns `undefined` for unusable inputs (zero, NaN, missing, negative).
 *
 * Heuristic for ms-vs-seconds: any value above ~10^11 (≈ year 5138 in
 * seconds) is assumed to be milliseconds and gets divided by 1000. The
 * `unit` option lets callers force a specific interpretation when known.
 */
export function toUnixSeconds(
  value: number | string | undefined | null,
  options: { unit?: "s" | "ms" } = {},
): number | undefined {
  if (value === undefined || value === null) return undefined;

  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num) || num <= 0) return undefined;

  if (options.unit === "ms") return Math.floor(num / 1000);
  if (options.unit === "s") return Math.floor(num);

  // Auto-detect: anything ≥ 10^11 is interpreted as milliseconds.
  if (num >= 1e11) return Math.floor(num / 1000);
  return Math.floor(num);
}
