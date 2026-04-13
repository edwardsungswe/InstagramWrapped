/**
 * Types for the Phase 6 story-card deck.
 *
 * A `Card` is a thin envelope around a `ModuleRun` that adds presentation
 * metadata (background gradient, display order). Each card component knows
 * its own module ID and casts `card.run.result.data` to its typed shape.
 *
 * Cards are produced by `buildDeck.ts` from the registry's `ModuleRun[]` —
 * filtered for `ok` status, suppressed if their data is empty, and ordered
 * for the deck's narrative arc.
 */

import type { ModuleRun } from "@/modules";

export type CardId =
  | "year-summary"
  | "timeline-evolution"
  | "top-people"
  | "relationship-insights"
  | "personality-type"
  | "red-flags"
  | "green-flags"
  | "content-categories"
  | "device-locations"
  | "ad-personality"
  | "activity-heatmap";

export type Card = {
  id: CardId;
  /** The module run that produced the card's data. */
  run: ModuleRun;
  /** Tailwind background classes for the full-bleed card. */
  bg: string;
};
