import { decodeMessages } from "../decoders/messages";
import { toUnixSeconds } from "../time";
import type { Interaction, Owner } from "@/model/events";
import type { FileManifest } from "../types";

/**
 * Walks every DM thread and emits one `dm_sent` or `dm_received` Interaction
 * per message. Direction is decided by comparing each message's `sender_name`
 * to the export owner's display name from the owner projection.
 *
 * The counterparty handle (`withHandle`) is best-effort recovered from the
 * thread folder name. For multi-participant group chats this collapses
 * everyone into the same `withHandle`, which is fine for the MVP — group
 * chat insights are out of scope until a later phase.
 *
 * Without an owner display name we still emit interactions, but cannot tell
 * sent from received: in that case we tag everything as `dm_received` so the
 * counts aren't artificially inflated on either side.
 */
export async function projectMessages(
  manifest: FileManifest,
  owner: Owner,
): Promise<Interaction[]> {
  const threads = await decodeMessages(manifest);
  const ownerName = owner.displayName;

  const out: Interaction[] = [];
  for (const thread of threads) {
    const counterparty = thread.handle;
    for (const m of thread.messages) {
      const ts = toUnixSeconds(m.timestampMs, { unit: "ms" });
      if (ts === undefined) continue;
      const isSent = ownerName !== undefined && m.senderName === ownerName;
      out.push({
        kind: isSent ? "dm_sent" : "dm_received",
        ts,
        withHandle: counterparty,
        meta: {
          thread: thread.folder,
          origin: thread.origin,
        },
      });
    }
  }
  return out;
}
