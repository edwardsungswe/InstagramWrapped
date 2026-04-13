import { detectAccountType } from "./accountType";
import { projectOwner } from "./projections/owner";
import { projectLikes } from "./projections/likes";
import { projectViews } from "./projections/views";
import { projectComments } from "./projections/comments";
import { projectFollows } from "./projections/follows";
import { projectSaves } from "./projections/saves";
import { projectSearches } from "./projections/searches";
import { projectStoryLikes } from "./projections/storyLikes";
import { projectMessages } from "./projections/messages";
import { projectProfileChanges } from "./projections/profileChanges";
import { projectLogins } from "./projections/logins";
import { projectAdInterests } from "./projections/adInterests";
import { projectPosts } from "./projections/posts";
import type {
  Interaction,
  ParseError,
  ParsedBundle,
  ProfileChange,
  LoginEvent,
  AdInterest,
  Owner,
} from "@/model/events";
import type { FileManifest } from "./types";

/**
 * Phase 2 orchestrator.
 *
 * Runs every projection against the manifest in parallel, catching per-source
 * errors so a single bad file never crashes the whole bundle. Failed sources
 * land in `errors[]`; the corresponding output array is simply empty.
 *
 * The owner projection runs first because the messages projection depends on
 * it for the sent/received split.
 */
export async function parseManifest(
  manifest: FileManifest,
): Promise<ParsedBundle> {
  const errors: ParseError[] = [];

  const [accountType, owner] = await Promise.all([
    runStrict("accountType", () => detectAccountType(manifest), errors),
    runStrict("owner", () => projectOwner(manifest), errors),
  ]);

  // Run all interaction-emitting projections in parallel.
  const [
    likes,
    views,
    comments,
    follows,
    saves,
    searches,
    storyLikes,
    dms,
    posts,
    profileChanges,
    logins,
    adInterests,
  ] = await Promise.all([
    runArray("likes", () => projectLikes(manifest), errors),
    runArray("views", () => projectViews(manifest), errors),
    runArray("comments", () => projectComments(manifest), errors),
    runArray("follows", () => projectFollows(manifest), errors),
    runArray("saves", () => projectSaves(manifest), errors),
    runArray("searches", () => projectSearches(manifest), errors),
    runArray("storyLikes", () => projectStoryLikes(manifest), errors),
    runArray<Interaction>(
      "messages",
      () => projectMessages(manifest, owner ?? {}),
      errors,
    ),
    runArray("posts", () => projectPosts(manifest), errors),
    runArray<ProfileChange>("profileChanges", () => projectProfileChanges(manifest), errors),
    runArray<LoginEvent>("logins", () => projectLogins(manifest), errors),
    runArray<AdInterest>("adInterests", () => projectAdInterests(manifest), errors),
  ]);

  const interactions: Interaction[] = [
    ...likes,
    ...views,
    ...comments,
    ...follows,
    ...saves,
    ...searches,
    ...storyLikes,
    ...dms,
    ...posts,
  ];

  // Sort newest-first; downstream insight modules can re-sort if they need to.
  interactions.sort((a, b) => b.ts - a.ts);

  return {
    account: {
      type: accountType ?? "personal",
      owner: owner ?? {},
    },
    interactions,
    profileChanges,
    logins,
    adInterests,
    errors,
  };
}

async function runStrict<T>(
  source: string,
  fn: () => Promise<T>,
  errors: ParseError[],
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    errors.push({ source, message: err instanceof Error ? err.message : String(err) });
    return undefined;
  }
}

async function runArray<T>(
  source: string,
  fn: () => Promise<T[]>,
  errors: ParseError[],
): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    errors.push({ source, message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Helper used by the upload page: tally interactions by kind so the UI can
 * render a quick breakdown without re-walking the array.
 */
export function countByKind(
  interactions: Interaction[],
): Record<Interaction["kind"], number> {
  const out: Record<string, number> = {
    dm_sent: 0,
    dm_received: 0,
    like: 0,
    comment: 0,
    story_like: 0,
    search: 0,
    view: 0,
    save: 0,
    follow: 0,
    post: 0,
  };
  for (const i of interactions) {
    out[i.kind] = (out[i.kind] ?? 0) + 1;
  }
  return out as Record<Interaction["kind"], number>;
}

// Re-export for the worker.
export type { ParsedBundle } from "@/model/events";
