import { filterByScope } from "./scope";
import { LABELS } from "./personalityLabels";
import type { Interaction } from "@/model/events";
import type { InsightModule } from "./types";

/**
 * Maps a user's behavior to a personality archetype.
 *
 * Computes four axes from the parsed bundle:
 *   - **social**   — DM volume (sent + received)
 *   - **lurker**   — passive consumption (views + likes)
 *   - **creator**  — own posts/reels/stories. **Activated in Phase 9** when
 *                    the own-media projection (`projections/posts.ts`) shipped
 *                    and started emitting `post` interactions.
 *   - **explorer** — diversity of unique handles touched, vs. revisiting a
 *                    handful of accounts
 *
 * Each axis is normalized to a 0–100 share — they sum to 100. The dominant
 * axis is whichever has the largest share. The picked label comes from the
 * `(dominantAxis, timeOfDay)` cell of the data fixture in
 * `personalityLabels.ts`.
 *
 * Time of day is **UTC-bucketed**: Instagram doesn't ship the user's
 * timezone, and picking one is wrong half the time. Documented as a known
 * limitation.
 */

export type Axes = {
  social: number;
  lurker: number;
  creator: number;
  explorer: number;
};

export type DominantAxis = keyof Axes;

export type TimeOfDay = "night" | "morning" | "afternoon" | "evening";

export type PersonalityTypeResult = {
  axes: Axes;
  dominantAxis: DominantAxis;
  timeOfDay: TimeOfDay;
  label: string;
  description: string;
};

export const personalityType: InsightModule<PersonalityTypeResult> = {
  id: "personality-type",
  title: "Personality Type",
  requires: [
    "your_instagram_activity/messages/inbox/**",
    "ads_information/ads_and_topics/posts_viewed.json",
    "your_instagram_activity/likes/liked_posts.json",
  ],
  run: ({ bundle, scope }) => {
    const scoped = filterByScope(bundle.interactions, scope);

    const totals = countAxisInputs(scoped);
    const axes = computeAxes(totals);
    const dominantAxis = pickDominant(axes);
    const timeOfDay = pickTimeOfDay(scoped);
    const { label, description } = LABELS[dominantAxis][timeOfDay];

    return {
      status: "ok",
      data: { axes, dominantAxis, timeOfDay, label, description },
    };
  },
};

/**
 * Counts the raw inputs feeding each axis. The conversion to a normalized
 * 0–100 share happens in `computeAxes`.
 *
 * `explorer` is carved out of the `lurker` pool, not added to it: a user who
 * passively touches many different accounts is "explorer-flavored", a user
 * who hits the same few accounts repeatedly is "lurker-flavored". The
 * concentration ratio splits the same passive-activity total between the
 * two. DMs are inherently social, so they don't feed the explorer axis.
 */
type AxisInputs = {
  socialRaw: number;
  lurkerRaw: number;
  creatorRaw: number;
  explorerRaw: number;
};

function countAxisInputs(interactions: Interaction[]): AxisInputs {
  let socialRaw = 0;
  let passiveTotal = 0;
  // Phase 9 activated this — own-media projections (posts/reels/stories) now
  // emit `post` interactions, and the creator axis counts each one.
  let creatorRaw = 0;
  const passiveHandles = new Set<string>();
  let passiveHandleCount = 0;

  for (const i of interactions) {
    switch (i.kind) {
      case "dm_sent":
      case "dm_received":
        socialRaw += 1;
        break;
      case "view":
      case "like":
      case "story_like":
        passiveTotal += 1;
        if (i.withHandle) {
          passiveHandles.add(i.withHandle);
          passiveHandleCount += 1;
        }
        break;
      case "post":
        creatorRaw += 1;
        break;
    }
  }

  // Concentration = (unique passive handles) / (total passive interactions
  // that had a handle). 1.0 = every interaction was with a different account
  // (max diversity → all explorer); 0.0 = always the same account (no
  // diversity → all lurker). Passive interactions without a handle stay in
  // the lurker pool.
  const concentration =
    passiveHandleCount > 0 ? passiveHandles.size / passiveHandleCount : 0;
  const explorerRaw = passiveTotal * concentration;
  const lurkerRaw = passiveTotal * (1 - concentration);

  return { socialRaw, lurkerRaw, creatorRaw, explorerRaw };
}

/**
 * Normalizes the four raw inputs to a 0–100 share that sums to 100.
 * Returns equal distribution if every axis is zero (avoids divide-by-zero
 * and gives the picker something to work with).
 */
function computeAxes(inputs: AxisInputs): Axes {
  const sum = inputs.socialRaw + inputs.lurkerRaw + inputs.creatorRaw + inputs.explorerRaw;
  if (sum === 0) {
    return { social: 25, lurker: 25, creator: 25, explorer: 25 };
  }
  return {
    social: (inputs.socialRaw / sum) * 100,
    lurker: (inputs.lurkerRaw / sum) * 100,
    creator: (inputs.creatorRaw / sum) * 100,
    explorer: (inputs.explorerRaw / sum) * 100,
  };
}

function pickDominant(axes: Axes): DominantAxis {
  const entries = Object.entries(axes) as Array<[DominantAxis, number]>;
  let bestKey: DominantAxis = "lurker";
  let bestValue = -Infinity;
  for (const [key, value] of entries) {
    if (value > bestValue) {
      bestKey = key;
      bestValue = value;
    }
  }
  return bestKey;
}

/**
 * Returns the modal time-of-day bucket from a list of interactions.
 * Empty input → "evening" as a benign default.
 */
function pickTimeOfDay(interactions: Interaction[]): TimeOfDay {
  if (interactions.length === 0) return "evening";

  const counts: Record<TimeOfDay, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  for (const i of interactions) {
    counts[bucketHour(new Date(i.ts * 1000).getUTCHours())] += 1;
  }

  let bestBucket: TimeOfDay = "evening";
  let bestCount = -1;
  for (const [bucket, count] of Object.entries(counts) as Array<[TimeOfDay, number]>) {
    if (count > bestCount) {
      bestBucket = bucket;
      bestCount = count;
    }
  }
  return bestBucket;
}

/**
 * UTC-hour buckets:
 *   night     22:00 – 04:59
 *   morning   05:00 – 11:59
 *   afternoon 12:00 – 17:59
 *   evening   18:00 – 21:59
 */
function bucketHour(hour: number): TimeOfDay {
  if (hour >= 22 || hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
