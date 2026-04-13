/**
 * Data-only fixture table for the `adPersonality` module.
 *
 * Each rule maps a group name to a list of substring keywords. An ad
 * interest matches a group if any keyword appears (case-insensitive) inside
 * the interest's `name`. The first matching rule wins; unmatched interests
 * fall into the "Other" group.
 *
 * The `EMBARRASSING_KEYWORDS` list drives the punchline pick — the first
 * interest matching one of these is surfaced as the "most embarrassing"
 * category for the card.
 */

export type AdGroupRule = {
  name: string;
  keywords: string[];
};

export const AD_GROUPS: AdGroupRule[] = [
  {
    name: "Financial",
    keywords: ["income", "household", "credit", "investor", "wealth", "loan"],
  },
  {
    name: "Tech",
    keywords: ["mobile", "wi-fi", "wifi", "device", "browser", "operating system", "android", "ios"],
  },
  {
    name: "Demographic",
    keywords: ["age", "gender", "education", "language"],
  },
  {
    name: "Lifestyle",
    keywords: ["travel", "coffee", "yoga", "fitness", "food", "fashion", "health", "music"],
  },
  {
    name: "Advertiser",
    keywords: [], // matched separately via the `group: "Advertiser"` field
  },
];

/**
 * Categories that make for a punchline. The first interest matching any of
 * these is surfaced on the card as "Instagram thinks you're a Wi-Fi user."
 */
export const EMBARRASSING_KEYWORDS: string[] = [
  "wi-fi",
  "wifi",
  "mobile network",
  "potential mobile",
  "household income",
  "facebook access",
  "device change",
];
