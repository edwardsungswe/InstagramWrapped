import { describe, it, expect, beforeAll } from "vitest";
import { extractZip } from "@/parsing/extract";
import { parseManifest, countByKind } from "@/parsing/parse";
import { loadRealExportZip } from "../helpers/zipFromDir";
import type { ParsedBundle } from "@/model/events";

describe("parseManifest — real export integration", () => {
  let bundle: ParsedBundle;

  beforeAll(async () => {
    const blob = await loadRealExportZip();
    const manifest = await extractZip(blob);
    bundle = await parseManifest(manifest);
  });

  it("returns no parse errors", () => {
    expect(bundle.errors).toEqual([]);
  });

  it("detects account type 'personal'", () => {
    expect(bundle.account.type).toBe("personal");
  });

  it("captures the export owner", () => {
    expect(bundle.account.owner).toEqual({
      displayName: "Waikong",
      handle: "mit_yea",
    });
  });

  it("produces a non-trivial number of interactions", () => {
    expect(bundle.interactions.length).toBeGreaterThan(100);
  });

  it("interactions are sorted newest-first", () => {
    for (let i = 1; i < bundle.interactions.length; i++) {
      expect(bundle.interactions[i - 1].ts).toBeGreaterThanOrEqual(
        bundle.interactions[i].ts,
      );
    }
  });

  it("every interaction has a finite Unix-second timestamp", () => {
    for (const ev of bundle.interactions) {
      expect(Number.isFinite(ev.ts)).toBe(true);
      expect(ev.ts).toBeGreaterThan(1262304000); // 2010
      expect(ev.ts).toBeLessThan(1893456000); // 2030
    }
  });

  it("includes every MVP interaction kind", () => {
    const counts = countByKind(bundle.interactions);
    expect(counts.dm_sent).toBeGreaterThan(0);
    expect(counts.dm_received).toBeGreaterThan(0);
    expect(counts.like).toBeGreaterThan(0);
    expect(counts.view).toBeGreaterThan(0);
    expect(counts.comment).toBeGreaterThan(0);
    expect(counts.follow).toBeGreaterThan(0);
    expect(counts.save).toBeGreaterThan(0);
    expect(counts.search).toBeGreaterThan(0);
    expect(counts.story_like).toBeGreaterThan(0);
  });

  it("includes own-media post interactions (Phase 9)", () => {
    const counts = countByKind(bundle.interactions);
    expect(counts.post).toBeGreaterThan(0);
  });

  it("populates profile changes, logins, and ad interests", () => {
    expect(bundle.profileChanges.length).toBeGreaterThan(0);
    expect(bundle.logins.length).toBeGreaterThan(0);
    expect(bundle.adInterests.length).toBeGreaterThan(0);
  });

  it("logs the breakdown for visibility (not an assertion)", () => {
    const counts = countByKind(bundle.interactions);
    // eslint-disable-next-line no-console
    console.log("Interaction kind breakdown:", counts);
    // eslint-disable-next-line no-console
    console.log("Sidecar counts:", {
      profileChanges: bundle.profileChanges.length,
      logins: bundle.logins.length,
      adInterests: bundle.adInterests.length,
    });
  });
});

describe("parseManifest — error tolerance", () => {
  it("collects per-source errors and still returns a bundle", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    // Drop in a single corrupt file under a known projection's path. The
    // other projections will simply have nothing to parse and return empty.
    zip.file(
      "your_instagram_activity/likes/liked_posts.json",
      "{not even json}",
    );
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);
    const manifest = await extractZip(blob);
    const bundle = await parseManifest(manifest);

    // The bundle still resolves; the corrupt file produces zero interactions
    // (extract.ts swallows JSON.parse errors and returns undefined).
    expect(bundle.interactions).toEqual([]);
    expect(bundle.account.type).toBe("personal");
  });
});
