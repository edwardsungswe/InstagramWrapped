/**
 * Tiny glob matcher used by the file manifest's capability checks.
 *
 * Supported patterns:
 *   - Literal segments:    your_instagram_activity/likes/liked_posts.json
 *   - `*`  matches a single path segment (no slashes)
 *   - `**` matches any number of segments (including zero)
 *
 * Examples:
 *   matches("a/b/c.json", "a/b/c.json")     → true
 *   matches("a/b/c.json", "a/*\/c.json")    → true
 *   matches("a/b/c/d.json", "a/*\/c.json")  → false
 *   matches("a/b/c/d.json", "a/**\/d.json") → true
 *   matches("a/b/c.json", "a/**")           → true
 */
export function matches(path: string, pattern: string): boolean {
  return patternToRegExp(pattern).test(path);
}

const cache = new Map<string, RegExp>();

function patternToRegExp(pattern: string): RegExp {
  const cached = cache.get(pattern);
  if (cached) return cached;

  let re = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];

    if (c === "*" && pattern[i + 1] === "*") {
      // `**` — match any number of segments (including zero).
      // Allow an optional trailing slash so `a/**` matches `a` itself.
      const hasTrailingSlash = pattern[i + 2] === "/";
      if (hasTrailingSlash) {
        re += "(?:.*/)?";
        i += 3;
      } else {
        re += ".*";
        i += 2;
      }
      continue;
    }

    if (c === "*") {
      // `*` — match exactly one segment (no slashes).
      re += "[^/]*";
      i += 1;
      continue;
    }

    // Escape regex metacharacters in literal chars.
    if (/[.+?^${}()|[\]\\]/.test(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
    i += 1;
  }
  re += "$";

  const compiled = new RegExp(re);
  cache.set(pattern, compiled);
  return compiled;
}
