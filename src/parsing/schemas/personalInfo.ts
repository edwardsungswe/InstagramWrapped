import { z } from "zod";

/**
 * Lightweight Zod schema for `personal_information.json`. Used by the owner
 * projection to extract the export owner's display name and handle.
 */

export const personalInfoFile = z
  .object({
    profile_user: z
      .array(z.object({}).passthrough())
      .optional(),
  })
  .passthrough();

export type PersonalInfoFile = z.infer<typeof personalInfoFile>;
