/* ---------------------------------------------------------------------------
   The blend data the finder, the hub and the blend pages hand to their
   islands. Build time only: it reads the whole library.

   One place, so the pages cannot drift apart on what a blend line means.
   --------------------------------------------------------------------------- */

import foodsJson from "../../data/foods.json";
import { staples } from "../../config/pantry";
import type { FoodGroup } from "../../islands/spices/BlendBrowser";
import type { LeanFoodRef } from "./blend-filter";
import type { FinderBlend, FinderIngredient } from "./finder";
import { stapleSlugs } from "./library-filter";
import { loadLibrary } from "./load-spices";
import type { FoodRef } from "./types";
import { methods, uses } from "./vocab";

const lean = (ref: FoodRef): LeanFoodRef => ({ groupId: ref.groupId, itemId: ref.itemId, name: ref.name });

/** "Pepper, black" is "black pepper" when said aloud. */
const say = (name: string) => {
  const [first, second] = name.split(", ");
  return second ? `${second} ${first}`.toLowerCase() : name.toLowerCase();
};

export function buildFinderData() {
  const library = loadLibrary();
  const bySlug = new Map(library.spices.map((spice) => [spice.slug, spice]));

  const ingredientFor = (slug: string, name: string, optional: boolean): FinderIngredient => {
    const spice = bySlug.get(slug);
    const umbrellaSlug = spice?.family
      ? library.spices.find((other) => other.name === spice.family)?.slug ?? null
      : null;
    return {
      slug,
      name: spice?.name ?? name,
      optional,
      members: library.families.get(slug) ?? [],
      siblings:
        umbrellaSlug === null
          ? []
          : (library.families.get(umbrellaSlug) ?? [])
              .filter((member) => member !== slug)
              .map((member) => ({ slug: member, name: bySlug.get(member)?.name ?? member })),
    };
  };

  const blends: FinderBlend[] = library.blends.map((blend) => ({
    slug: blend.slug,
    name: blend.name,
    aka: blend.aka,
    cuisines: blend.cuisines,
    uses: blend.uses,
    methods: blend.methods,
    classic: blend.classic.map(lean),
    also: blend.also.map(lean),
    ingredientNames: blend.ingredients.map((i) => bySlug.get(i.spiceSlug)?.name ?? i.name),
    ingredientCount: blend.ingredients.length,
    goEasy: blend.goEasy,
    allergens: blend.allergens,
    ingredients: blend.ingredients.map((i) => ingredientFor(i.spiceSlug, i.name, i.optional)),
  }));

  const cuisines = [...new Set(blends.flatMap((blend) => blend.cuisines))]
    .filter((cuisine) => cuisine !== "Global")
    .sort((a, b) => a.localeCompare(b));

  const usedUses = new Set(blends.flatMap((blend) => blend.uses));
  const usedMethods = new Set(blends.flatMap((blend) => blend.methods));

  const foodGroups: FoodGroup[] = (foodsJson as { groups: FoodGroup[] }).groups.map((group) => ({
    id: group.id,
    name: group.name,
    items: group.items.map((item) => ({ id: item.id, name: item.name })),
  }));

  const spoken = staples.map(say);
  const stapleNote =
    spoken.length > 1 ? `${spoken.slice(0, -1).join(", ")} and ${spoken[spoken.length - 1]}` : spoken[0];

  return {
    blends,
    cuisines,
    uses: uses.names.filter((name) => usedUses.has(name)),
    methods: methods.names.filter((name) => usedMethods.has(name)),
    foodGroups,
    stapleList: stapleSlugs(
      library.spices.map((spice) => ({ slug: spice.slug, name: spice.name, family: spice.family })),
      staples,
    ),
    stapleNote,
    spiceNames: library.spices.map((spice) => ({ slug: spice.slug, name: spice.name })),
  };
}
