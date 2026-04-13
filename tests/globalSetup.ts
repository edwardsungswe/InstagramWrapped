import { promises as fs } from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";

// Vitest global setup: build the export ZIP once before any test runs,
// caching it to tests/.cache/real-export.zip.
//
// Tries the real export first (instagram-... directories), falls back to the
// committed fixture at tests/fixtures/personal-account-1. Skips if neither.
export default async function setup() {
  const repoRoot = process.cwd();
  const cachePath = path.join(repoRoot, "tests", ".cache", "real-export.zip");

  try {
    await fs.access(cachePath);
    return; // Cache already exists.
  } catch {
    // Cache miss — build it.
  }

  const exportDir = await findExportDir(repoRoot);
  if (!exportDir) return; // No source available — tests will handle this.

  const zip = new JSZip();
  await addDir(zip, exportDir, "");
  const buf = await zip.generateAsync({
    type: "uint8array",
    compression: "STORE",
  });

  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, Buffer.from(buf));
}

async function findExportDir(repoRoot: string): Promise<string | undefined> {
  // Try the real export first.
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  const real = entries.find(
    (e) => e.isDirectory() && e.name.startsWith("instagram-"),
  );
  if (real) return path.join(repoRoot, real.name);

  // Fall back to the committed fixture.
  const fixtureDir = path.join(repoRoot, "tests", "fixtures", "personal-account-1");
  try {
    await fs.access(fixtureDir);
    return fixtureDir;
  } catch {
    return undefined;
  }
}

async function addDir(
  zip: JSZip,
  absDir: string,
  relPrefix: string,
): Promise<void> {
  const dirEntries = await fs.readdir(absDir, { withFileTypes: true });
  for (const entry of dirEntries) {
    if (entry.name === ".DS_Store") continue;
    const absPath = path.join(absDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDir(zip, absPath, relPath);
    } else if (entry.isFile()) {
      const data = await fs.readFile(absPath);
      zip.file(relPath, data);
    }
  }
}
