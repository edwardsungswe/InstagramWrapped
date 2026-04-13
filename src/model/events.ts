/**
 * Normalized event model. Every parser converts source data into one of
 * these record shapes so that downstream insight modules don't have to know
 * which JSON file fed them.
 */

import type { AccountType } from "@/parsing/types";

export type InteractionKind =
  | "dm_sent"
  | "dm_received"
  | "like"
  | "comment"
  | "story_like"
  | "search"
  | "view"
  | "save"
  | "follow"
  /** Own media (post / reel / story) the user published. `meta.mediaKind`
   *  carries the specific type. Added in Phase 9 alongside the posts
   *  projection. */
  | "post";

export type Interaction = {
  kind: InteractionKind;
  /** Unix timestamp in seconds. */
  ts: number;
  /** Counterparty Instagram username, if any. */
  withHandle?: string;
  /** URL or fbid identifying the content the interaction is about. */
  contentRef?: string;
  /** Source-specific bag for fields a future projection might want. */
  meta?: Record<string, unknown>;
};

export type ProfileChange = {
  ts: number;
  field: string;
  from?: string;
  to?: string;
};

export type LoginEvent = {
  ts: number;
  ip?: string;
  userAgent?: string;
  device?: string;
  source: "login" | "logout" | "location" | "device";
};

export type AdInterest = {
  name: string;
  /** "Lifestyle" | "Financial" | "Demographic" | undefined — populated by
   *  the Phase 7 grouping pass. Phase 2 leaves this undefined. */
  group?: string;
};

export type Owner = {
  displayName?: string;
  handle?: string;
};

export type ParseError = {
  source: string;
  message: string;
};

export type ParsedBundle = {
  account: { type: AccountType; owner: Owner };
  interactions: Interaction[];
  profileChanges: ProfileChange[];
  logins: LoginEvent[];
  adInterests: AdInterest[];
  errors: ParseError[];
};
