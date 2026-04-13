import { promises as fs } from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";

const REPO_ROOT = process.cwd();
const CACHE_PATH = path.join(REPO_ROOT, "tests", ".cache", "real-export.zip");
const FIXTURE_DIR = path.join(REPO_ROOT, "tests", "fixtures", "personal-account-1");

// Recursively walks rootDir and returns a JSZip blob containing every file.
export async function zipFromDir(rootDir: string): Promise<Blob> {
  const zip = new JSZip();
  await addDir(zip, rootDir, "");
  const buf = await zip.generateAsync({
    type: "uint8array",
    compression: "STORE",
  });
  return new Blob([new Uint8Array(buf)]);
}

async function addDir(
  zip: JSZip,
  absDir: string,
  relPrefix: string,
): Promise<void> {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
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

// Resolves the best available export directory:
//   1. Real Instagram export (instagram-... directories) - richest data
//   2. Committed anonymized fixture - for CI
// Returns undefined if neither exists.
export async function findExportDir(): Promise<string | undefined> {
  const entries = await fs.readdir(REPO_ROOT, { withFileTypes: true });
  const real = entries.find(
    (e) => e.isDirectory() && e.name.startsWith("instagram-"),
  );
  if (real) return path.join(REPO_ROOT, real.name);

  try {
    await fs.access(FIXTURE_DIR);
    return FIXTURE_DIR;
  } catch {
    return undefined;
  }
}

export const findRealExportDir = findExportDir;

// Returns a Blob of the Instagram export ZIP, using a disk cache.
// Tries: cache -> real export -> committed fixture -> error.
export async function loadRealExportZip(): Promise<Blob> {
  try {
    const buf = await fs.readFile(CACHE_PATH);
    return new Blob([new Uint8Array(buf)]);
  } catch {
    // Cache miss
  }

  const dir = await findExportDir();
  if (!dir) {
    throw new Error(
      "No Instagram export found. Place your real export in the repo root " +
        "or run 'npx tsx tests/anonymize.ts' to generate the committed fixture.",
    );
  }

  const blob = await zipFromDir(dir);
  const arr = await blob.arrayBuffer();
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, Buffer.from(arr));
  await fs.rename(tmp, CACHE_PATH).catch(() => {});
  return blob;
}
