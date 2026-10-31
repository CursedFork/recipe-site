/* ---------------------------------------------------------------------------
   Searching and filtering blends, and how well a blend suits a food.

   Pure functions, so the rules are tested. Ships to the browser, so it imports
   only other browser-safe files. How a blend fits the visitor's cabinet comes
   in a later phase and builds on this.
   --------------------------------------------------------------------------- */

import { compareNames } from "./text";

export interface LeanFoodRef {
  groupId: string;
  /** Null when the blend names the whole group. */
  itemId: string | null;
  name: string;
}

/** The lean shape of a blend that the browse page needs. */
export interface LibraryBlend {
  slug: string;
  name: string;
  aka: string[];
  cuisines: string[];
  uses: string[];
  methods: string[];
  classic: LeanFoodRef[];
  also: LeanFoodRef[];
  /** Names of every spice in it, so a search for "cumin" finds garam masala. */
  ingredientNames: string[];
  ingredientCount: number;
  goEasy: Array<{ name: string; power: number; optional: boolean }>;
  allergens: string[];
}

/** A food the visitor picked: a whole group, or one item inside a group. */
export interface FoodPick {
  groupId: string;
  itemId: string | null;
}

export type Fit = "classic" | "also";

/** The picker's value as text: "g:beef" for a group, "i:beef:steak" for an item. */
export function encodePick(pick: FoodPick | null): string {
  if (pick === null) return "";
  return pick.itemId === null ? `g:${pick.groupId}` : `i:${pick.groupId}:${pick.itemId}`;
}

export function decodePick(value: string): FoodPick | null {
  const [kind, groupId, itemId] = value.split(":");
  if (kind === "g" && groupId) return { groupId, itemId: null };
  if (kind === "i" && groupId && itemId) return { groupId, itemId };
  return null;
}

/**
 * Does a blend's food suit the picked food?
 *
 * A blend that names a group suits every item in it. A blend that names one
 * item suits only that item. Picking a group suits any blend naming the group
 * or any item inside it.
 */
function refMatches(ref: LeanFoodRef, pick: FoodPick): boolean {
  if (ref.groupId !== pick.groupId) return false;
  if (pick.itemId === null) return true;
  return ref.itemId === null || ref.itemId === pick.itemId;
}

/** Classic beats also, so a food listed as both counts as classic. */
export function fitFor(blend: LibraryBlend, pick: FoodPick): Fit | null {
  if (blend.classic.some((ref) => refMatches(ref, pick))) return "classic";
  if (blend.also.some((ref) => refMatches(ref, pick))) return "also";
  return null;
}

export interface BlendFilters {
  query: string;
  cuisine: string;
  uses: string[];
  methods: string[];
  food: FoodPick | null;
  /** With a food picked, also list blends that do not mention it. */
  showAll: boolean;
}

export const noBlendFilters: BlendFilters = {
  query: "",
  cuisine: "",
  uses: [],
  methods: [],
  food: null,
  showAll: false,
};

export function isFilteringBlends(filters: BlendFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.cuisine !== "" ||
    filters.uses.length > 0 ||
    filters.methods.length > 0 ||
    filters.food !== null ||
    filters.showAll
  );
}

const plain = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Every word typed must appear in the name, an alias or an ingredient. */
export function blendMatchesQuery(blend: LibraryBlend, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = plain([blend.name, ...blend.aka, ...blend.ingredientNames].join(" | "));
  return words.every((word) => haystack.includes(word));
}

export interface BlendResult {
  blend: LibraryBlend;
  fit: Fit | null;
}

const FIT_RANK = { classic: 0, also: 1 } as const;

/**
 * Different filters must all match. Several uses, or several methods, match
 * any of them. Sorted by fit, then name, when a food is picked; by name
 * otherwise.
 */
export function filterBlends(blends: readonly LibraryBlend[], filters: BlendFilters): BlendResult[] {
  const results: BlendResult[] = [];

  for (const blend of blends) {
    if (!blendMatchesQuery(blend, filters.query)) continue;

    if (
      filters.cuisine !== "" &&
      !blend.cuisines.includes(filters.cuisine) &&
      !blend.cuisines.includes("Global")
    ) {
      continue;
    }

    if (filters.uses.length > 0 && !filters.uses.some((use) => blend.uses.includes(use))) continue;
    if (filters.methods.length > 0 && !filters.methods.some((method) => blend.methods.includes(method))) continue;

    const fit = filters.food ? fitFor(blend, filters.food) : null;
    if (filters.food && fit === null && !filters.showAll) continue;

    results.push({ blend, fit });
  }

  return results.sort((a, b) => {
    const rankA = a.fit ? FIT_RANK[a.fit] : 2;
    const rankB = b.fit ? FIT_RANK[b.fit] : 2;
    return rankA - rankB || compareNames(a.blend.name, b.blend.name);
  });
}
