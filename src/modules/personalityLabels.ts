/**
 * Data-only fixture table for the personality module.
 *
 * The personality algorithm computes (dominantAxis, timeOfDay) and looks up
 * the matching label here. Editing a label is a one-string change with no
 * code or test updates required — that's the point of keeping it as data.
 *
 * The four axes from `personalityType.ts`:
 *   - social   — DM-heavy
 *   - lurker   — view/like-heavy
 *   - creator  — own-content-heavy (~0 in Phase 5; activates in Phase 7 when
 *                own-media projections ship)
 *   - explorer — touches lots of unique handles vs. revisits a few
 *
 * Time-of-day buckets are UTC hours:
 *   - night     22:00 – 04:59
 *   - morning   05:00 – 11:59
 *   - afternoon 12:00 – 17:59
 *   - evening   18:00 – 21:59
 */

import type { DominantAxis, TimeOfDay } from "./personalityType";

export type Label = { label: string; description: string };

export const LABELS: Record<DominantAxis, Record<TimeOfDay, Label>> = {
  social: {
    night: {
      label: "Late-Night Texter",
      description: "Your inbox lives between midnight and the sunrise.",
    },
    morning: {
      label: "Morning Group-Chat Captain",
      description: "Coffee, then the group chat. In that order.",
    },
    afternoon: {
      label: "Chaos Messenger",
      description: "Your DMs run on espresso and bad decisions.",
    },
    evening: {
      label: "Friend Group Anchor",
      description: "Wind-down hours? More like check-in hours.",
    },
  },
  lurker: {
    night: {
      label: "Night Owl Scroller",
      description: "You watch the world go by between midnight and 4am.",
    },
    morning: {
      label: "Sunrise Observer",
      description: "Coffee in one hand, infinite scroll in the other.",
    },
    afternoon: {
      label: "Lunch-Break Lurker",
      description: "12 to 2pm is your prime feed-watching window.",
    },
    evening: {
      label: "Silent Observer",
      description: "You see everything. You comment on nothing.",
    },
  },
  creator: {
    night: {
      label: "Midnight Poster",
      description: "Your best posts go up when everyone else is asleep.",
    },
    morning: {
      label: "Sunrise Storyteller",
      description: "Mornings are for posting, the rest is for replies.",
    },
    afternoon: {
      label: "Daylight Documenter",
      description: "If it happens between noon and 6pm, it's a story.",
    },
    evening: {
      label: "Golden-Hour Creator",
      description: "Your feed has a sunset filter that won't quit.",
    },
  },
  explorer: {
    night: {
      label: "Late-Night Rabbit Hole Diver",
      description: "Three accounts in, you've found something incredible.",
    },
    morning: {
      label: "Morning Discoverer",
      description: "You wake up with new accounts to follow.",
    },
    afternoon: {
      label: "Curious Wanderer",
      description: "Your feed is a museum, and you're the visitor.",
    },
    evening: {
      label: "Evening Explorer",
      description: "Twilight is for finding people you'd never have met.",
    },
  },
};
