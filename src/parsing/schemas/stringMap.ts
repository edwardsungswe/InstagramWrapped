import { z } from "zod";

/**
 * Lightweight Zod schema for the `string_map_data` / `string_list_data`
 * shape. Mirrors the same boundary-only philosophy as labelValues.ts —
 * projections do the deep validation themselves.
 */

const stringMapItem = z.object({}).passthrough();
const stringMapArray = z.array(stringMapItem);
const stringMapObject = z.object({}).passthrough();

export const stringMapFile = z.union([stringMapArray, stringMapObject]);

export type StringMapFile = z.infer<typeof stringMapFile>;
