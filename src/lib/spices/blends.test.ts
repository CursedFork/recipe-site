/* ---------------------------------------------------------------------------
   Tests for blend files: the Ingredients list, what a blend works out for
   itself (allergens, the "go easy" list), and the rules across files.

   Each test breaks exactly one thing and asserts the exact message.
   --------------------------------------------------------------------------- */

import { describe, expect, it, vi } from "vitest";

import { LibraryProblems } from "./load-spices";
import { blendText, cloveText, library, problemsOf, spiceText, validFiles } from "./test-helpers";

/** Cumin and Clove exist, so a blend can use them. */
const base = { "spices/cumin.txt": spiceText(), "spices/clove.txt": cloveText() };

const blend = (overrides: Record<string, string | null> = {}, ingredients?: string[]) =>
  problemsOf({ ...base, "blends/test-blend.txt": blendText(overrides, ingredients) });

const lines = (...ingredients: string[]) => blend({}, ingredients);

describe("a valid blend", () => {
  it("has no problems, and each ingredient is matched to its spice file", () => {
    const result = library(validFiles());

    expect(result.problems).toEqual([]);
    expect(result.blends).toHaveLength(1);
    expect(result.blends[0].ingredients.map((i) => i.spiceSlug)).toEqual(["cumin", "clove"]);
    expect(result.blends[0]).toMatchObject({
      name: "Test Blend",
      slug: "test-blend",
      cuisines: ["Indian"],
      uses: ["Dry rub"],
      methods: ["Roast"],
    });
  });

  it("resolves Classic and Also through the foods list", () => {
    const result = library({
      ...base,
      "blends/test-blend.txt": blendText({ Classic: "ribeye, lamb", Also: "eggs" }),
    });
    expect(result.blends[0].classic.map((f) => f.name)).toEqual(["Steak", "Lamb and goat"]);
    expect(result.blends[0].also.map((f) => f.name)).toEqual(["Eggs"]);
  });
});

describe("reading ingredient lines", () => {
  const spices = {
    "spices/cumin.txt": spiceText(),
    "spices/clove.txt": cloveText(),
    "spices/ginger.txt": spiceText({ Name: "Ginger", Category: "Roots and rhizomes" }),
    "spices/nutmeg.txt": spiceText({ Name: "Nutmeg", Power: "4" }),
  };

  it("reads whole numbers, fractions, mixed numbers and decimals", () => {
    const result = library({
      ...spices,
      "blends/test-blend.txt": blendText({}, [
        "2 1/4 parts Cumin",
        "1/2 part Clove",
        "1.5 parts Ginger",
        "8 parts Nutmeg",
      ]),
    });

    expect(result.problems).toEqual([]);
    expect(result.blends[0].ingredients.map((i) => i.amount)).toEqual([
      { kind: "parts", value: 2.25, text: "2 1/4" },
      { kind: "parts", value: 0.5, text: "1/2" },
      { kind: "parts", value: 1.5, text: "1.5" },
      { kind: "parts", value: 8, text: "8" },
    ]);
  });

  it("reads pinch and to taste, and the optional marker in any case", () => {
    const result = library({
      ...spices,
      "blends/test-blend.txt": blendText({}, [
        "3 parts Cumin",
        "pinch Clove (optional)",
        "to taste Ginger (OPTIONAL)",
      ]),
    });

    expect(result.problems).toEqual([]);
    const [, clove, ginger] = result.blends[0].ingredients;
    expect(clove).toMatchObject({ amount: { kind: "pinch" }, optional: true });
    expect(ginger).toMatchObject({ amount: { kind: "to-taste" }, optional: true });
    expect(result.blends[0].ingredients[0].optional).toBe(false);
  });

  it("keeps the commas and colons in a spice's name", () => {
    const result = library({
      "spices/cumin.txt": spiceText(),
      "spices/pepper-black.txt": spiceText({ Name: "Pepper, black", Category: "Peppercorns" }),
      "spices/pepper-black-tellicherry.txt": spiceText({
        Name: "Pepper, black: Tellicherry",
        Category: "Peppercorns",
        Family: "Pepper, black",
      }),
      "blends/test-blend.txt": blendText({}, ["3 parts Cumin", "1 part Pepper, black: Tellicherry (optional)"]),
    });

    expect(result.problems).toEqual([]);
    expect(result.blends[0].ingredients[1]).toMatchObject({
      name: "Pepper, black: Tellicherry",
      spiceSlug: "pepper-black-tellicherry",
      optional: true,
    });
  });

  it("matches an ingredient written as an Aka to the spice", () => {
    const result = library({
      "spices/cumin.txt": spiceText({ Aka: "jeera" }),
      "spices/clove.txt": cloveText(),
      "blends/test-blend.txt": blendText({}, ["2 parts jeera", "1 part Clove"]),
    });
    expect(result.problems).toEqual([]);
    expect(result.blends[0].ingredients[0].spiceSlug).toBe("cumin");
  });

  it("names a line it cannot read, and shows the shapes it does accept", () => {
    expect(lines("2 parts Cumin", "a bit of Clove")).toEqual([
      'blends/test-blend.txt: cannot read ingredient line "a bit of Clove". Write "8 parts Cumin", "1/2 part Nutmeg (optional)", "pinch Salt" or "to taste Salt".',
    ]);
  });

  it("says amounts are in parts when someone writes teaspoons", () => {
    expect(lines("2 parts Cumin", "1 tsp Clove")).toEqual([
      'blends/test-blend.txt: cannot read ingredient line "1 tsp Clove". Amounts are written in parts ("2 parts Cumin"), not in teaspoons, grams or cups.',
    ]);
  });

  it("rejects a zero denominator rather than treating it as infinity", () => {
    expect(lines("1/0 parts Cumin", "1 part Clove")).toEqual([
      'blends/test-blend.txt: ingredient line "1/0 parts Cumin" has a zero denominator, so its amount is not a number',
    ]);
  });

  it("rejects an amount of zero", () => {
    expect(lines("0 parts Cumin", "1 part Clove")).toEqual([
      'blends/test-blend.txt: ingredient line "0 parts Cumin" has an amount of zero. An amount must be more than zero.',
    ]);
  });
});

