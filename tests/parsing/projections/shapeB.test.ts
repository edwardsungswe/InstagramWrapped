/**
 * Integration tests for the Shape B projections (follows, saves, searches,
 * storyLikes, profileChanges, logins) running against the real Instagram
 * export. Synthetic decoder tests live in tests/parsing/decoders/.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { extractZip } from "@/parsing/extract";
import { projectFollows } from "@/parsing/projections/follows";
import { projectSaves } from "@/parsing/projections/saves";
import { projectSearches } from "@/parsing/projections/searches";
import { projectStoryLikes } from "@/parsing/projections/storyLikes";
import { projectProfileChanges } from "@/parsing/projections/profileChanges";
import { projectLogins } from "@/parsing/projections/logins";
import { loadRealExportZip } from "../../helpers/zipFromDir";
import type { FileManifest } from "@/parsing/types";

let manifest: FileManifest;

beforeAll(async () => {
  const blob = await loadRealExportZip();
  manifest = await extractZip(blob);
});

describe("projectFollows — real export", () => {
  it("returns at least one follow", async () => {
    const follows = await projectFollows(manifest);
    expect(follows.length).toBeGreaterThan(0);
  });

  it("includes both directions if both files are present", async () => {
    const follows = await projectFollows(manifest);
    const directions = new Set(follows.map((f) => f.meta?.direction));
    expect(directions.has("following")).toBe(true);
    expect(directions.has("follower")).toBe(true);
  });

  it("every follow has a username and finite timestamp", async () => {
    const follows = await projectFollows(manifest);
    for (const f of follows) {
      expect(f.kind).toBe("follow");
      expect(f.withHandle).toBeTruthy();
      expect(Number.isFinite(f.ts)).toBe(true);
    }
  });
});

describe("projectSaves — real export", () => {
  it("returns at least one save", async () => {
    const saves = await projectSaves(manifest);
    expect(saves.length).toBeGreaterThan(0);
  });

  it("every save has kind 'save' and a finite timestamp", async () => {
    const saves = await projectSaves(manifest);
    for (const s of saves) {
      expect(s.kind).toBe("save");
      expect(Number.isFinite(s.ts)).toBe(true);
    }
  });
});

describe("projectSearches — real export", () => {
  it("returns at least one search", async () => {
    const searches = await projectSearches(manifest);
    expect(searches.length).toBeGreaterThan(0);
  });

  it("every search has a username and finite timestamp", async () => {
    const searches = await projectSearches(manifest);
    for (const s of searches) {
      expect(s.kind).toBe("search");
      expect(s.withHandle).toBeTruthy();
      expect(Number.isFinite(s.ts)).toBe(true);
    }
  });
});

describe("projectStoryLikes — real export", () => {
  it("returns at least one story like", async () => {
    const likes = await projectStoryLikes(manifest);
    expect(likes.length).toBeGreaterThan(0);
  });

  it("every story like has kind 'story_like'", async () => {
    const likes = await projectStoryLikes(manifest);
    for (const l of likes) expect(l.kind).toBe("story_like");
  });
});

describe("projectProfileChanges — real export", () => {
  it("returns at least one profile change", async () => {
    const changes = await projectProfileChanges(manifest);
    expect(changes.length).toBeGreaterThan(0);
  });

  it("every change has a field name and finite timestamp", async () => {
    const changes = await projectProfileChanges(manifest);
    for (const c of changes) {
      expect(typeof c.field).toBe("string");
      expect(c.field.length).toBeGreaterThan(0);
      expect(Number.isFinite(c.ts)).toBe(true);
    }
  });
});

describe("projectLogins — real export", () => {
  it("returns at least one login event", async () => {
    const logins = await projectLogins(manifest);
    expect(logins.length).toBeGreaterThan(0);
  });

  it("every event has a finite timestamp and a known source", async () => {
    const logins = await projectLogins(manifest);
    const validSources = new Set([
      "login",
      "logout",
      "location",
      "device",
    ]);
    for (const e of logins) {
      expect(Number.isFinite(e.ts)).toBe(true);
      expect(validSources.has(e.source)).toBe(true);
    }
  });
});
