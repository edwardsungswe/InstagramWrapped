/**
 * Generic decoder for Instagram's recurring "label_values" shape:
 *
 *   [
 *     {
 *       "timestamp": 1750014910,
 *       "fbid": "...",
 *       "label_values": [
 *         { "label": "URL", "value": "...", "href": "..." },
 *         {
 *           "title": "Owner",
 *           "dict": [{ "dict": [{ "label": "Username", "value": "..." }] }]
 *         },
 *         { "label": "Categories", "vec": [{ "value": "x" }, { "value": "y" }] }
 *       ]
 *     }
 *   ]
 *
 * Used by liked_posts, liked_comments (variant), posts_viewed, videos_watched,
 * ads_viewed, story_likes, suggested_profiles_viewed, etc.
 *
 * The decoder is intentionally lenient: every field is optional. Projections
 * pluck what they need via the helpers below.
 */

export type LabelValueLeaf = {
  label?: string;
  value?: string;
  href?: string;
  title?: string;
  dict?: LabelValueLeaf[];
  vec?: LabelValueLeaf[];
  // Tolerate any other field — Instagram adds new ones over time.
  [key: string]: unknown;
};

export type LabelValuesItem = {
  timestamp?: number;
  fbid?: string;
  label_values?: LabelValueLeaf[];
  // Some files use a top-level `label_values` directly with no per-item wrapper.
  // Others have a `media` field. Pass-through everything.
  [key: string]: unknown;
};

/**
 * Returns the array of items at the top level of a label_values file.
 *
 * Most files are arrays at root. A few are objects whose first array-valued
 * key is the items list. Returns an empty array if neither shape applies.
 */
export function asLabelValuesArray(input: unknown): LabelValuesItem[] {
  if (Array.isArray(input)) return input as LabelValuesItem[];
  if (input && typeof input === "object") {
    for (const v of Object.values(input as Record<string, unknown>)) {
      if (Array.isArray(v)) return v as LabelValuesItem[];
    }
  }
  return [];
}

/**
 * Recursively walks a label_values entry (or any sub-tree of nested dicts)
 * looking for a leaf with the given `label`. Returns its `value`, if any.
 *
 * Used by projections to grab arbitrary fields without caring about exact
 * nesting depth.
 */
export function findLabel(
  nodes: LabelValueLeaf[] | undefined,
  label: string,
): string | undefined {
  if (!nodes) return undefined;
  for (const node of nodes) {
    if (node?.label === label && typeof node.value === "string") {
      return node.value;
    }
    if (node?.dict) {
      const found = findLabel(node.dict, label);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Looks for the `{ title: "Owner", dict: [...] }` block and returns the
 * username inside it (the post/story author the user interacted with).
 */
export function extractOwnerHandle(
  item: LabelValuesItem,
): string | undefined {
  const block = item.label_values?.find(
    (n) => n?.title === "Owner" && Array.isArray(n.dict),
  );
  if (!block) return undefined;
  return findLabel(block.dict, "Username");
}

/**
 * Returns the first `URL`-labeled value in the item — usually the canonical
 * link to the post/reel/story the interaction is about.
 */
export function extractUrl(item: LabelValuesItem): string | undefined {
  const url = findLabel(item.label_values, "URL");
  if (!url) return undefined;
  // Skip the empty Owner.URL field that some entries inherit.
  return url.length > 0 ? url : undefined;
}

/**
 * Pulls every `value` from a `vec` array under the given label.
 * Used by `other_categories_used_to_reach_you.json` and friends.
 */
export function extractVecValues(
  item: LabelValuesItem,
  label: string,
): string[] {
  const node = item.label_values?.find(
    (n) => n?.label === label && Array.isArray(n.vec),
  );
  if (!node?.vec) return [];
  return node.vec
    .map((v) => v?.value)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}
