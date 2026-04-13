// Bundles src/parsing/worker.ts into public/worker.js so the browser can
// load it as a Web Worker via `new Worker("/worker.js", { type: "module" })`.
//
// This bypasses Next.js / Turbopack's worker bundling, which currently
// publishes the source TS file as an asset rather than producing a runnable
// JS bundle for static export builds. esbuild handles the entire dependency
// graph (extract.ts, parse.ts, all projections, jszip, zod) into one file.

import esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const result = await esbuild.build({
  entryPoints: [resolve(repoRoot, "src/parsing/worker.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  outfile: resolve(repoRoot, "public/worker.js"),
  sourcemap: false,
  minify: process.env.NODE_ENV === "production",
  // Mirror the @/* path alias from tsconfig.json so worker code can use it.
  alias: {
    "@": resolve(repoRoot, "src"),
  },
  logLevel: "info",
});

if (result.errors.length > 0) {
  process.exit(1);
}
