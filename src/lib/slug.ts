/* ---------------------------------------------------------------------------
   Filenames to URLs.

   The filename IS the slug. There is no transformation step, on purpose: if a
   filename does not already comply, that is a build error rather than
   something the build quietly rewrites. Silently mangling "Chicken Tikka.txt"
   into "chicken-tikka" means the file you are looking at and the URL you get
   are two different things, and when it goes wrong you have no idea why.
   --------------------------------------------------------------------------- */

/**
 * Lowercase letters and digits, in groups separated by single hyphens.
 *
 * Allowed:     chicken-tikka-masala.txt   ->  /recipes/chicken-tikka-masala
 *              pasta-e-fagioli.txt        ->  /recipes/pasta-e-fagioli
 *              soup-3-ways.txt            ->  /recipes/soup-3-ways
 *
 * Rejected:    Chicken Tikka.txt          (capitals, space)
 *              chicken_tikka.txt          (underscore)
 *              chicken--tikka.txt         (double hyphen)
 *              -chicken.txt               (leading hyphen)
 *              chicken-.txt               (trailing hyphen)
 *              café.txt                   (needs escaping in a URL)
 *
 * Nothing in this pattern needs percent-encoding in a URL path, which is the
 * whole point of it.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface SlugResult {
  slug: string | null;
  /** Human-readable reason, when the filename is not usable as a slug. */
  problem: string | null;
}

/**
 * Turn a recipe filename into its URL slug, or explain why it cannot be one.
 * Takes the bare filename, for example "chicken-tikka-masala.txt".
 */
export function slugFromFilename(filename: string): SlugResult {
  if (!filename.endsWith(".txt")) {
    return {
      slug: null,
      problem: `must be a .txt file (found "${filename}")`,
    };
  }

  const base = filename.slice(0, -".txt".length);

  if (base.length === 0) {
    return { slug: null, problem: "filename is empty apart from the extension" };
  }

  if (SLUG_PATTERN.test(base)) {
    return { slug: base, problem: null };
  }

  // Say precisely what is wrong, rather than just "invalid". The point of
  // refusing is to get the file renamed, so the message has to be actionable.
  const reasons: string[] = [];
  if (/[A-Z]/.test(base)) reasons.push("capital letters");
  if (/\s/.test(base)) reasons.push("spaces");
  if (/_/.test(base)) reasons.push("underscores");
  if (/--/.test(base)) reasons.push("a double hyphen");
  if (/^-/.test(base)) reasons.push("a leading hyphen");
  if (/-$/.test(base)) reasons.push("a trailing hyphen");
  if (/\./.test(base)) reasons.push("a full stop");
  if (/[^a-zA-Z0-9\-_\s.]/.test(base)) {
    reasons.push("characters that would need escaping in a URL");
  }

  const detail = reasons.length > 0 ? reasons.join(", ") : "characters outside a to z, 0 to 9 and hyphens";

  return {
    slug: null,
    problem:
      `filename cannot be used as a URL because it contains ${detail}. ` +
      `Use lowercase letters, numbers and single hyphens, for example "${suggest(base)}.txt"`,
  };
}

/**
 * A suggested compliant filename, offered in the error message only. The build
 * never applies this itself: renaming the file is your decision, not the
 * build's.
 */
function suggest(base: string): string {
  const suggestion = base
    .normalize("NFKD")
    // Strip accents, so "café" suggests "cafe".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return suggestion.length > 0 ? suggestion : "my-recipe";
}