describe("the Ingredients section", () => {
  it("says the section is missing", () => {
    const text = blendText().split("\n\nIngredients:")[0] + "\n";
    expect(problemsOf({ ...base, "blends/test-blend.txt": text })[0]).toMatch(/missing the "Ingredients:" section/);
  });

  it("gives one clear message when there is no blank line before Ingredients", () => {
    const text = blendText().replace("\n\nIngredients:", "\nIngredients:");
    expect(problemsOf({ ...base, "blends/test-blend.txt": text })).toEqual([
      'blends/test-blend.txt: there is no blank line before "Ingredients:". Leave one blank line after the header, then write "Ingredients:" below it.',
    ]);
  });

  it("says a field written below the blank line belongs above it", () => {
    const text = blendText({ Source: null }) + "Source: https://example.org/late\n";
    const problems = problemsOf({ ...base, "blends/test-blend.txt": text });

    expect(problems).toContain(
      'blends/test-blend.txt: "Source:" is below the blank line. Every single-line field goes ABOVE the blank line, and only the Ingredients list goes below it.',
    );
  });

  it("says so when the very first line below the blank is a field", () => {
    const text = blendText().replace("\n\nIngredients:", "\n\nSource: https://example.org/x\nIngredients:");
    expect(problemsOf({ ...base, "blends/test-blend.txt": text })[0]).toMatch(
      /"Source:" is below the blank line/,
    );
  });

  it("requires the first line below the blank line to be Ingredients:", () => {
    const text = blendText().replace("Ingredients:", "Spices:");
    expect(problemsOf({ ...base, "blends/test-blend.txt": text })).toContain(
      'blends/test-blend.txt: after the blank line the first line must be "Ingredients:", found "Spices:"',
    );
  });

  it("needs at least two ingredients", () => {
    expect(lines("2 parts Cumin")).toEqual(["blends/test-blend.txt: a blend needs at least 2 ingredients, found 1"]);
  });

  it("needs at least one required ingredient", () => {
    expect(lines("2 parts Cumin (optional)", "1 part Clove (optional)")).toEqual([
      "blends/test-blend.txt: every ingredient is marked optional. A blend needs at least one required ingredient.",
    ]);
  });

  it("does not add a count error on top of a line that could not be read", () => {
    expect(lines("2 parts Cumin", "nonsense")).toHaveLength(1);
  });
});

