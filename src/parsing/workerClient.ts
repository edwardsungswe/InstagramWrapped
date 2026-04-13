import type { ExtractionResult } from "./types";

/**
 * Main-thread wrapper around the parsing worker. Each call spins up a fresh
 * worker, posts the file, and resolves with the result. The worker is
 * terminated as soon as the result is in to free memory and to guarantee no
 * lingering reference to the user's data.
 *
 * The worker is loaded from `/worker.js` (a stable URL under `public/`),
 * which is pre-bundled by `scripts/build-worker.mjs` via esbuild. This sits
 * outside Next.js / Turbopack's worker bundling pipeline because Turbopack's
 * static export currently publishes worker source files as raw assets rather
 * than producing runnable JS.
 */
export function runExtraction(file: File | Blob): Promise<ExtractionResult> {
  return new Promise((resolve) => {
    const worker = new Worker("/worker.js", { type: "module" });

    const finish = (result: ExtractionResult) => {
      worker.terminate();
      resolve(result);
    };

    worker.onmessage = (event: MessageEvent<ExtractionResult>) => {
      finish(event.data);
    };

    worker.onerror = (event) => {
      finish({
        status: "error",
        message: event.message || "Unknown worker error",
      });
    };

    worker.postMessage(file);
  });
}
