/* ---------------------------------------------------------------------------
   Searching, filtering and grouping the spice library.

   Pure functions, so the rules are tested. Ships to the browser, so it
   imports nothing from the build-time code.
   --------------------------------------------------------------------------- */

/** The lean shape of a spice that the library page needs. */
export interface LibrarySpice {
  slug: string;
  name: string;
  /** What to show in the list: the variety alone for a family member. */
  label: string;
  aka: string[];
  category: string;
  /** The slug of the umbrella spice, when this is a member of a family. */
  familySlug: string | null;
  power: number | null;
  heat: number | null;
  cuisines: string[];
  forms: string[];
  flavor: string[];
}

export type View = "all" | "owned" | "missing";

export interface Filters {
  query: string;
  categories: string[];
  /** Empty means any. "Global" spices match every cuisine. */
  cuisine: string;
  /** Only Power 4 and 5, the ones to go easy with. */
  goEasy: boolean;
  view: View;
}

export const noFilters: Filters = {
  query: "",
  categories: [],
  cuisine: "",
  goEasy: false,
  view: "all",
};

export function isFiltering(filters: Filters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.cuisine !== "" ||
    filters.goEasy ||
    filters.view !== "all"
  );
}

/** Lowercase, accents removed, so "arbol" finds "Árbol". */
const plain = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Every word typed must appear somewhere in the name or an alias. */
export function matchesQuery(spice: LibrarySpice, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = plain([spice.name, ...spice.aka].join(" | "));
  return words.every((word) => haystack.includes(word));
}

/**
 * Keeps the order it was given, which is the library's own order: an umbrella
 * first, then its varieties, then the next spice.
 *
 * Different filters must all match. Several categories match any of them.
 */
export function filterSpices(
  spices: readonly LibrarySpice[],
  filters: Filters,
  owned: ReadonlySet<string>,
): LibrarySpice[] {
  return spices.filter((spice) => {
    if (!matchesQuery(spice, filters.query)) return false;

    if (filters.categories.length > 0 && !filters.categories.includes(spice.category)) return false;

    if (
      filters.cuisine !== "" &&
      !spice.cuisines.includes(filters.cuisine) &&
      !spice.cuisines.includes("Global")
    ) {
      return false;
    }

    if (filters.goEasy && !(spice.power !== null && spice.power >= 4)) return false;

    if (filters.view === "owned" && !owned.has(spice.slug)) return false;
    if (filters.view === "missing" && owned.has(spice.slug)) return false;

    return true;
  });
}

export interface LetterGroup {
  letter: string;
  spices: LibrarySpice[];
}

/** Groups by the first letter of the name, in the order given. */
export function groupByLetter(spices: readonly LibrarySpice[]): LetterGroup[] {
  const groups: LetterGroup[] = [];

  for (const spice of spices) {
    const first = plain(spice.name).charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    const last = groups[groups.length - 1];

    if (last && last.letter === letter) last.spices.push(spice);
    else groups.push({ letter, spices: [spice] });
  }

  return groups;
}

/**
 * The slugs a staples list stands for. Naming an umbrella counts every member
 * of its family, the same rule blends use.
 */
export function stapleSlugs(
  spices: ReadonlyArray<{ slug: string; name: string; family: string | null }>,
  staples: readonly string[],
): string[] {
  const wanted = new Set(staples.map(plain));

  return spices
    .filter(
      (spice) =>
        wanted.has(plain(spice.name)) || (spice.family !== null && wanted.has(plain(spice.family))),
    )
    .map((spice) => spice.slug);
}
