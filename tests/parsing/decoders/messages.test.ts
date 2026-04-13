import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { decodeMessages } from "@/parsing/decoders/messages";
import { loadRealExportZip } from "../../helpers/zipFromDir";
import type { FileManifest } from "@/parsing/types";

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

describe("decodeMessages — synthetic", () => {
  it("returns one ThreadRecord per inbox folder", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_123/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1700000001000, content: "hi" },
            { sender_name: "Owner", timestamp_ms: 1700000002000, content: "yo" },
          ],
        }),
      "your_instagram_activity/messages/inbox/bob_456/message_1.json":
        JSON.stringify({
          participants: [{ name: "Bob" }, { name: "Owner" }],
          messages: [
            { sender_name: "Bob", timestamp_ms: 1700000003000, content: "sup" },
          ],
        }),
    });
    const threads = await decodeMessages(manifest);
    expect(threads).toHaveLength(2);
    const folders = threads.map((t) => t.folder).sort();
    expect(folders).toEqual(["alice_123", "bob_456"]);
  });

  it("merges multi-chunk thread files", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_123/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1700000001000, content: "newer" },
          ],
        }),
      "your_instagram_activity/messages/inbox/alice_123/message_2.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Owner", timestamp_ms: 1600000000000, content: "older" },
          ],
        }),
    });
    const threads = await decodeMessages(manifest);
    expect(threads).toHaveLength(1);
    expect(threads[0].messages).toHaveLength(2);
  });

  it("recovers the handle from the folder name", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/grassguwu_502772971122469/message_1.json":
        JSON.stringify({
          participants: [{ name: "G" }, { name: "Owner" }],
          messages: [
            { sender_name: "G", timestamp_ms: 1700000000000, content: "x" },
          ],
        }),
    });
    const threads = await decodeMessages(manifest);
    expect(threads[0].handle).toBe("grassguwu");
  });

  it("returns undefined handle for the instagramuser fallback", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/instagramuser_855183812548048/message_1.json":
        JSON.stringify({
          participants: [{ name: "?" }, { name: "Owner" }],
          messages: [
            { sender_name: "?", timestamp_ms: 1700000000000, content: "x" },
          ],
        }),
    });
    const threads = await decodeMessages(manifest);
    expect(threads[0].handle).toBeUndefined();
  });

  it("tags message_requests folders with origin 'request'", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_1/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1700000001000, content: "hi" },
          ],
        }),
      "your_instagram_activity/messages/message_requests/spam_2/message_1.json":
        JSON.stringify({
          participants: [{ name: "Spam" }, { name: "Owner" }],
          messages: [
            { sender_name: "Spam", timestamp_ms: 1700000002000, content: "buy" },
          ],
        }),
    });
    const threads = await decodeMessages(manifest);
    const byFolder = Object.fromEntries(threads.map((t) => [t.folder, t]));
    expect(byFolder["alice_1"].origin).toBe("inbox");
    expect(byFolder["spam_2"].origin).toBe("request");
  });
});

describe("decodeMessages — real export", () => {
  let manifest: FileManifest;

  beforeAll(async () => {
    const blob = await loadRealExportZip();
    manifest = await extractZip(blob);
  });

  it("returns multiple thread records", async () => {
    const threads = await decodeMessages(manifest);
    expect(threads.length).toBeGreaterThan(10);
  });

  it("every message has a sender name and timestamp_ms", async () => {
    const threads = await decodeMessages(manifest);
    for (const t of threads) {
      for (const m of t.messages) {
        expect(typeof m.senderName).toBe("string");
        expect(m.senderName.length).toBeGreaterThan(0);
        expect(Number.isFinite(m.timestampMs)).toBe(true);
      }
    }
  });

  it("includes the owner ('Waikong') as a participant in inbox threads", async () => {
    const threads = await decodeMessages(manifest);
    const inbox = threads.filter((t) => t.origin === "inbox");
    const someHaveOwner = inbox.some((t) => t.participants.includes("Waikong"));
    expect(someHaveOwner).toBe(true);
  });
});
