import { messageThreadFile } from "../schemas/messages";
import type { FileManifest } from "../types";

/**
 * Walks the DM thread folders and returns one merged record per thread.
 *
 * Instagram chunks long histories across `message_1.json`, `message_2.json`,
 * etc. inside each thread folder. Some users also have a parallel
 * `message_requests/` tree for unaccepted DMs. We treat both trees the same
 * way and tag each thread with its parent kind.
 *
 * The thread *folder name* is `<handle>_<internal_id>`. We split on the
 * trailing `_<digits>` to recover a likely handle. For users without a
 * handle, Instagram falls back to `instagramuser_<id>` — in that case we
 * leave the handle blank.
 */

export type MessageRecord = {
  senderName: string;
  /** Unix milliseconds — left as-is here, normalized in the projection. */
  timestampMs: number;
  content?: string;
  shareLink?: string;
  reactions?: Array<{ actor: string; reaction: string }>;
};

export type ThreadRecord = {
  /** Thread folder name (`grassguwu_502772971122469`). */
  folder: string;
  /** Best-effort recovered handle from the folder name. */
  handle?: string;
  /** Display names from `participants[]`. */
  participants: string[];
  /** Whether this thread came from `inbox/` or `message_requests/`. */
  origin: "inbox" | "request";
  /** All messages from every chunk file, in source order (latest-first). */
  messages: MessageRecord[];
};

const INBOX_RE = /^your_instagram_activity\/messages\/inbox\/([^/]+)\/message_\d+\.json$/;
const REQUEST_RE = /^your_instagram_activity\/messages\/message_requests\/([^/]+)\/message_\d+\.json$/;

export async function decodeMessages(
  manifest: FileManifest,
): Promise<ThreadRecord[]> {
  const groups = new Map<string, { paths: string[]; origin: "inbox" | "request" }>();

  for (const path of manifest.paths) {
    const inbox = INBOX_RE.exec(path);
    if (inbox) {
      const folder = inbox[1];
      const existing = groups.get(folder) ?? { paths: [], origin: "inbox" };
      existing.paths.push(path);
      groups.set(folder, existing);
      continue;
    }
    const request = REQUEST_RE.exec(path);
    if (request) {
      const folder = request[1];
      const existing = groups.get(folder) ?? { paths: [], origin: "request" };
      existing.paths.push(path);
      groups.set(folder, existing);
    }
  }

  const threads = await Promise.all(
    Array.from(groups.entries()).map(async ([folder, { paths, origin }]) => {
      // Sort the chunk files numerically so the merge is stable.
      const sorted = paths.sort();
      const chunks = await Promise.all(
        sorted.map((p) => manifest.readJson(p)),
      );

      let participants: string[] = [];
      const messages: MessageRecord[] = [];

      for (const raw of chunks) {
        if (!raw) continue;
        const parsed = messageThreadFile.safeParse(raw);
        if (!parsed.success) continue;
        const data = parsed.data;
        if (
          participants.length === 0 &&
          Array.isArray(data.participants)
        ) {
          participants = data.participants
            .map((p) => p.name)
            .filter((n): n is string => typeof n === "string");
        }
        if (Array.isArray(data.messages)) {
          for (const m of data.messages) {
            const record = toMessageRecord(m);
            if (record) messages.push(record);
          }
        }
      }

      return {
        folder,
        handle: handleFromFolder(folder),
        participants,
        origin,
        messages,
      };
    }),
  );

  return threads;
}

function toMessageRecord(input: unknown): MessageRecord | undefined {
  if (!input || typeof input !== "object") return undefined;
  const m = input as Record<string, unknown>;
  const senderName = typeof m.sender_name === "string" ? m.sender_name : undefined;
  const ts =
    typeof m.timestamp_ms === "number"
      ? m.timestamp_ms
      : typeof m.timestamp === "number"
        ? m.timestamp * 1000
        : undefined;
  if (!senderName || ts === undefined) return undefined;

  const share = m.share as { link?: unknown } | undefined;
  const reactions = Array.isArray(m.reactions)
    ? (m.reactions as Array<Record<string, unknown>>)
        .map((r) => ({
          actor: typeof r.actor === "string" ? r.actor : "",
          reaction: typeof r.reaction === "string" ? r.reaction : "",
        }))
        .filter((r) => r.actor && r.reaction)
    : undefined;

  return {
    senderName,
    timestampMs: ts,
    content: typeof m.content === "string" ? m.content : undefined,
    shareLink: typeof share?.link === "string" ? share.link : undefined,
    reactions,
  };
}

/**
 * Strips the trailing `_<digits>` from a thread folder name and returns the
 * remaining handle. Returns undefined for the `instagramuser_<id>` fallback,
 * which encodes "user has no handle" / "user is unknown".
 */
function handleFromFolder(folder: string): string | undefined {
  const stripped = folder.replace(/_\d+$/, "");
  if (!stripped || stripped === folder) return undefined;
  if (stripped === "instagramuser") return undefined;
  return stripped;
}
