/* ---------------------------------------------------------------------------
   The shape of the data the home page hands to its React island.

   This is deliberately small and flat. Everything expensive (parsing the
   recipe files, generating the optimised images) happens at build time in
   Astro; the island receives only what it needs to render a card and filter
   the list.
   --------------------------------------------------------------------------- */

export interface CardPhoto {
  /** Fallback src, already optimised and in a modern format. */
  src: string;
  /** Responsive sources, so a phone does not download a desktop-sized image. */
  srcSet: string;
  /** Explicit dimensions, so the card never changes height as the photo loads. */
  width: number;
  height: number;
}

export interface RecipeCardData {
  slug: string;
  title: string;
  cuisine: string;
  meals: string[];
  healthy: boolean;
  /** Minutes. */
  prep: number;
  cook: number;
  photo: CardPhoto | null;
  /**
   * Lowercased title plus every ingredient's item text, joined.
   *
   * Built on the server so the browser does nothing but a substring check.
   * It contains the ingredient ITEM only, never the amount, which is what
   * makes searching "tomato" find "1 1/2 cups tomato puree" while searching
   * "1" does not match every recipe in the collection.
   */
  searchText: string;
}

/** The filter state, which is also exactly what goes in the URL. */
export interface Filters {
  query: string;
  cuisines: string[];
  meals: string[];
  healthyOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  query: "",
  cuisines: [],
  meals: [],
  healthyOnly: false,
};

/** Canonical meal order, so the chips never reshuffle. */
export const MEAL_ORDER = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
] as const;

export function hasAnyFilter(filters: Filters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.cuisines.length > 0 ||
    filters.meals.length > 0 ||
    filters.healthyOnly
  );
}
