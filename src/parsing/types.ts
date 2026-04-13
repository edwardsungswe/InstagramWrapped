/**
 * Types shared by the parsing layer. Kept here so they can be imported from
 * both the main thread and the worker without pulling JSZip into the main
 * thread bundle.
 */

import type { ParsedBundle } from "@/model/events";

export type AccountType = "personal" | "creator" | "business";

/**
 * A lazily-readable view over the contents of an Instagram export ZIP.
 *
 * - `paths` lists every file path in the archive (no directories).
 * - `has(pattern)` answers capability checks via the tiny glob matcher.
 * - `readJson(path)` reads a single file, parses it as JSON, and applies
 *   the mojibake fix-up to every string value. Returns `undefined` if the
 *   file is missing or unparseable.
 * - `readText(path)` reads a single file as UTF-8 text (mojibake-fixed).
 */
export type FileManifest = {
  paths: string[];
  has(pattern: string): boolean;
  readJson<T = unknown>(path: string): Promise<T | undefined>;
  readText(path: string): Promise<string | undefined>;
};

/**
 * The worker → main-thread message shape. Carries the full parsed bundle so
 * the main thread can render insights without re-parsing.
 *
 * `accountType` is duplicated from `bundle.account.type` for convenience —
 * the upload page reads it without having to dereference the bundle.
 *
 * `paths` is the list of every file path in the manifest. The module
 * registry uses it to evaluate `requires` glob patterns (the manifest itself
 * lives only inside the worker and is not transferable).
 */
export type ExtractionOk = {
  status: "ok";
  fileCount: number;
  accountType: AccountType;
  paths: string[];
  bundle: ParsedBundle;
};

export type ExtractionError = {
  status: "error";
  message: string;
};

export type ExtractionResult = ExtractionOk | ExtractionError;
