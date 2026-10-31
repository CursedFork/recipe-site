/* ---------------------------------------------------------------------------
   Tests for the text helpers and the controlled lists.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { compareNames, distance, norm, slugifyName, suggest } from "./text";
import { FoodVocabulary, Vocabulary, allergens, cuisines, foods, methods, uses } from "./vocab";

describe("slugifyName", () => {
  it("turns names into the filename they must have", () => {
    expect(slugifyName("Pepper, black: Tellicherry")).toBe("pepper-black-tellicherry");
    expect(slugifyName("Chile, mild red: Ancho")).toBe("chile-mild-red-ancho");
    expect(slugifyName("Clove")).toBe("clove");
  });

  it("drops apostrophes instead of splitting on them", () => {
    expect(slugifyName("Za'atar")).toBe("zaatar");
    expect(slugifyName("Za’atar")).toBe("zaatar");
  });

  it("removes accents", () => {
    expect(slugifyName("Chile: Árbol")).toBe("chile-arbol");
  });

  it("has no hyphen at either end and no doubled hyphens", () => {
    expect(slugifyName("  Pepper,   black:  Malabar ")).toBe("pepper-black-malabar");
  });
});

describe("compareNames", () => {
  it("puts an umbrella first and its varieties straight after it", () => {
    const sorted = [
      "Pepper, white",
      "Pepper, black: Tellicherry",
      "Pepperoncini",
      "Pepper, black",
      "Pepper, black: Malabar",
    ].sort(compareNames);

    expect(sorted).toEqual([
      "Pepper, black",
      "Pepper, black: Malabar",
      "Pepper, black: Tellicherry",
      "Pepper, white",
      "Pepperoncini",
    ]);
  });

  it("ignores case and accents, so an accented name ties with its plain spelling", () => {
    expect(compareNames("Árbol", "arbol")).toBe(0);
    expect(compareNames("Arbol", "BASIL")).toBeLessThan(0);
  });
});

describe("suggest", () => {
  it("offers the closest name for a typo", () => {
    expect(suggest("Stek", ["Steak", "Pork chops", "Salmon"])).toEqual(["Steak"]);
  });

  it("finds a variety from a mistyped last word", () => {
    expect(suggest("Tellichery", ["Pepper, black: Tellicherry", "Clove"])).toEqual([
      "Pepper, black: Tellicherry",
    ]);
  });

  it("offers a name that starts with what was typed, however long the rest is", () => {
    expect(suggest("cooking base", ["Cooking base or sauce", "Dry rub", "Table seasoning"])).toEqual([
      "Cooking base or sauce",
    ]);
  });

  it("does not guess from a very short prefix", () => {
    expect(suggest("coo", ["Cooking base or sauce"])).toEqual([]);
  });

  it("offers nothing when nothing is close", () => {
    expect(suggest("zzzzzz", ["Steak", "Salmon"])).toEqual([]);
  });

  it("offers at most the number asked for", () => {
    expect(suggest("pork", ["pork a", "pork b", "pork c", "pork d"], 2).length).toBeLessThanOrEqual(2);
  });
});

describe("distance and norm", () => {
  it("counts single edits", () => {
    expect(distance("steak", "stek")).toBe(1);
    expect(distance("same", "same")).toBe(0);
  });

  it("norm makes sauté and saute the same word", () => {
    expect(norm("  Sauté   or  Stir-fry ")).toBe("saute or stir-fry");
  });
});

describe("a flat list", () => {
  const list = new Vocabulary("test", [
    { id: "a", name: "Sauté or stir-fry", aliases: ["stir fry"] },
    { id: "b", name: "Bake" },
  ]);

  it("matches the name, an alias, any case, and with or without the accent", () => {
    expect(list.resolve("sauté or stir-fry")?.id).toBe("a");
    expect(list.resolve("SAUTE OR STIR-FRY")?.id).toBe("a");
    expect(list.resolve("Stir Fry")?.id).toBe("a");
    expect(list.resolve("bake")?.name).toBe("Bake");
  });

  it("returns null for a word it does not know", () => {
    expect(list.resolve("steam")).toBeNull();
  });

  it("throws when two entries claim the same word, because that is a mistake in the list", () => {
    expect(
      () =>
        new Vocabulary("test", [
          { id: "a", name: "Grill", aliases: ["broil"] },
          { id: "b", name: "Broil" },
        ]),
    ).toThrow(/"Broil" is used twice/);
  });
});

describe("the foods list", () => {
  it("resolves a cut to its item, and the item knows its group", () => {
    const ribeye = foods.resolve("ribeye");
    expect(ribeye).toMatchObject({ name: "Steak", kind: "item", groupName: "Beef" });
  });

  it("resolves a group name to the whole group", () => {
    expect(foods.resolve("Beef")).toMatchObject({ kind: "group", itemId: null, name: "Beef" });
  });

  it("resolves lamb to the whole Lamb and goat group, as agreed", () => {
    expect(foods.resolve("lamb")).toMatchObject({ kind: "group", name: "Lamb and goat" });
    expect(foods.resolve("goat")).toMatchObject({ kind: "group", name: "Lamb and goat" });
  });

  it("gives two spellings of one food the same key", () => {
    expect(foods.resolve("sirloin")?.key).toBe(foods.resolve("Steak")?.key);
  });

  it("gives an item and its group different keys", () => {
    expect(foods.resolve("Steak")?.key).not.toBe(foods.resolve("Beef")?.key);
  });

  it("knows the two proposed groups", () => {
    expect(foods.resolve("masala chai")?.groupName).toBe("Drinks");
    expect(foods.resolve("vinaigrette")?.groupName).toBe("Sauces and dressings");
  });

  it("suggests a close food for a typo", () => {
    expect(foods.suggest("Chiken")).toContain("Chicken");
  });

  it("throws when a word is used in two places", () => {
    expect(
      () =>
        new FoodVocabulary({
          groups: [
            { id: "x", name: "X", items: [{ id: "a", name: "A", aliases: ["shared"] }] },
            { id: "y", name: "Y", items: [{ id: "b", name: "B", aliases: ["Shared"] }] },
          ],
        }),
    ).toThrow(/"Shared" is used twice/);
  });

  it("throws when an item id is used twice", () => {
    expect(
      () =>
        new FoodVocabulary({
          groups: [
            { id: "x", name: "X", items: [{ id: "same", name: "A" }] },
            { id: "y", name: "Y", items: [{ id: "same", name: "B" }] },
          ],
        }),
    ).toThrow(/item id "same" is used twice/);
  });
});

describe("the real lists load with no clashes", () => {
  // Building them is the check: a duplicate word throws when the module loads.
  it("has the sizes we proposed", () => {
    expect(methods.names).toHaveLength(10);
    expect(uses.names).toHaveLength(8);
    expect(allergens.names).toHaveLength(7);
    expect(cuisines.names.length).toBeGreaterThan(60);
  });

  it("includes Global as a reserved cuisine", () => {
    expect(cuisines.resolve("global")?.name).toBe("Global");
  });

  it("accepts the accented and unaccented method", () => {
    expect(methods.resolve("saute")?.name).toBe("Sauté or stir-fry");
  });
});
