import { z } from "zod";

/**
 * Lightweight Zod schema for an Instagram DM thread file
 * (`messages/inbox/<thread>/message_*.json`). Validates the outermost
 * `participants + messages` envelope. Inner message fields are tolerant.
 */

export const messageThreadFile = z
  .object({
    participants: z
      .array(
        z
          .object({
            name: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    messages: z
      .array(z.object({}).passthrough())
      .optional(),
  })
  .passthrough();

export type MessageThreadFile = z.infer<typeof messageThreadFile>;
