import JSZip, { type JSZipObject } from "jszip";
import { fixMojibakeDeep, fixMojibake } from "./mojibake";
import { matches } from "./glob";
import type { FileManifest } from "./types";

/**
 * Loads an Instagram export ZIP into a lazy file manifest.
 *
 * Files are *not* read or parsed up-front — only their paths are listed.
 * Individual files are loaded on demand via `manifest.readJson` /
 * `manifest.readText`. This keeps memory bounded for large exports
 * (the user's real export already has 100+ JSON files plus media).
 *
 * Strips one common wrapper: many Instagram exports nest the entire archive
 * under a single root folder named like the export ID (e.g.
 * `instagram-username-2026-04-09-abc/`). When the ZIP has exactly one such
 * top-level folder, we strip it from every path so callers can use stable,
 * predictable paths like `your_instagram_activity/likes/liked_posts.json`.
 */
export async function extractZip(blob: Blob): Promise<FileManifest> {
  const zip = await JSZip.loadAsync(blob);

  const fileEntries: Array<{ path: string; obj: JSZipObject }> = [];
  zip.forEach((relativePath, obj) => {
    if (obj.dir) return;
    // macOS Finder adds __MACOSX/ metadata entries when creating ZIPs.
    // Filter them out — they're not data files and they break the
    // detectRootPrefix logic (which expects all paths to share a common
    // root folder when a wrapper directory is present).
    if (relativePath.startsWith("__MACOSX/") || relativePath.includes("/__MACOSX/")) return;
    fileEntries.push({ path: relativePath, obj });
  });

  const stripPrefix = detectRootPrefix(fileEntries.map((f) => f.path));
  const byPath = new Map<string, JSZipObject>();
  for (const { path, obj } of fileEntries) {
    const normalized = stripPrefix
      ? path.slice(stripPrefix.length)
      : path;
    if (!normalized) continue;
    byPath.set(normalized, obj);
  }

  const paths = Array.from(byPath.keys()).sort();

  return {
    paths,

    has(pattern: string) {
      for (const p of paths) {
        if (matches(p, pattern)) return true;
      }
      return false;
    },

    async readText(path: string) {
      const obj = byPath.get(path);
      if (!obj) return undefined;
      const raw = await obj.async("string");
      return fixMojibake(raw);
    },

    async readJson<T = unknown>(path: string) {
      const obj = byPath.get(path);
      if (!obj) return undefined;
      try {
        const raw = await obj.async("string");
        const parsed = JSON.parse(raw) as unknown;
        return fixMojibakeDeep(parsed) as T;
      } catch {
        return undefined;
      }
    },
  };
}

/**
 * Known canonical top-level directories inside an Instagram export. If the
 * archive's first path segment is one of these, we know we're already at the
 * right root and must NOT strip it.
 */
const KNOWN_TOP_LEVELS = new Set([
  "your_instagram_activity",
  "connections",
  "personal_information",
  "ads_information",
  "media",
  "preferences",
  "security_and_login_information",
  "apps_and_websites_off_of_instagram",
  "logged_information",
]);

/**
 * If every path in the archive shares a single top-level directory AND that
 * directory is *not* a recognized Instagram export folder, return that prefix
 * (with trailing slash) so callers can strip it. Otherwise return `undefined`.
 *
 * This handles the common case where the user re-zips their downloaded folder
 * (e.g. `instagram-username-2026-04-09-abc/`) without false-stripping a
 * legitimate sibling-less folder like `personal_information/`.
 */
function detectRootPrefix(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  const firstSlash = paths[0].indexOf("/");
  if (firstSlash === -1) return undefined;
  const candidate = paths[0].slice(0, firstSlash);
  if (KNOWN_TOP_LEVELS.has(candidate)) return undefined;
  const candidateWithSlash = candidate + "/";
  for (const p of paths) {
    if (!p.startsWith(candidateWithSlash)) return undefined;
  }
  return candidateWithSlash;
}
