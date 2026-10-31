/* ---------------------------------------------------------------------------
   Small text helpers shared by everything in the Spices section.

   Build time only.
   --------------------------------------------------------------------------- */

/**
 * The form of a word used for comparing: accents removed, lowercase, runs of
 * spaces collapsed. "Sauté" and "saute" are the same word to a reader, so they
 * must be the same word to the build.
 */
export function norm(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The filename a name must have.
 *
 * Lowercase, accents removed, apostrophes dropped, every other run of
 * non-letters becomes one hyphen. "Pepper, black: Tellicherry" is
 * "pepper-black-tellicherry" and "Za'atar" is "zaatar".
 */
export function slugifyName(name: string): string {
  return norm(name)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A sort key that puts an umbrella spice first and its varieties straight
 * after it. The comma and the colon are swapped for characters that sort
 * before any letter, so "Pepper, black" comes before "Pepper, black: Malabar",
 * which comes before "Pepper, white", which comes before "Pepperoncini".
 */
export function nameSortKey(name: string): string {
  return norm(name).replace(/, /g, "\u0001").replace(/: /g, "\u0002");
}

export function compareNames(a: string, b: string): number {
  const x = nameSortKey(a);
  const y = nameSortKey(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Levenshtein distance. Small inputs, so the plain version is fine. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * The closest candidates to a mistyped word, so an error can say what was
 * probably meant instead of only what was wrong.
 *
 * A candidate is compared whole and also by its last segment, so a mistyped
 * "Tellichery" still finds "Pepper, black: Tellicherry".
 */
export function suggest(target: string, candidates: readonly string[], limit = 3): string[] {
  const wanted = norm(target);
  const tolerance = Math.max(2, Math.floor(wanted.length / 3));

  const seen = new Set<string>();
  const scored: Array<{ name: string; score: number }> = [];

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    const whole = norm(candidate);
    const segments = whole.split(/, |: /);
    const last = segments[segments.length - 1];

    // A word that is the start of a real name is a good guess even when the
    // rest is long: "cooking base" for "Cooking base or sauce".
    const prefix = wanted.length >= 4 && whole.startsWith(wanted) ? 1 : Infinity;

    const score = Math.min(distance(wanted, whole), distance(wanted, last), prefix);
    if (score <= tolerance) scored.push({ name: candidate, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || compareNames(a.name, b.name))
    .slice(0, limit)
    .map((entry) => entry.name);
}

/** The last path segment without ".txt", which is the file's address. */
export function slugOfPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.txt$/, "");
}

export function truncate(text: string, length = 60): string {
  const clean = text.trim();
  return clean.length <= length ? clean : `${clean.slice(0, length)}...`;
}
