import { matches } from "@/parsing/glob";
import type { ParsedBundle } from "@/model/events";
import type { InsightModule, ModuleRun, TimeScope } from "./types";

/**
 * Runs every module in `modules` against the given bundle and time scope.
 *
 * Per-module behavior:
 *
 *   1. **Gating**: every pattern in `module.requires` must match at least one
 *      path in `paths`. If any required pattern is unmet, the module is
 *      skipped with a "missing required source(s): …" reason.
 *
 *   2. **Execution**: the module's `run` is called with `{bundle, scope}`.
 *      Whatever it returns is passed through to the caller.
 *
 *   3. **Error catch**: thrown errors are converted to
 *      `{status: "error", error: …}`. A buggy module never crashes the page.
 *
 * `optional` patterns are NOT gated — they exist purely for documentation
 * and for the future Phase 7 unknown-files debug panel.
 */
export function runRegistry(
  bundle: ParsedBundle,
  paths: string[],
  scope: TimeScope,
  modules: InsightModule[],
): ModuleRun[] {
  return modules.map((module) => {
    const missing = module.requires.filter(
      (pattern) => !paths.some((p) => matches(p, pattern)),
    );
    if (missing.length > 0) {
      return {
        module,
        result: {
          status: "skipped",
          reason: `Missing required source(s): ${missing.join(", ")}`,
        },
      };
    }

    try {
      return { module, result: module.run({ bundle, scope }) };
    } catch (err) {
      return {
        module,
        result: {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
  });
}
