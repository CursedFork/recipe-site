/* ---------------------------------------------------------------------------
   Tests for blend searching, filtering and food fit.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import {
  blendMatchesQuery,
  decodePick,
  encodePick,
  filterBlends,
  fitFor,
  isFilteringBlends,
  noBlendFilters,
  type LeanFoodRef,
  type LibraryBlend,
} from "./blend-filter";

const ref = (groupId: string, itemId: string | null, name = itemId ?? groupId): LeanFoodRef => ({
  groupId,
  itemId,
  name,
});

function blend(name: string, extra: Partial<LibraryBlend> = {}): LibraryBlend {
  return {
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aka: [],
    cuisines: ["Indian"],
    uses: ["Dry rub"],
    methods: ["Roast"],
    classic: [],
    also: [],
    ingredientNames: ["Cumin"],
    ingredientCount: 3,
    goEasy: [],
    allergens: [],
    ...extra,
  };
}

const beefBlend = blend("Beef Rub", { classic: [ref("beef", null)] });
const steakBlend = blend("Steak Rub", { classic: [ref("beef", "steak")] });
const brisketBlend = blend("Brisket Rub", { classic: [ref("beef", "brisket")], also: [ref("pork", null)] });
const chickenBlend = blend("Chicken Rub", { classic: [ref("poultry", "chicken")], also: [ref("beef", "steak")] });
const all = [beefBlend, brisketBlend, chickenBlend, steakBlend];

describe("how a blend fits a food", () => {
  it("a blend naming a group suits every item in it", () => {
    expect(fitFor(beefBlend, { groupId: "beef", itemId: "steak" })).toBe("classic");
    expect(fitFor(beefBlend, { groupId: "beef", itemId: "brisket" })).toBe("classic");
  });

  it("a blend naming one item does not suit its neighbours", () => {
    expect(fitFor(steakBlend, { groupId: "beef", itemId: "steak" })).toBe("classic");
    expect(fitFor(steakBlend, { groupId: "beef", itemId: "brisket" })).toBeNull();
  });

  it("picking a group suits a blend naming any item inside it", () => {
    expect(fitFor(steakBlend, { groupId: "beef", itemId: null })).toBe("classic");
  });

  it("an also-works food is a good fit and a classic one is a strong fit", () => {
    expect(fitFor(chickenBlend, { groupId: "beef", itemId: "steak" })).toBe("also");
    expect(fitFor(chickenBlend, { groupId: "poultry", itemId: "chicken" })).toBe("classic");
  });

  it("classic wins when a food is listed as both", () => {
    const both = blend("Both", { classic: [ref("beef", "steak")], also: [ref("beef", "steak")] });
    expect(fitFor(both, { groupId: "beef", itemId: "steak" })).toBe("classic");
  });

  it("does not mix up different groups", () => {
    expect(fitFor(beefBlend, { groupId: "pork", itemId: null })).toBeNull();
  });
});

describe("picking a food", () => {
  it("hides blends that do not mention it, and orders by fit then name", () => {
    const hit = filterBlends(all, { ...noBlendFilters, food: { groupId: "beef", itemId: "steak" } });
    expect(hit.map((r) => [r.blend.name, r.fit])).toEqual([
      ["Beef Rub", "classic"],
      ["Steak Rub", "classic"],
      ["Chicken Rub", "also"],
    ]);
  });

  it("show all keeps the unlisted ones, last and with no fit", () => {
    const hit = filterBlends(all, {
      ...noBlendFilters,
      food: { groupId: "beef", itemId: "steak" },
      showAll: true,
    });
    expect(hit.map((r) => r.blend.name)).toEqual(["Beef Rub", "Steak Rub", "Chicken Rub", "Brisket Rub"]);
    expect(hit[3].fit).toBeNull();
  });

  it("sorts by name when no food is picked", () => {
    const hit = filterBlends(all, noBlendFilters);
    expect(hit.map((r) => r.blend.name)).toEqual(["Beef Rub", "Brisket Rub", "Chicken Rub", "Steak Rub"]);
  });
});

describe("the other filters", () => {
  it("matches any of several uses and any of several methods, and needs all filters to match", () => {
    const tea = blend("Chai", { uses: ["Drink or infusion"], methods: ["Simmer or boil"] });
    const rub = blend("Rub", { uses: ["Dry rub"], methods: ["Grill"] });

    const byUse = filterBlends([tea, rub], { ...noBlendFilters, uses: ["Drink or infusion", "Sweet or baking"] });
    expect(byUse.map((r) => r.blend.name)).toEqual(["Chai"]);

    const both = filterBlends([tea, rub], {
      ...noBlendFilters,
      uses: ["Dry rub"],
      methods: ["Simmer or boil"],
    });
    expect(both).toEqual([]);
  });

  it("counts a Global blend as every cuisine", () => {
    const global = blend("Global One", { cuisines: ["Global"] });
    const indian = blend("Indian One", { cuisines: ["Indian"] });
    const hit = filterBlends([global, indian], { ...noBlendFilters, cuisine: "Mexican" });
    expect(hit.map((r) => r.blend.name)).toEqual(["Global One"]);
  });
});

describe("searching", () => {
  it("finds a blend by an ingredient, an alias or its name, ignoring accents", () => {
    const garam = blend("Garam Masala", { aka: ["garam"], ingredientNames: ["Coriander", "Clove"] });
    expect(blendMatchesQuery(garam, "clove")).toBe(true);
    expect(blendMatchesQuery(garam, "GARAM")).toBe(true);
    expect(blendMatchesQuery(garam, "cumin")).toBe(false);
    expect(blendMatchesQuery(blend("Quatre Epices"), "épices")).toBe(true);
  });

  it("needs every word", () => {
    const garam = blend("Garam Masala", { ingredientNames: ["Clove"] });
    expect(blendMatchesQuery(garam, "garam clove")).toBe(true);
    expect(blendMatchesQuery(garam, "garam saffron")).toBe(false);
  });
});

describe("the food picker value", () => {
  it("round trips a group and an item", () => {
    expect(decodePick(encodePick({ groupId: "beef", itemId: null }))).toEqual({ groupId: "beef", itemId: null });
    expect(decodePick(encodePick({ groupId: "beef", itemId: "steak" }))).toEqual({
      groupId: "beef",
      itemId: "steak",
    });
  });

  it("reads nothing, or nonsense, as no food", () => {
    expect(decodePick("")).toBeNull();
    expect(decodePick("x:1")).toBeNull();
    expect(encodePick(null)).toBe("");
  });

  it("knows when anything is being filtered", () => {
    expect(isFilteringBlends(noBlendFilters)).toBe(false);
    expect(isFilteringBlends({ ...noBlendFilters, showAll: true })).toBe(true);
  });
});
