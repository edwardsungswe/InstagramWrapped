import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { loadRealExportZip } from "../helpers/zipFromDir";

describe("extractZip — synthetic ZIPs", () => {
  it("lists every file by path", async () => {
    const zip = new JSZip();
    zip.file("a.json", "[]");
    zip.file("nested/b.json", "{}");
    zip.file("nested/deep/c.txt", "hi");
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    expect(manifest.paths).toEqual([
      "a.json",
      "nested/b.json",
      "nested/deep/c.txt",
    ]);
  });

  it("strips a single common root folder", async () => {
    const zip = new JSZip();
    zip.file("instagram-username-1234/your_instagram_activity/likes/liked_posts.json", "[]");
    zip.file("instagram-username-1234/connections/followers_and_following/following.json", "{}");
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    expect(manifest.paths).toEqual([
      "connections/followers_and_following/following.json",
      "your_instagram_activity/likes/liked_posts.json",
    ]);
  });

  it("strips root folder even when macOS __MACOSX entries are present", async () => {
    const zip = new JSZip();
    zip.file("instagram-username-1234/your_instagram_activity/likes/liked_posts.json", "[]");
    zip.file("instagram-username-1234/connections/followers_and_following/following.json", "{}");
    // macOS Finder adds these metadata entries when creating ZIPs.
    zip.file("__MACOSX/instagram-username-1234/._liked_posts.json", "metadata");
    zip.file("__MACOSX/._instagram-username-1234", "metadata");
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    // __MACOSX entries should be filtered out entirely.
    expect(manifest.paths.some((p) => p.includes("__MACOSX"))).toBe(false);
    // Root folder should be stripped.
    expect(manifest.paths).toEqual([
      "connections/followers_and_following/following.json",
      "your_instagram_activity/likes/liked_posts.json",
    ]);
  });

  it("does not strip when files are at the root", async () => {
    const zip = new JSZip();
    zip.file("a.json", "[]");
    zip.file("nested/b.json", "{}");
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    expect(manifest.paths).toContain("a.json");
    expect(manifest.paths).toContain("nested/b.json");
  });

  it("readJson parses and applies mojibake fix-up recursively", async () => {
    const zip = new JSZip();
    // "café" mojibaked as latin1 bytes
    zip.file("data.json", JSON.stringify({ name: "caf\u00c3\u00a9" }));
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    const data = await manifest.readJson<{ name: string }>("data.json");
    expect(data).toEqual({ name: "café" });
  });

  it("readJson returns undefined for unknown paths", async () => {
    const zip = new JSZip();
    zip.file("a.json", "[]");
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    expect(await manifest.readJson("nope.json")).toBeUndefined();
  });

  it("has() answers capability checks via the glob matcher", async () => {
    const zip = new JSZip();
    zip.file("messages/inbox/ryan_1/message_1.json", "{}");
    zip.file("likes/liked_posts.json", "[]");
    const blob = new Blob([
      new Uint8Array(
        await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
      ),
    ]);

    const manifest = await extractZip(blob);
    expect(manifest.has("likes/liked_posts.json")).toBe(true);
    expect(manifest.has("messages/inbox/**")).toBe(true);
    expect(manifest.has("nope/*.json")).toBe(false);
  });
});

describe("extractZip — real Instagram export", () => {
  let manifest: Awaited<ReturnType<typeof extractZip>>;

  beforeAll(async () => {
    const blob = await loadRealExportZip();
    manifest = await extractZip(blob);
  });

  it("contains the expected JSON files", () => {
    const jsonPaths = manifest.paths.filter((p) => p.endsWith(".json"));
    expect(jsonPaths.length).toBe(108);
  });

  it("strips the top-level export folder", () => {
    expect(
      manifest.paths.some((p) =>
        p.startsWith("your_instagram_activity/likes/liked_posts.json"),
      ),
    ).toBe(true);
  });

  it("can read a real liked_posts.json and apply mojibake fix-up", async () => {
    const data = await manifest.readJson<unknown[]>(
      "your_instagram_activity/likes/liked_posts.json",
    );
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBeGreaterThan(0);
  });

  it("has() works against the real manifest", () => {
    expect(manifest.has("your_instagram_activity/messages/inbox/**")).toBe(true);
    expect(
      manifest.has(
        "your_instagram_activity/likes/liked_posts.json",
      ),
    ).toBe(true);
    expect(manifest.has("a/b/c/nonexistent.json")).toBe(false);
  });
});
