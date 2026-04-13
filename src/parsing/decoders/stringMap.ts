/**
 * Generic decoder for Instagram's recurring "string_map_data" / "string_list_data"
 * shape. Two top-level layouts exist in the wild:
 *
 *   Layout B1 (named-array wrapper):
 *     { "relationships_following": [ <item>, <item>, ... ] }
 *
 *   Layout B2 (array at root):
 *     [ <item>, <item>, ... ]                       // followers_*.json, post_comments_*.json
 *
 * Items themselves come in two variants:
 *
 *   Variant 1 — string_map_data (object of named fields):
 *     { "title": "...", "string_map_data": {
 *         "Comment": { "value": "fuckass cat" },
 *         "Time":    { "timestamp": 1773648225 }
 *       } }
 *
 *   Variant 2 — string_list_data (array of one or more entries):
 *     { "title": "poongzwa", "string_list_data": [
 *         { "href": "https://...", "value": "poongzwa", "timestamp": 1756201377 }
 *       ] }
 *
 * The decoder normalizes both variants to a uniform `StringMapItem` shape so
 * projections never have to branch on layout.
 */

export type StringMapField = {
  value?: string;
  href?: string;
  /** Unix seconds — Instagram uses 0 for "no timestamp"; projections must
   *  treat zero as missing via `toUnixSeconds`. */
  timestamp?: number;
};

export type StringMapItem = {
  /** Top-level title field, often a username or "Profile Change". */
  title?: string;
  /** Named fields from `string_map_data`, normalized. */
  fields: Record<string, StringMapField>;
  /** Each entry from `string_list_data`, normalized. The first entry is
   *  almost always the "primary" payload; some files have multiple. */
  list: StringMapField[];
  /** Pass-through to the original raw item for projections that need it. */
  raw: unknown;
};

/**
 * Returns the array of items at the top level of a string-map file.
 *
 * Handles both the wrapped (`{ key: [...] }`) and bare (`[...]`) layouts.
 * Returns an empty array if neither shape applies.
 */
export function asStringMapArray(input: unknown): StringMapItem[] {
  if (Array.isArray(input)) {
    return input.map(normalizeItem);
  }
  if (input && typeof input === "object") {
    for (const v of Object.values(input as Record<string, unknown>)) {
      if (Array.isArray(v)) return v.map(normalizeItem);
    }
  }
  return [];
}

function normalizeItem(raw: unknown): StringMapItem {
  if (!raw || typeof raw !== "object") {
    return { fields: {}, list: [], raw };
  }
  const item = raw as {
    title?: unknown;
    string_map_data?: Record<string, unknown>;
    string_list_data?: unknown;
  };
  return {
    title: typeof item.title === "string" ? item.title : undefined,
    fields: normalizeFields(item.string_map_data),
    list: normalizeList(item.string_list_data),
    raw,
  };
}

function normalizeFields(
  input: Record<string, unknown> | undefined,
): Record<string, StringMapField> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, StringMapField> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === "object") {
      const v = value as StringMapField;
      out[key] = {
        value: typeof v.value === "string" ? v.value : undefined,
        href: typeof v.href === "string" ? v.href : undefined,
        timestamp: typeof v.timestamp === "number" ? v.timestamp : undefined,
      };
    }
  }
  return out;
}

function normalizeList(input: unknown): StringMapField[] {
  if (!Array.isArray(input)) return [];
  const out: StringMapField[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as StringMapField;
    out.push({
      value: typeof e.value === "string" ? e.value : undefined,
      href: typeof e.href === "string" ? e.href : undefined,
      timestamp: typeof e.timestamp === "number" ? e.timestamp : undefined,
    });
  }
  return out;
}

/**
 * Reads a single named field's `value`, returning undefined if missing.
 * Convenience wrapper used by projections.
 */
export function fieldValue(
  item: StringMapItem,
  name: string,
): string | undefined {
  return item.fields[name]?.value;
}

/**
 * Reads a single named field's `timestamp`. Returns undefined if missing or
 * zero. Use `toUnixSeconds` from `time.ts` to normalize the result if needed.
 */
export function fieldTimestamp(
  item: StringMapItem,
  name: string,
): number | undefined {
  const ts = item.fields[name]?.timestamp;
  if (typeof ts !== "number" || ts <= 0) return undefined;
  return ts;
}
