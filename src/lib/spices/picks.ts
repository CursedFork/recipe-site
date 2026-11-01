/* ---------------------------------------------------------------------------
   Top picks and Buy next, worked out from the cabinet.

   Pure functions, so the counts are tested. Ships to the browser.
   --------------------------------------------------------------------------- */

import type { LeanFoodRef } from "./blend-filter";
import { statusOf, type FinderBlend } from "./finder";
import { compareNames } from "./text";

export const TOP_FOODS = 8;
export const TOP_CUISINES = 5;
export const TOP_BUY = 10;

export interface FoodPickCount {
  groupId: string;
  itemId: string | null;
  name: string;
  /** Classic counts 2 and also-works counts 1, summed over ready blends. */
  score: number;
  readyBlends: number;
}

export interface CuisineCount {
  cuisine: string;
  readyBlends: number;
}

export interface TopPicks {
  readyCount: number;
  foods: FoodPickCount[];
  cuisines: CuisineCount[];
}

const foodKey = (ref: LeanFoodRef) => `${ref.groupId}:${ref.itemId ?? ""}`;

/** Ready blends are the ones with nothing required missing. */
export function topPicks(blends: readonly FinderBlend[], owned: ReadonlySet<string>): TopPicks {
  const foods = new Map<string, FoodPickCount>();
  const cuisines = new Map<string, number>();
  let readyCount = 0;

  for (const blend of blends) {
    if (statusOf(blend, owned).missing.length > 0) continue;
    readyCount += 1;

    // A food named twice in one blend counts once, as classic.
    const weights = new Map<string, { ref: LeanFoodRef; weight: number }>();
    for (const ref of blend.also) weights.set(foodKey(ref), { ref, weight: 1 });
    for (const ref of blend.classic) weights.set(foodKey(ref), { ref, weight: 2 });

    for (const [key, { ref, weight }] of weights) {
      const current = foods.get(key) ?? {
        groupId: ref.groupId,
        itemId: ref.itemId,
        name: ref.name,
        score: 0,
        readyBlends: 0,
      };
      current.score += weight;
      current.readyBlends += 1;
      foods.set(key, current);
    }

    for (const cuisine of blend.cuisines) {
      if (cuisine === "Global") continue;
      cuisines.set(cuisine, (cuisines.get(cuisine) ?? 0) + 1);
    }
  }

  return {
    readyCount,
    foods: [...foods.values()]
      .sort((a, b) => b.score - a.score || compareNames(a.name, b.name))
      .slice(0, TOP_FOODS),
    cuisines: [...cuisines]
      .map(([cuisine, readyBlends]) => ({ cuisine, readyBlends }))
      .sort((a, b) => b.readyBlends - a.readyBlends || compareNames(a.cuisine, b.cuisine))
      .slice(0, TOP_CUISINES),
  };
}

export interface BuyNext {
  slug: string;
  name: string;
  /** Blends that only lack this one spice, so buying it makes them ready. */
  unlocks: number;
  /** Blends that lack this and exactly one other spice. */
  closer: number;
}

/**
 * Among blends missing one or two required spices, how many would each
 * missing spice help with? Staples are always counted as owned here, so salt
 * is never suggested, whatever the staples switch says. Optional spices are
 * never suggested.
 *
 * "Unlocks" is the honest number: blends this spice alone completes. Blends
 * missing two are counted separately as "closer", because one spice does not
 * finish them.
 */
export function buyNext(
  blends: readonly FinderBlend[],
  owned: ReadonlySet<string>,
  stapleSlugs: readonly string[],
): BuyNext[] {
  const counted = new Set([...owned, ...stapleSlugs]);
  const spices = new Map<string, BuyNext>();

  for (const blend of blends) {
    const { missing } = statusOf(blend, counted);
    if (missing.length === 0 || missing.length > 2) continue;

    for (const ingredient of missing) {
      const current = spices.get(ingredient.slug) ?? {
        slug: ingredient.slug,
        name: ingredient.name,
        unlocks: 0,
        closer: 0,
      };
      if (missing.length === 1) current.unlocks += 1;
      else current.closer += 1;
      spices.set(ingredient.slug, current);
    }
  }

  return [...spices.values()]
    .sort((a, b) => b.unlocks - a.unlocks || b.closer - a.closer || compareNames(a.name, b.name))
    .slice(0, TOP_BUY);
}
