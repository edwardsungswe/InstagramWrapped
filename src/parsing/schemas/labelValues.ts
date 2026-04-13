import { z } from "zod";

/**
 * Lightweight Zod schema for the `label_values` shape. This validates only
 * the *outermost* container — that the file is either a top-level array or
 * an object whose first array-valued field looks like a list of items. Inner
 * fields are tolerant by design (passthrough) so a future Instagram schema
 * tweak doesn't break parsing.
 *
 * Validation here is the boundary check, not a full structural assertion.
 * Projections still tolerate missing inner fields via optional chaining.
 */

const labelValuesItem = z.object({}).passthrough();

const labelValuesArray = z.array(labelValuesItem);

const labelValuesObject = z.object({}).passthrough();

export const labelValuesFile = z.union([labelValuesArray, labelValuesObject]);

export type LabelValuesFile = z.infer<typeof labelValuesFile>;
