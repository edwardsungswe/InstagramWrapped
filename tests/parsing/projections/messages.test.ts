import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { projectMessages } from "@/parsing/projections/messages";
import { projectOwner } from "@/parsing/projections/owner";
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

describe("projectMessages — synthetic", () => {
  it("classifies messages by owner display name", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_1/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1700000001000, content: "hi" },
            { sender_name: "Owner", timestamp_ms: 1700000002000, content: "yo" },
            { sender_name: "Alice", timestamp_ms: 1700000003000, content: "ok" },
          ],
        }),
    });
    const interactions = await projectMessages(manifest, {
      displayName: "Owner",
    });
    expect(interactions).toHaveLength(3);
    const sent = interactions.filter((i) => i.kind === "dm_sent");
    const received = interactions.filter((i) => i.kind === "dm_received");
    expect(sent).toHaveLength(1);
    expect(received).toHaveLength(2);
  });

  it("falls back to all-received when owner name is unknown", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_1/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1700000001000 },
            { sender_name: "Owner", timestamp_ms: 1700000002000 },
          ],
        }),
    });
    const interactions = await projectMessages(manifest, {});
    expect(interactions.every((i) => i.kind === "dm_received")).toBe(true);
  });

  it("attaches handle from the folder name", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_1/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1700000001000 },
          ],
        }),
    });
    const interactions = await projectMessages(manifest, {});
    expect(interactions[0].withHandle).toBe("alice");
  });

  it("normalizes timestamp_ms to unix seconds", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/messages/inbox/alice_1/message_1.json":
        JSON.stringify({
          participants: [{ name: "Alice" }, { name: "Owner" }],
          messages: [
            { sender_name: "Alice", timestamp_ms: 1729667182194 },
          ],
        }),
    });
    const interactions = await projectMessages(manifest, {});
    expect(interactions[0].ts).toBe(1729667182);
  });
});

describe("projectMessages — real export", () => {
  it("emits both dm_sent and dm_received", async () => {
    const blob = await loadRealExportZip();
    const manifest = await extractZip(blob);
    const owner = await projectOwner(manifest);
    expect(owner.displayName).toBe("Waikong");

    const interactions = await projectMessages(manifest, owner);
    const sent = interactions.filter((i) => i.kind === "dm_sent");
    const received = interactions.filter((i) => i.kind === "dm_received");
    expect(sent.length).toBeGreaterThan(0);
    expect(received.length).toBeGreaterThan(0);
  });
});
