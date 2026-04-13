/**
 * Module registry types. The registry runs an array of `InsightModule`s
 * against a parsed bundle and reports per-module results. Phase 3 ships the
 * plumbing; Phase 5 swaps stub `run` functions for real implementations.
 */

import type { ParsedBundle } from "@/model/events";

/**
 * Time scope passed to every module's `run`. Modules use this to filter
 * `bundle.interactions` (or any other timed data) to a single calendar year
 * or to the full export history.
 */
export type TimeScope = { kind: "all" } | { kind: "year"; year: number };

/**
 * Result of running a single module. The discriminated union forces consumers
 * (UI, tests) to handle every state explicitly.
 */
export type ModuleResult<T> =
  | { status: "ok"; data: T }
  | { status: "skipped"; reason: string }
  | { status: "error"; error: string };

/**
 * Definition of a single insight module.
 *
 * - `id`: stable kebab-case identifier; never change after the module ships.
 * - `title`: human-readable name shown in the UI.
 * - `requires`: glob patterns (see `src/parsing/glob.ts`) that must match at
 *   least one path in the manifest. The registry skips the module with a
 *   "missing required source(s)" reason if any pattern matches nothing.
 * - `optional`: glob patterns the module would prefer but can degrade
 *   without. Informational only — Phase 3's registry does not gate on these.
 * - `run`: the synchronous worker that produces the module's data. The
 *   registry catches thrown errors per-module so a buggy module never crashes
 *   the page.
 */
export type InsightModule<T = unknown> = {
  id: string;
  title: string;
  requires: string[];
  optional?: string[];
  run: (input: { bundle: ParsedBundle; scope: TimeScope }) => ModuleResult<T>;
};

/**
 * One row of the registry's output: the module that was run, plus its result.
 * The UI iterates over an array of these to render status pills.
 */
export type ModuleRun = {
  module: InsightModule;
  result: ModuleResult<unknown>;
};
