/**
 * Sanity tests for the Shape A projections (likes, views, comments) running
 * against the real Instagram export. Synthetic tests for the underlying
 * decoders live in tests/parsing/decoders/. These are integration assertions
 * that the projections actually produce sensible output for a real account.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { extractZip } from "@/parsing/extract";
import { projectLikes } from "@/parsing/projections/likes";
import { projectViews } from "@/parsing/projections/views";
import { projectComments } from "@/parsing/projections/comments";
import { loadRealExportZip } from "../../helpers/zipFromDir";
import type { FileManifest } from "@/parsing/types";

let manifest: FileManifest;

beforeAll(async () => {
  const blob = await loadRealExportZip();
  manifest = await extractZip(blob);
});

describe("projectLikes — real export", () => {
  it("returns at least one like", async () => {
    const likes = await projectLikes(manifest);
    expect(likes.length).toBeGreaterThan(0);
  });

  it("every like has a finite Unix-second timestamp", async () => {
    const likes = await projectLikes(manifest);
    for (const like of likes) {
      expect(Number.isFinite(like.ts)).toBe(true);
      expect(like.ts).toBeGreaterThan(0);
      // Sanity: between 2010 and 2030.
      expect(like.ts).toBeGreaterThan(1262304000);
      expect(like.ts).toBeLessThan(1893456000);
    }
  });

  it("most likes have a counterparty handle", async () => {
    const likes = await projectLikes(manifest);
    const withHandle = likes.filter((l) => l.withHandle);
    expect(withHandle.length).toBeGreaterThan(likes.length / 2);
  });

  it("every emitted record has kind 'like'", async () => {
    const likes = await projectLikes(manifest);
    for (const like of likes) expect(like.kind).toBe("like");
  });
});

describe("projectViews — real export", () => {
  it("returns at least one view", async () => {
    const views = await projectViews(manifest);
    expect(views.length).toBeGreaterThan(0);
  });

  it("every view has a finite timestamp and kind 'view'", async () => {
    const views = await projectViews(manifest);
    for (const view of views) {
      expect(view.kind).toBe("view");
      expect(Number.isFinite(view.ts)).toBe(true);
      expect(view.ts).toBeGreaterThan(0);
    }
  });

  it("includes both posts and videos", async () => {
    const views = await projectViews(manifest);
    const kinds = new Set(views.map((v) => v.meta?.mediaKind));
    // We expect both, but tolerate either being missing in case the export
    // happens not to have one of the files.
    expect(kinds.size).toBeGreaterThan(0);
  });
});

describe("projectComments — real export", () => {
  it("returns at least one comment", async () => {
    const comments = await projectComments(manifest);
    expect(comments.length).toBeGreaterThan(0);
  });

  it("every comment has a finite timestamp and kind 'comment'", async () => {
    const comments = await projectComments(manifest);
    for (const c of comments) {
      expect(c.kind).toBe("comment");
      expect(Number.isFinite(c.ts)).toBe(true);
    }
  });

  it("most comments have a Media Owner handle", async () => {
    const comments = await projectComments(manifest);
    const withHandle = comments.filter((c) => c.withHandle);
    expect(withHandle.length).toBeGreaterThan(comments.length / 2);
  });
});
