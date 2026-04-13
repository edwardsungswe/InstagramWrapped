/**
 * Data-only fixture table for the `contentCategories` module.
 *
 * Each rule maps a category name to a list of substring keywords. A handle
 * matches a category if any of its keywords appear (case-insensitive) inside
 * the handle. The first matching rule wins.
 *
 * Editing categories = editing strings, no algorithm or test changes
 * required. PLAN.md notes this rules table can be upgraded to embeddings in
 * a future phase if accuracy becomes a problem.
 */

export type CategoryRule = {
  name: string;
  keywords: string[];
};

export const CATEGORY_RULES: CategoryRule[] = [
  {
    name: "Memes",
    keywords: ["meme", "funny", "wholesome", "shitpost", "chuckle", "lol"],
  },
  {
    name: "Fitness",
    keywords: ["fit", "gym", "workout", "lift", "run", "yoga", "athlete"],
  },
  {
    name: "Food",
    keywords: ["food", "recipe", "chef", "eat", "cafe", "restaurant", "cook", "bake"],
  },
  {
    name: "Travel",
    keywords: ["travel", "wanderlust", "nomad", "adventure", "explore", "voyage"],
  },
  {
    name: "Fashion",
    keywords: ["style", "fashion", "outfit", "ootd", "model", "clothing"],
  },
  {
    name: "Music",
    keywords: ["music", "band", "song", "spotify", "dj", "guitar", "drum"],
  },
  {
    name: "Art",
    keywords: ["art", "draw", "paint", "design", "illust", "sketch", "studio"],
  },
  {
    name: "Animals",
    keywords: ["dog", "cat", "pet", "puppy", "kitten", "doggo", "animal"],
  },
  {
    name: "Politics & News",
    keywords: ["news", "politic", "world", "daily"],
  },
];
