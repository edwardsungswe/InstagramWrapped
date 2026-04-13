import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { projectPosts } from "@/parsing/projections/posts";
import { loadRealExportZip } from "../../helpers/zipFromDir";

async function manifestFromFiles(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const blob = new Blob([
    new Uint8Array(
      await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
    ),
  ]);
  return extractZip(blob);
}

describe("projectPosts — synthetic", () => {
  it("returns empty when no own-media files exist", async () => {
    const manifest = await manifestFromFiles({});
    expect(await projectPosts(manifest)).toEqual([]);
  });

  it("emits one Interaction per post in posts_1.json", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/media/posts_1.json": JSON.stringify([
        {
          media: [
            { creation_timestamp: 1700000000, uri: "media/posts/x.jpg" },
            { creation_timestamp: 1700000000, uri: "media/posts/y.jpg" },
          ],
        },
        {
          media: [{ creation_timestamp: 1700000100, uri: "media/posts/z.jpg" }],
        },
      ]),
    });
    const interactions = await projectPosts(manifest);
    expect(interactions).toHaveLength(2);
    expect(interactions.every((i) => i.kind === "post")).toBe(true);
    expect(interactions.every((i) => i.meta?.mediaKind === "post")).toBe(true);
  });

  it("emits one Interaction per reel in reels.json", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/media/reels.json": JSON.stringify({
        ig_reels_media: [
          { media: [{ creation_timestamp: 1700000000, uri: "media/reels/a.mp4" }] },
          { media: [{ creation_timestamp: 1700000100, uri: "media/reels/b.mp4" }] },
        ],
      }),
    });
    const interactions = await projectPosts(manifest);
    expect(interactions).toHaveLength(2);
    expect(interactions.every((i) => i.meta?.mediaKind === "reel")).toBe(true);
  });

  it("emits one Interaction per story in stories.json", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/media/stories.json": JSON.stringify({
        ig_stories: [
          { creation_timestamp: 1700000000, uri: "media/stories/x.jpg" },
          { creation_timestamp: 1700000100, uri: "media/stories/y.jpg" },
        ],
      }),
    });
    const interactions = await projectPosts(manifest);
    expect(interactions).toHaveLength(2);
    expect(interactions.every((i) => i.meta?.mediaKind === "story")).toBe(true);
  });

  it("skips items with no usable timestamp", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/media/posts_1.json": JSON.stringify([
        { media: [{ uri: "media/posts/a.jpg" }] }, // no creation_timestamp
        { media: [{ creation_timestamp: 0, uri: "media/posts/b.jpg" }] }, // zero
        { media: [{ creation_timestamp: 1700000000, uri: "media/posts/c.jpg" }] },
      ]),
    });
    const interactions = await projectPosts(manifest);
    expect(interactions).toHaveLength(1);
  });

  it("combines posts + reels + stories", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/media/posts_1.json": JSON.stringify([
        { media: [{ creation_timestamp: 1700000000 }] },
      ]),
      "your_instagram_activity/media/reels.json": JSON.stringify({
        ig_reels_media: [{ media: [{ creation_timestamp: 1700000100 }] }],
      }),
      "your_instagram_activity/media/stories.json": JSON.stringify({
        ig_stories: [{ creation_timestamp: 1700000200 }],
      }),
    });
    const interactions = await projectPosts(manifest);
    expect(interactions).toHaveLength(3);
    const kinds = interactions.map((i) => i.meta?.mediaKind).sort();
    expect(kinds).toEqual(["post", "reel", "story"]);
  });
});

describe("projectPosts — real export", () => {
  it("returns at least one post from the real export", async () => {
    const blob = await loadRealExportZip();
    const manifest = await extractZip(blob);
    const interactions = await projectPosts(manifest);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions.every((i) => i.kind === "post")).toBe(true);
    expect(interactions.every((i) => Number.isFinite(i.ts))).toBe(true);
  });
});
