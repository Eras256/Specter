/**
 * Text utilities shared by the detection signals. Kept deliberately small and
 * dependency-free so the moat (provenance tracing) is easy to audit.
 */

// Zero-width / invisible / bidi characters used to smuggle hidden instructions.
// Built from explicit code points (no invisible literals in source):
// ZWSP..RLM, bidi embeddings/overrides, word-joiner range, soft hyphen, BOM.
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u00AD\uFEFF]/g;
// Unicode combining marks (for de-accenting after NFKD normalization).
const COMBINING_MARKS = /[\u0300-\u036F]/g;

/** Strip zero-width / invisible characters used to smuggle instructions. */
export function stripInvisible(s: string): string {
  return s.replace(ZERO_WIDTH, '');
}

/** Normalize for comparison: lowercase, de-accent, collapse whitespace. */
export function normalize(s: string): string {
  return stripInvisible(s)
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split into comparable tokens (alphanumeric runs of length >= 2). */
export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

/**
 * Does `needle` plausibly trace back to `haystack`? True when the normalized
 * needle is a substring of the haystack, or when a strong majority of the
 * needle's tokens appear in the haystack. Used to ask: "did this payee come
 * from what the user actually asked for?"
 */
export function tracesTo(needle: string | undefined, haystack: string): boolean {
  if (!needle) return false;
  const n = normalize(needle);
  const h = normalize(haystack);
  if (n.length === 0) return false;
  if (h.includes(n)) return true;

  const needleTokens = tokenize(needle);
  if (needleTokens.length === 0) return false;
  const hayTokens = new Set(tokenize(haystack));
  const hits = needleTokens.filter((t) => hayTokens.has(t)).length;
  // Identifier-like destinations (acct_xxx) won't token-overlap; require a
  // clear majority so a single coincidental word doesn't count as provenance.
  return hits / needleTokens.length >= 0.6;
}
