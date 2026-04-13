import { create } from "zustand";
import type { ParsedBundle } from "./events";

/**
 * In-memory store for the parsed Instagram export bundle.
 *
 * **Privacy guarantee:** there is **no persistence middleware**, no
 * `localStorage`, no `sessionStorage`, no IndexedDB. Refresh = bundle gone =
 * the user must re-upload. This is the user-visible promise from
 * `CLAUDE.md` § "Core Principles" — anyone can verify it by reading these
 * 30 lines.
 *
 * The store carries everything needed to render `/wrapped`:
 *   - `bundle`     — the normalized event model (interactions, sidecars)
 *   - `paths`      — file path list, used by the module registry's `requires`
 *                    gating (the manifest itself never leaves the worker)
 *   - `fileCount`  — display-only header
 *   - `fileName`   — display-only header
 *
 * The single `setBundle` setter takes all four fields together so callers
 * cannot end up with a half-populated state (e.g. bundle without paths).
 */

type StoreInput = {
  bundle: ParsedBundle;
  paths: string[];
  fileCount: number;
  fileName: string;
};

type StoreState = {
  bundle: ParsedBundle | null;
  paths: string[];
  fileCount: number;
  fileName: string | null;
  setBundle: (input: StoreInput) => void;
  clear: () => void;
};

const INITIAL = {
  bundle: null,
  paths: [],
  fileCount: 0,
  fileName: null,
} satisfies Pick<StoreState, "bundle" | "paths" | "fileCount" | "fileName">;

export const useUploadStore = create<StoreState>((set) => ({
  ...INITIAL,
  setBundle: ({ bundle, paths, fileCount, fileName }) =>
    set({ bundle, paths, fileCount, fileName }),
  clear: () => set(INITIAL),
}));