describe("renamed fields get a specific message", () => {
  it("says Use is now Tip, not 'did you mean Uses'", () => {
    expect(blend({ Use: "A tip." })).toContain(
      'blends/test-blend.txt: unknown field "Use". That field is now called "Tip".',
    );
  });

  it("says Cuisine is now Cuisines, in a spice file too", () => {
    const problems = problemsOf({ "spices/cumin.txt": spiceText({ Cuisine: "Indian" }) });
    expect(problems).toContain('spices/cumin.txt: unknown field "Cuisine". That field is now called "Cuisines".');
  });

  it("catches Use: written below the blank line as well", () => {
    const text = blendText() + "Use: A tip.\n";
    expect(problemsOf({ ...base, "blends/test-blend.txt": text }).join("\n")).toMatch(
      /"Use:" is below the blank line/,
    );
  });
});

describe("ingredients that are not in the library", () => {
  it("names the spice and suggests the one it was probably meant to be", () => {
    expect(lines("2 parts Cumn", "1 part Clove")).toEqual([
      'blends/test-blend.txt: ingredient "Cumn" is not a spice in the library. Did you mean "Cumin"? If it is a new spice, add its file to the spices folder first.',
    ]);
  });

  it("reports every unknown ingredient, not just the first", () => {
    const problems = lines("2 parts Cumn", "1 part Cloves", "1 part Zzzzz");
    expect(problems).toHaveLength(3);
  });

  it("flags the same spice listed twice, even under different names", () => {
    const problems = problemsOf({
      "spices/cumin.txt": spiceText({ Aka: "jeera" }),
      "spices/clove.txt": cloveText(),
      "blends/test-blend.txt": blendText({}, ["2 parts Cumin", "1 part jeera", "1 part Clove"]),
    });
    expect(problems).toEqual([
      'blends/test-blend.txt: the ingredient "Cumin" is listed twice (as "Cumin" and as "jeera")',
    ]);
  });

  it("reports an ingredient typo and a field typo together, in one pass", () => {
    const problems = blend({ Methods: "Roat" }, ["2 parts Cumn", "1 part Clove"]);
    expect(problems.join("\n")).toMatch(/Methods: "Roat" is not a known method\. Did you mean "Roast"\?/);
    expect(problems.join("\n")).toMatch(/ingredient "Cumn" is not a spice in the library/);
  });
});

describe("the controlled lists in a blend", () => {
  it("suggests the use", () => {
    expect(blend({ Uses: "Dry rubb" })[0]).toMatch(/Uses: "Dry rubb" is not a known use\. Did you mean "Dry rub"\?/);
  });

  it("accepts the accented method written without the accent", () => {
    expect(blend({ Methods: "saute, braise" })).toEqual([]);
  });

  it("suggests the food for a typo in Classic and in Also", () => {
    expect(blend({ Classic: "Chiken" })[0]).toMatch(/Classic: "Chiken" is not a known food\. Did you mean "Chicken"\?/);
    expect(blend({ Also: "Eg" })[0]).toMatch(/Also: "Eg" is not a known food/);
  });

  it("will not list the same food in both Classic and Also", () => {
    expect(blend({ Classic: "Steak", Also: "sirloin" })).toEqual([
      'blends/test-blend.txt: "Steak" is in both Classic and Also. A food belongs in one list.',
    ]);
  });

  it("allows a group in one list and an item of that group in the other", () => {
    expect(blend({ Classic: "Beef", Also: "Steak" })).toEqual([]);
  });

  it("requires Typical version and a Doubt line when not high", () => {
    expect(blend({ "Typical version": null })).toEqual(['blends/test-blend.txt: missing required field "Typical version"']);
    expect(blend({ Confidence: "medium" })[0]).toMatch(/so a Doubt line is needed/);
  });
});

describe("blends across files", () => {
  it("flags a blend Name used twice", () => {
    const problems = problemsOf({
      ...base,
      "blends/test-blend.txt": blendText(),
      "blends/test-blend-2.txt": blendText(),
    });
    expect(problems).toContain('blends/test-blend-2.txt: the Name "Test Blend" is already used by blends/test-blend.txt');
  });

  it("flags an Aka that is another blend's Name", () => {
    const problems = problemsOf({
      ...base,
      "blends/test-blend.txt": blendText(),
      "blends/other.txt": blendText({ Name: "Other", Aka: "test blend" }),
    });
    expect(problems).toEqual(['blends/other.txt: Aka "test blend" is already the Name of blends/test-blend.txt']);
  });

  it("names a file that is not a .txt file", () => {
    expect(problemsOf({}, { strayPaths: ["blends/notes.docx"] })).toEqual([
      "blends/notes.docx: only .txt files belong in the blends folder",
    ]);
  });
});

