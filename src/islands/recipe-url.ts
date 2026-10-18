/* ---------------------------------------------------------------------------
   The filter state lives in the URL query string, so a filtered view can be
   shared and the back button undoes a filter.

   Shape:  /?q=tomato&cuisine=Indian,Thai&meal=dinner&healthy=1

   Empty values are left out entirely rather than written as blanks, so an
   unfiltered home page has a clean "/" with no query string hanging off it.
   --------------------------------------------------------------------------- */

import { EMPTY_FILTERS, type Filters } from "./recipe-types";

export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();

  const query = filters.query.trim();
  if (query.length > 0) params.set("q", query);
  if (filters.cuisines.length > 0) params.set("cuisine", filters.cuisines.join(","));
  if (filters.meals.length > 0) params.set("meal", filters.meals.join(","));
  if (filters.healthyOnly) params.set("healthy", "1");

  const search = params.toString();
  return search.length > 0 ? `?${search}` : "";
}

/**
 * Read filters back out of a query string.
 *
 * Deliberately forgiving about what it finds, because this input comes from a
 * URL someone may have edited or truncated. `validCuisines` and `validMeals`
 * are the values actually present in the collection: anything else is dropped,
 * so a stale shared link cannot leave a filter chip active that matches
 * nothing and looks broken.
 */
export function searchToFilters(
  search: string,
  validCuisines: string[],
  validMeals: string[],
): Filters {
  const params = new URLSearchParams(search);

  const list = (key: string, valid: string[]): string[] => {
    const raw = params.get(key);
    if (raw === null) return [];

    const allowed = new Map(valid.map((value) => [value.toLowerCase(), value]));
    const seen = new Set<string>();

    return raw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      // Match case-insensitively but store the collection's own spelling, so a
      // hand-typed "?cuisine=indian" still lights up the "Indian" chip.
      .map((part) => allowed.get(part.toLowerCase()))
      .filter((value): value is string => value !== undefined)
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
  };

  return {
    ...EMPTY_FILTERS,
    query: params.get("q") ?? "",
    cuisines: list("cuisine", validCuisines),
    meals: list("meal", validMeals),
    healthyOnly: params.get("healthy") === "1",
  };
}

