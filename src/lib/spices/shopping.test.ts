/* ---------------------------------------------------------------------------
   Tests for the shopping list and for the Top picks and Buy next counts.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { addMany, emptyCabinet } from "./cabinet";
import type { LeanFoodRef } from "./blend-filter";
import type { FinderBlend, FinderIngredient } from "./finder";
import { buyNext, topPicks } from "./picks";
import {
  addToList,
  emptyList,
  listAsText,
  markAllCheckedBought,
  markBought,
  parseList,
  removeFromList,
  serializeList,
  setChecked,
  unknownOnList,
} from "./shopping";

const spice = (slug: string, extra: Partial<FinderIngredient> = {}): FinderIngredient => ({
  slug,
  name: slug[0].toUpperCase() + slug.slice(1),
  optional: false,
  members: [],
  siblings: [],
  ...extra,
});
const food = (groupId: string, itemId: string | null = null): LeanFoodRef => ({
  groupId,
  itemId,
  name: itemId ?? groupId,
});

function blend(name: string, ingredients: FinderIngredient[], extra: Partial<FinderBlend> = {}): FinderBlend {
  return {
    slug: name.toLowerCase(),
    name,
    aka: [],
    cuisines: ["Indian"],
    uses: [],
    methods: [],
    classic: [],
    also: [],
    ingredientNames: [],
    ingredientCount: ingredients.length,
    goEasy: [],
    allergens: [],
    ingredients,
    ...extra,
  };
}

describe("the shopping list", () => {
  it("adds without duplicates and keeps the order", () => {
    const list = addToList(addToList(emptyList, ["cumin", "clove"]), ["clove", "mace"]);
    expect(list.items.map((i) => i.slug)).toEqual(["cumin", "clove", "mace"]);
  });

  it("ticks and removes", () => {
    const list = setChecked(addToList(emptyList, ["cumin", "clove"]), "clove", true);
    expect(list.items[1].checked).toBe(true);
    expect(removeFromList(list, "cumin").items.map((i) => i.slug)).toEqual(["clove"]);
  });

  it("Bought it moves the spice into the cabinet", () => {
    const list = addToList(emptyList, ["cumin", "clove"]);
    const result = markBought(list, addMany(emptyCabinet, ["mace"]), "cumin");
    expect(result.list.items.map((i) => i.slug)).toEqual(["clove"]);
    expect(result.cabinet.owned).toEqual(["cumin", "mace"]);
  });

  it("Bought it for every ticked item leaves the unticked ones", () => {
    const list = setChecked(setChecked(addToList(emptyList, ["a", "b", "c"]), "a", true), "c", true);
    const result = markAllCheckedBought(list, emptyCabinet);
    expect(result.list.items.map((i) => i.slug)).toEqual(["b"]);
    expect(result.cabinet.owned).toEqual(["a", "c"]);
  });

  it("copies as plain text", () => {
    const list = setChecked(addToList(emptyList, ["cumin", "clove"]), "clove", true);
    expect(listAsText(list, (slug) => slug.toUpperCase())).toBe("[ ] CUMIN\n[x] CLOVE");
  });

  it("survives a round trip and bad saved text", () => {
    const list = setChecked(addToList(emptyList, ["cumin"]), "cumin", true);
    expect(parseList(serializeList(list))).toEqual(list);
    expect(parseList(null)).toEqual(emptyList);
    expect(parseList("not json")).toEqual(emptyList);
    const messy = JSON.stringify({ items: [{ slug: "a" }, { slug: "a" }, 5, { slug: "" }] });
    expect(parseList(messy).items).toEqual([{ slug: "a", checked: false }]);
  });

  it("lists saved spices no longer in the library", () => {
    const list = addToList(emptyList, ["cumin", "gone"]);
    expect(unknownOnList(list, new Set(["cumin"]))).toEqual(["gone"]);
  });
});

describe("Top picks", () => {
  const eggs = blend("Eggs Mix", [spice("a")], { classic: [food("eggs")], cuisines: ["French"] });
  const eggsToo = blend("Eggs Too", [spice("a")], { also: [food("eggs")], cuisines: ["French", "Global"] });
  const beef = blend("Beef Rub", [spice("a")], { classic: [food("beef", "steak")], also: [food("eggs")] });
  const notReady = blend("Far", [spice("a"), spice("zzz")], { classic: [food("pork")], cuisines: ["Thai"] });
  const all = [eggs, eggsToo, beef, notReady];

  it("counts a classic food as 2 and an also-works food as 1, from ready blends only", () => {
    const picks = topPicks(all, new Set(["a"]));
    expect(picks.readyCount).toBe(3);
    expect(picks.foods[0]).toMatchObject({ groupId: "eggs", score: 2 + 1 + 1, readyBlends: 3 });
    expect(picks.foods[1]).toMatchObject({ groupId: "beef", itemId: "steak", score: 2, readyBlends: 1 });
    expect(picks.foods.some((f) => f.groupId === "pork")).toBe(false);
  });

  it("counts cuisines by ready blends and leaves out Global", () => {
    const picks = topPicks(all, new Set(["a"]));
    expect(picks.cuisines[0]).toEqual({ cuisine: "French", readyBlends: 2 });
    expect(picks.cuisines.map((c) => c.cuisine)).toEqual(["French", "Indian"]);
  });

  it("a food listed as both counts once, as classic", () => {
    const both = blend("Both", [spice("a")], { classic: [food("eggs")], also: [food("eggs")] });
    expect(topPicks([both], new Set(["a"])).foods).toEqual([
      { groupId: "eggs", itemId: null, name: "eggs", score: 2, readyBlends: 1 },
    ]);
  });

  it("stops at 8 foods and 5 cuisines", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      blend(`B${i}`, [spice("a")], { classic: [food(`g${i}`)], cuisines: [`C${i}`] }),
    );
    const picks = topPicks(many, new Set(["a"]));
    expect(picks.foods).toHaveLength(8);
    expect(picks.cuisines).toHaveLength(5);
  });

  it("has nothing when nothing is ready", () => {
    expect(topPicks(all, new Set())).toMatchObject({ readyCount: 0, foods: [], cuisines: [] });
  });
});

describe("Buy next", () => {
  const one = blend("One", [spice("a"), spice("cumin")]);
  const oneToo = blend("OneToo", [spice("a"), spice("cumin")]);
  const two = blend("Two", [spice("a"), spice("cumin"), spice("mace")]);
  const three = blend("Three", [spice("cumin"), spice("mace"), spice("clove")]);
  const optional = blend("Opt", [spice("a"), spice("sumac", { optional: true })]);
  const salty = blend("Salty", [spice("a"), spice("salt")]);
  const all = [one, oneToo, two, three, optional, salty];

  it("counts blends the spice would complete, and those it brings closer", () => {
    const result = buyNext(all, new Set(["a"]), ["salt"]);
    expect(result[0]).toMatchObject({ slug: "cumin", unlocks: 2, closer: 1 });
    expect(result[1]).toMatchObject({ slug: "mace", unlocks: 0, closer: 1 });
  });

  it("ignores blends missing three or more, optional spices and staples", () => {
    const slugs = buyNext(all, new Set(["a"]), ["salt"]).map((r) => r.slug);
    expect(slugs).not.toContain("clove");
    expect(slugs).not.toContain("sumac");
    expect(slugs).not.toContain("salt");
  });

  it("is limited to 10", () => {
    const many = Array.from({ length: 15 }, (_, i) => blend(`B${i}`, [spice(`s${i}`)]));
    expect(buyNext(many, new Set(), [])).toHaveLength(10);
  });

  it("a family line is met by any variety, so it is not suggested", () => {
    const chile = spice("chile", { members: ["chile-ancho"] });
    expect(buyNext([blend("Chili", [chile])], new Set(["chile-ancho"]), [])).toEqual([]);
  });
});