describe("what a blend works out for itself", () => {
  it("collects allergens from its ingredients and never from a typed field", () => {
    const result = library({
      "spices/cumin.txt": spiceText(),
      "spices/sesame-seed.txt": spiceText({ Name: "Sesame seed", Allergen: "sesame" }),
      "spices/mustard-seed.txt": spiceText({ Name: "Mustard seed", Allergen: "mustard" }),
      "blends/test-blend.txt": blendText({}, ["2 parts Cumin", "1 part Sesame seed", "1 part Mustard seed (optional)"]),
    });

    expect(result.problems).toEqual([]);
    expect(result.blends[0].allergens).toEqual(["Mustard", "Sesame"]);
  });

  it("has no allergens when no ingredient has one", () => {
    expect(library(validFiles()).blends[0].allergens).toEqual([]);
  });

  it("lists Power 4 and 5 spices for the 'go easy' note, strongest first", () => {
    const result = library({
      "spices/cumin.txt": spiceText(),
      "spices/clove.txt": cloveText(),
      "spices/nutmeg.txt": spiceText({ Name: "Nutmeg", Power: "4" }),
      "spices/cardamom.txt": spiceText({ Name: "Cardamom", Power: "4" }),
      "blends/test-blend.txt": blendText({}, [
        "6 parts Cumin",
        "1/2 part Nutmeg (optional)",
        "3 parts Cardamom",
        "1 part Clove",
      ]),
    });

    expect(result.problems).toEqual([]);
    expect(result.blends[0].goEasy).toEqual([
      { name: "Clove", power: 5, optional: false },
      { name: "Cardamom", power: 4, optional: false },
      { name: "Nutmeg", power: 4, optional: true },
    ]);
  });

  it("does not list a Power 3 spice", () => {
    const result = library({
      "spices/cumin.txt": spiceText(),
      "spices/ginger.txt": spiceText({ Name: "Ginger", Category: "Roots and rhizomes" }),
      "blends/test-blend.txt": blendText({}, ["2 parts Cumin", "1 part Ginger"]),
    });
    expect(result.blends[0].goEasy).toEqual([]);
  });

  it("resolves a family ingredient to the umbrella, not to a member", () => {
    const result = library({
      "spices/cumin.txt": spiceText(),
      "spices/pepper-black.txt": spiceText({ Name: "Pepper, black", Category: "Peppercorns" }),
      "spices/pepper-black-tellicherry.txt": spiceText({
        Name: "Pepper, black: Tellicherry",
        Category: "Peppercorns",
        Family: "Pepper, black",
      }),
      "blends/test-blend.txt": blendText({}, ["3 parts Cumin", "2 parts Pepper, black"]),
    });

    expect(result.problems).toEqual([]);
    expect(result.blends[0].ingredients[1].spiceSlug).toBe("pepper-black");
    expect(result.families.get("pepper-black")).toEqual(["pepper-black-tellicherry"]);
  });
});

describe("the report that stops a build", () => {
  it("prints the full list once and keeps it out of the thrown message", () => {
    const printed = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new LibraryProblems(["spices/a.txt: first problem", "spices/b.txt: second problem"]);

    expect(printed).toHaveBeenCalledTimes(1);
    expect(String(printed.mock.calls[0][0])).toContain("2 problems found in the spices and blends folders:");
    expect(String(printed.mock.calls[0][0])).toContain("spices/b.txt: second problem");
    expect(error.message).toBe(
      "2 problems found in the spices and blends folders. The full list is printed above; nothing was built.",
    );
    expect(error.message).not.toContain("second problem");

    printed.mockRestore();
  });

  it("says 1 problem, not 1 problems", () => {
    const printed = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(new LibraryProblems(["spices/a.txt: x"]).message).toMatch(/^1 problem found/);
    printed.mockRestore();
  });
});
