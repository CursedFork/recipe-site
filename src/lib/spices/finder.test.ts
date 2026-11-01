/* ---------------------------------------------------------------------------
   Tests for the finder: status, family matches, hints, optional ingredients,
   ordering, and the staples switch.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { filterBlends, noBlendFilters, type LeanFoodRef } from "./blend-filter";
import {
  isCovered,
  ownedSet,
  rankForCabinet,
  statusLabel,
  statusOf,
  type FinderBlend,
  type FinderIngredient,
} from "./finder";

const spice = (slug: string, extra: Partial<FinderIngredient> = {}): FinderIngredient => ({
  slug,
  name: slug[0].toUpperCase() + slug.slice(1).replace(/-/g, " "),
  optional: false,
  members: [],
  siblings: [],
  ...extra,
});

const food = (groupId: string, itemId: string | null): LeanFoodRef => ({ groupId, itemId, name: itemId ?? groupId });

function blend(name: string, ingredients: FinderIngredient[], extra: Partial<FinderBlend> = {}): FinderBlend {
  return {
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aka: [],
    cuisines: ["Indian"],
    uses: ["Dry rub"],
    methods: ["Roast"],
    classic: [],
    also: [],
    ingredientNames: ingredients.map((i) => i.name),
    ingredientCount: ingredients.length,
    goEasy: [],
    allergens: [],
    ingredients,
    ...extra,
  };
}

const owned = (...slugs: string[]) => new Set(slugs);

describe("status of a blend", () => {
  const rub = blend("Rub", [spice("cumin"), spice("paprika"), spice("garlic")]);

  it("is Ready now when nothing required is missing", () => {
    const status = statusOf(rub, owned("cumin", "paprika", "garlic"));
    expect(status.missing).toHaveLength(0);
    expect(statusLabel(status.missing.length)).toBe("Ready now");
  });

  it("counts what is missing and names it", () => {
    const status = statusOf(rub, owned("cumin"));
    expect(status.missing.map((i) => i.slug)).toEqual(["paprika", "garlic"]);
    expect(statusLabel(2)).toBe("Missing two");
    expect(statusLabel(1)).toBe("Missing one");
    expect(statusLabel(3)).toBe("Missing three or more");
    expect(statusLabel(7)).toBe("Missing three or more");
  });
});

describe("a family match", () => {
  const chile = spice("chile", { members: ["chile-ancho", "chile-arbol"] });
  const chili = blend("Chili", [chile]);

  it("any variety satisfies a line that names the family", () => {
    expect(isCovered(chile, owned("chile-ancho"))).toBe(true);
    expect(statusOf(chili, owned("chile-arbol")).missing).toHaveLength(0);
  });

  it("the umbrella itself satisfies it too", () => {
    expect(isCovered(chile, owned("chile"))).toBe(true);
  });

  it("an unrelated spice does not", () => {
    expect(isCovered(chile, owned("cumin"))).toBe(false);
  });
});

describe("a miss on a specific spice", () => {
  const ancho = spice("chile-ancho", {
    name: "Chile: Ancho",
    siblings: [{ slug: "chile-arbol", name: "Chile: Árbol" }],
  });
  const mole = blend("Mole", [ancho]);

  it("owning the umbrella or a sibling does not satisfy a specific variety", () => {
    expect(isCovered(ancho, owned("chile"))).toBe(false);
    expect(isCovered(ancho, owned("chile-arbol"))).toBe(false);
  });

  it("gives a gentle hint when a close relative is owned, without changing the status", () => {
    const status = statusOf(mole, owned("chile-arbol"));
    expect(status.missing).toHaveLength(1);
    expect(status.hints).toEqual([{ missing: "Chile: Ancho", have: "Chile: Árbol" }]);
  });

  it("gives no hint when no relative is owned", () => {
    expect(statusOf(mole, owned("cumin")).hints).toEqual([]);
  });
});

describe("an optional ingredient", () => {
  const rub = blend("Rub", [spice("cumin"), spice("sumac", { optional: true })]);

  it("never blocks a blend, and is listed as nice to have", () => {
    const status = statusOf(rub, owned("cumin"));
    expect(status.missing).toHaveLength(0);
    expect(status.niceToHave.map((i) => i.slug)).toEqual(["sumac"]);
  });

  it("is not listed once owned", () => {
    expect(statusOf(rub, owned("cumin", "sumac")).niceToHave).toHaveLength(0);
  });
});

describe("the staples switch", () => {
  const salty = blend("Salty", [spice("salt"), spice("cumin")]);

  it("counts staples as owned while on", () => {
    const set = ownedSet(["cumin"], true, ["salt"]);
    expect(statusOf(salty, set).missing).toHaveLength(0);
  });

  it("stops counting them when off", () => {
    const set = ownedSet(["cumin"], false, ["salt"]);
    expect(statusOf(salty, set).missing.map((i) => i.slug)).toEqual(["salt"]);
  });
});

describe("ordering", () => {
  const classicFar = blend("A Far Classic", [spice("a"), spice("b")], { classic: [food("eggs", null)] });
  const alsoReady = blend("B Ready Also", [spice("a")], { also: [food("eggs", null)] });
  const classicReady = blend("C Ready Classic", [spice("a")], { classic: [food("eggs", null)] });
  const noFood = blend("D Not Eggs", [spice("a")]);
  const all = [noFood, alsoReady, classicFar, classicReady];

  const pickEggs = filterBlends(all, { ...noBlendFilters, food: { groupId: "eggs", itemId: null } });
  const names = (list: Array<{ blend: { name: string } }>) => list.map((r) => r.blend.name);

  it("picking eggs finds only the blends that mention eggs", () => {
    expect(names(pickEggs).sort()).toEqual(["A Far Classic", "B Ready Also", "C Ready Classic"]);
  });

  it("Best match: classic before also, then ready before missing", () => {
    const ranked = rankForCabinet(pickEggs, owned("a"), false, "best");
    expect(names(ranked)).toEqual(["C Ready Classic", "A Far Classic", "B Ready Also"]);
  });

  it("Ready first: ready before missing, then classic before also", () => {
    const ranked = rankForCabinet(pickEggs, owned("a"), false, "ready");
    expect(names(ranked)).toEqual(["C Ready Classic", "B Ready Also", "A Far Classic"]);
  });

  it("with Show all, blends that do not mention the food come last in Best match", () => {
    const everything = filterBlends(all, {
      ...noBlendFilters,
      food: { groupId: "eggs", itemId: null },
      showAll: true,
    });
    const ranked = rankForCabinet(everything, owned("a"), false, "best");
    expect(names(ranked)).toEqual(["C Ready Classic", "A Far Classic", "B Ready Also", "D Not Eggs"]);
  });

  it("with no food chosen the fit part is skipped", () => {
    const ranked = rankForCabinet(filterBlends(all, noBlendFilters), owned("a"), false, "best");
    expect(names(ranked)).toEqual(["B Ready Also", "C Ready Classic", "D Not Eggs", "A Far Classic"]);
  });

  it("with an empty cabinet the status part is skipped", () => {
    const ranked = rankForCabinet(pickEggs, owned(), true, "ready");
    expect(names(ranked)).toEqual(["A Far Classic", "C Ready Classic", "B Ready Also"]);
  });

  it("can hide blends missing more than a chosen number", () => {
    const ranked = rankForCabinet(pickEggs, owned("a"), false, "best", 0);
    expect(names(ranked)).toEqual(["C Ready Classic", "B Ready Also"]);
  });
});
