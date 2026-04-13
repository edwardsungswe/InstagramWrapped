/**
 * Live registry of insight modules. The upload page (and `/wrapped` in
 * Phase 4) iterates this array to render the per-module status pills.
 *
 * Adding a new module:
 *   1. Drop a file into `src/modules/stubs/` (Phase 3) or top-level
 *      `src/modules/` (Phase 5+).
 *   2. Append it to `REGISTERED` below.
 *   3. The registry runner picks it up automatically — no other wiring.
 *
 * The order here is the order users see modules in the UI.
 *
 * --
 *
 * Deferred to Phase 7: an "unknown files" debug panel that diffs
 * `manifest.paths` against the union of every registered module's
 * `requires` + `optional` patterns. The infrastructure is already in
 * place — the registry already passes `paths` and patterns are static
 * data — but the panel only produces signal once the modules' `requires`
 * lists are non-trivial (currently they're empty stubs). Revisit in
 * Phase 7 alongside the high-value modules.
 */

import type { InsightModule } from "./types";
import { topPeople } from "./topPeople";
import { activityHeatmap } from "./activityHeatmap";
import { personalityType } from "./personalityType";
import { yearSummary } from "./yearSummary";
import { relationshipInsights } from "./relationshipInsights";
import { contentCategories } from "./contentCategories";
import { adPersonality } from "./adPersonality";
import { redFlags } from "./redFlags";
import { greenFlags } from "./greenFlags";
import { timelineEvolution } from "./timelineEvolution";
import { deviceLocations } from "./deviceLocations";

/**
 * Registry order = card display order. Mirrors `src/cards/buildDeck.ts:ORDER`.
 * The deck builder respects this same canonical order regardless of input.
 */
export const REGISTERED: InsightModule[] = [
  yearSummary,
  timelineEvolution,
  topPeople,
  relationshipInsights,
  personalityType,
  redFlags,
  greenFlags,
  contentCategories,
  deviceLocations,
  adPersonality,
  activityHeatmap,
];

export type { InsightModule, ModuleResult, ModuleRun, TimeScope } from "./types";
export { runRegistry } from "./registry";
export { filterByScope, availableYears, parseScope } from "./scope";
