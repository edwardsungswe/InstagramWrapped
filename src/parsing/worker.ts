/// <reference lib="webworker" />

import { extractZip } from "./extract";
import { parseManifest } from "./parse";
import type { ExtractionResult } from "./types";

declare const self: DedicatedWorkerGlobalScope;

/**
 * Web worker entry. Receives a `File` (or `Blob`) over postMessage, runs the
 * full parsing pipeline off the main thread, and posts back an
 * `ExtractionResult` carrying the normalized bundle. Errors are caught and
 * converted to an error envelope so the main thread can render them.
 */
self.onmessage = async (event: MessageEvent<File | Blob>) => {
  const blob = event.data;
  try {
    const manifest = await extractZip(blob);
    const bundle = await parseManifest(manifest);
    const result: ExtractionResult = {
      status: "ok",
      fileCount: manifest.paths.length,
      accountType: bundle.account.type,
      paths: manifest.paths,
      bundle,
    };
    self.postMessage(result);
  } catch (err) {
    const result: ExtractionResult = {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(result);
  }
};
