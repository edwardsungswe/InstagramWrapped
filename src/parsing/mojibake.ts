/**
 * Instagram's data export double-encodes UTF-8 strings as Latin-1, so a heart
 * emoji `❤` (UTF-8 bytes E2 9D A4) appears in JSON as the three-character
 * string "\u00e2\u009d\u00a4". This function reverses that: it reads each JS
 * string char as a Latin-1 byte and decodes the resulting byte sequence as
 * UTF-8.
 *
 * It is intentionally lossy on input that isn't broken in this specific way:
 * if the re-decoded bytes contain replacement characters (U+FFFD), we treat
 * the input as already-clean and return it unchanged.
 */
export function fixMojibake(s: string): string {
  if (!s) return s;

  // Fast path: ASCII-only strings have nothing to fix.
  let needsFix = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0x7f) {
      needsFix = true;
      break;
    }
    if (c > 0xff) return s; // Non-Latin-1 chars mean it's already correct UTF-16.
  }
  if (!needsFix) return s;

  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0xff) return s; // Non-Latin-1 → already correct.
    bytes[i] = c;
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (decoded.includes("\uFFFD")) return s;
    return decoded;
  } catch {
    return s;
  }
}

/**
 * Recursively walks an object/array and applies fixMojibake to every string
 * value. Returns a new value; does not mutate the input.
 */
export function fixMojibakeDeep<T>(value: T): T {
  if (typeof value === "string") {
    return fixMojibake(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => fixMojibakeDeep(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = fixMojibakeDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}
