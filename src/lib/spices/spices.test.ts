/* ---------------------------------------------------------------------------
   Tests for spice files: the rules one file can check about itself, and the
   rules that need the whole library.

   Each test breaks exactly one thing in an otherwise valid file and asserts
   the exact message, because the message is the feature: it is what tells
   someone at 10pm what to fix.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { cloveText, library, problemsOf, spiceText, validFiles } from "./test-helpers";

/** Problems for a library of one cumin file with the given changes. */
const cumin = (overrides: Record<string, string | null>) =>
  problemsOf({ "spices/cumin.txt": spiceText(overrides) });

describe("a valid spice", () => {
  it("has no problems and is parsed into the fields it was given", () => {
    const result = library({ "spices/cumin.txt": spiceText() });

    expect(result.problems).toEqual([]);
    expect(result.spices).toHaveLength(1);
    expect(result.spices[0]).toMatchObject({
      name: "Cumin",
      slug: "cumin",
      category: "Seeds and pods",
      forms: ["whole", "ground"],
      cuisines: ["Indian", "Mexican"],
      power: 3,
      heat: null,
      family: null,
      confidence: "high",
    });
  });

  it("resolves aliases in Pairs with to the canonical food", () => {
    const result = library({ "spices/cumin.txt": spiceText({ "Pairs with": "ribeye, lamb" }) });
    expect(result.spices[0].pairsWith.map((f) => f.name)).toEqual(["Steak", "Lamb and goat"]);
  });

  it("resolves Origin through the region lookup, so Levant is the five-country group", () => {
    const result = library({ "spices/cumin.txt": spiceText({ Origin: "Levant, Zanzibar" }) });
    expect(result.spices[0].origin[0].codes).toEqual(["ISR", "JOR", "LBN", "PSE", "SYR"]);
    expect(result.spices[0].origin[1].codes).toEqual(["TZA"]);
  });
});

describe("missing and unknown fields", () => {
  it("says a file is empty", () => {
    expect(problemsOf({ "spices/cumin.txt": "" })).toEqual(["spices/cumin.txt: file is empty"]);
    expect(problemsOf({ "spices/cumin.txt": "  \n \n" })).toEqual(["spices/cumin.txt: file is empty"]);
  });

  it("names a missing required field", () => {
    expect(cumin({ Tip: null })).toEqual(['spices/cumin.txt: missing required field "Tip"']);
  });

  it("reports every missing field in one pass, not just the first", () => {
    const problems = cumin({ Tip: null, Origin: null, Flavor: null });
    expect(problems).toContain('spices/cumin.txt: missing required field "Tip"');
    expect(problems).toContain('spices/cumin.txt: missing required field "Origin"');
    expect(problems).toContain('spices/cumin.txt: missing required field "Flavor"');
    expect(problems).toHaveLength(3);
  });

  it("says a required field is empty", () => {
    expect(cumin({ Tip: "" })).toEqual(['spices/cumin.txt: field "Tip" is empty']);
  });

  it("tells you to leave an optional field out rather than write it empty", () => {
    expect(cumin({ Allergen: "" })[0]).toMatch(/field "Allergen" is empty\. Leave an optional field out completely/);
  });

  it("catches a field name in the wrong case and says what was meant", () => {
    const problems = cumin({ power: "3" });
    expect(problems).toContain(
      'spices/cumin.txt: unknown field "power". Did you mean "Power"? Field names are case-sensitive.',
    );
  });

  it("names an unknown field and lists the allowed ones", () => {
    const [problem] = cumin({ Calories: "10" });
    expect(problem).toMatch(/^spices\/cumin\.txt: unknown field "Calories"\. Allowed: Name, Aka, Category/);
  });

  it("flags a repeated field, except Source", () => {
    const text = spiceText() + "Power: 4\n";
    expect(problemsOf({ "spices/cumin.txt": text })).toContain(
      'spices/cumin.txt: field "Power" appears more than once',
    );
  });

  it("allows Source to repeat, one link per line", () => {
    const result = library({
      "spices/cumin.txt": spiceText({ Source: "https://example.org/a\nhttps://example.org/b" }),
    });
    expect(result.problems).toEqual([]);
    expect(result.spices[0].sources).toEqual(["https://example.org/a", "https://example.org/b"]);
  });

  it("flags a header line with no colon", () => {
    const text = spiceText().replace("Power: 3", "Power 3");
    expect(problemsOf({ "spices/cumin.txt": text }).join("\n")).toMatch(/is not a "Field: value" pair: "Power 3"/);
  });

  it("flags text after the blank line, since a spice file is header only", () => {
    const text = spiceText() + "\nSome extra notes here.\n";
    expect(problemsOf({ "spices/cumin.txt": text })[0]).toMatch(
      /unexpected text after the blank line: "Some extra notes here\."/,
    );
  });
});

describe("Power and Heat", () => {
  it("rejects Power outside 1 to 5", () => {
    expect(cumin({ Power: "0" })).toEqual(["spices/cumin.txt: Power must be from 1 to 5, found 0"]);
    expect(cumin({ Power: "6" })).toEqual(["spices/cumin.txt: Power must be from 1 to 5, found 6"]);
  });

  it("rejects Power that is not a whole number", () => {
    expect(cumin({ Power: "three" })).toEqual([
      'spices/cumin.txt: Power must be a whole number from 1 to 5, found "three"',
    ]);
    expect(cumin({ Power: "3.5" })).toEqual([
      'spices/cumin.txt: Power must be a whole number from 1 to 5, found "3.5"',
    ]);
  });

  it("requires Power outside the exempt categories", () => {
    expect(cumin({ Power: null })).toEqual(['spices/cumin.txt: missing required field "Power"']);
  });

  it("does not use Power for salts and sugars, and says so if one is given", () => {
    const salt = { Name: "Salt", Category: "Salts and sugars", Power: null, "Pairs with": "Eggs" };
    expect(problemsOf({ "spices/salt.txt": spiceText(salt) })).toEqual([]);
    expect(problemsOf({ "spices/salt.txt": spiceText({ ...salt, Power: "3" }) })).toEqual([
      'spices/salt.txt: Power is not used for the category "Salts and sugars". Leave the Power line out.',
    ]);
  });

  it("requires Heat on a chile", () => {
    const chile = { Name: "Chile, hot red", Category: "Chiles", Power: "4", "Pairs with": "Chili" };
    expect(problemsOf({ "spices/chile-hot-red.txt": spiceText(chile) })).toEqual([
      'spices/chile-hot-red.txt: missing required field "Heat"',
    ]);
    expect(problemsOf({ "spices/chile-hot-red.txt": spiceText({ ...chile, Heat: "3" }) })).toEqual([]);
  });

  it("accepts Heat 0 and rejects Heat above 5", () => {
    expect(cumin({ Heat: "0" })).toEqual([]);
    expect(cumin({ Heat: "6" })).toEqual(["spices/cumin.txt: Heat must be from 0 to 5, found 6"]);
  });
});

describe("the controlled lists, with suggestions", () => {
  it("suggests the food for a typo in Pairs with", () => {
    expect(cumin({ "Pairs with": "Lentils, Stek" })).toEqual([
      'spices/cumin.txt: Pairs with: "Stek" is not a known food. Did you mean "Steak"? (the list is src/data/foods.json)',
    ]);
  });

  it("flags the same food listed twice, even under different spellings", () => {
    expect(cumin({ "Pairs with": "Steak, sirloin" })).toEqual([
      'spices/cumin.txt: Pairs with lists "Steak" twice (one of the spellings is an alias)',
    ]);
  });

  it("suggests the cuisine for a typo", () => {
    expect(cumin({ Cuisines: "Indain" })).toEqual([
      'spices/cumin.txt: Cuisines: "Indain" is not a known cuisine. Did you mean "Indian"? (the list is src/data/cuisines.json)',
    ]);
  });

  it("names an origin that is not in the region lookup", () => {
    expect(cumin({ Origin: "Narnia" })[0]).toMatch(
      /^spices\/cumin\.txt: Origin: "Narnia" is not in the region lookup\./,
    );
  });

  it("suggests the country for a typo in Origin", () => {
    expect(cumin({ Origin: "Indai" })[0]).toMatch(/Did you mean "India"\?/);
  });

  it("suggests the category", () => {
    expect(cumin({ Category: "Chilis" })[0]).toMatch(/Category: "Chilis" is not a category\. Did you mean "Chiles"\?/);
  });

  it("rejects a form that is not one of the allowed forms", () => {
    expect(cumin({ Form: "whole, powdered" })[0]).toMatch(/Form: "powdered" is not a form/);
  });

  it("suggests the allergen", () => {
    expect(cumin({ Allergen: "sesam" })[0]).toMatch(/Allergen: "sesam" is not an allergen tag\. Did you mean "Sesame"\?/);
    expect(cumin({ Allergen: "sesame" })).toEqual([]);
  });
});

describe("sources, confidence and doubt", () => {
  it("requires at least one source", () => {
    expect(cumin({ Source: null })[0]).toMatch(/missing required field "Source"/);
  });

  it("rejects a source that is not a web address", () => {
    expect(cumin({ Source: "Wikipedia" })).toEqual([
      'spices/cumin.txt: Source "Wikipedia" is not a web address starting with http:// or https://',
    ]);
  });

  it("requires a Doubt line when confidence is not high", () => {
    expect(cumin({ Confidence: "low" })).toEqual([
      'spices/cumin.txt: Confidence is "low", so a Doubt line is needed saying what you are unsure of',
    ]);
    expect(cumin({ Confidence: "low", Doubt: "Only a seller describes this." })).toEqual([]);
  });

  it("rejects a confidence that is not high, medium or low, with a suggestion", () => {
    expect(cumin({ Confidence: "hgih" })[0]).toMatch(/Did you mean "high"\?/);
  });
});

describe("filenames", () => {
  it("must match the Name, and says what the file should be called", () => {
    expect(problemsOf({ "spices/ground-cumin.txt": spiceText() })).toEqual([
      'spices/ground-cumin.txt: the filename must match the Name. "Cumin" belongs in "cumin.txt", not "ground-cumin.txt"',
    ]);
  });

  it("drops apostrophes, so Za'atar is zaatar.txt", () => {
    const text = spiceText({ Name: "Za'atar" });
    expect(problemsOf({ "spices/zaatar.txt": text })).toEqual([]);
  });

  it("names a file that is not a .txt file", () => {
    expect(problemsOf({}, { strayPaths: ["spices/notes.docx"] })).toEqual([
      "spices/notes.docx: only .txt files belong in the spices folder",
    ]);
  });
});

describe("across files", () => {
  it("flags a Name already used by another file", () => {
    const problems = problemsOf({
      "spices/cumin.txt": spiceText(),
      "spices/cumin-2.txt": spiceText(),
    });
    expect(problems).toContain("spices/cumin-2.txt: the Name \"Cumin\" is already used by spices/cumin.txt");
  });

  it("flags two different names that would share one address", () => {
    const problems = problemsOf({
      "spices/chile-ancho.txt": spiceText({ Name: "Chile, ancho" }),
      "spices/chile-ancho-b.txt": spiceText({ Name: "Chile ancho" }),
    });
    expect(problems.join("\n")).toMatch(
      /would have the same address \(\/spices\/library\/chile-ancho\) as "Chile, ancho" in spices\/chile-ancho\.txt/,
    );
  });

  it("flags an Aka that is another spice's Name", () => {
    const problems = problemsOf({
      "spices/cumin.txt": spiceText(),
      "spices/clove.txt": cloveText({ Aka: "cumin" }),
    });
    expect(problems).toEqual(['spices/clove.txt: Aka "cumin" is already the Name of spices/cumin.txt']);
  });

  it("flags an Aka used by two spices", () => {
    const problems = problemsOf({
      "spices/cumin.txt": spiceText({ Aka: "seeds" }),
      "spices/clove.txt": cloveText({ Aka: "seeds" }),
    });
    expect(problems.join("\n")).toMatch(/Aka "seeds" is also used by "Clove" \(spices\/clove\.txt\)|Aka "seeds" is also used by "Cumin"/);
  });

  it("flags an Aka repeated within one file", () => {
    expect(cumin({ Aka: "jeera, Jeera" })).toEqual(['spices/cumin.txt: Aka lists "Jeera" twice']);
  });

  it("flags a staple that is not a spice, with a suggestion", () => {
    const problems = problemsOf({ "spices/cumin.txt": spiceText() }, { staples: ["Cumn", "Saltt"] });
    expect(problems).toEqual([
      'src/config/pantry.ts: the staple "Cumn" is not a spice in the library. Did you mean "Cumin"?',
      'src/config/pantry.ts: the staple "Saltt" is not a spice in the library. Add it to the spices folder first.',
    ]);
  });

  it("accepts a staple by Name or by Aka", () => {
    const files = { "spices/cumin.txt": spiceText({ Aka: "jeera" }) };
    expect(problemsOf(files, { staples: ["Cumin", "jeera"] })).toEqual([]);
  });
});

describe("families", () => {
  const pepper = (extra: Record<string, string | null> = {}) =>
    spiceText({
      Name: "Pepper, black",
      Category: "Peppercorns",
      "Pairs with": "Steak",
      ...extra,
    });

  const tellicherry = (extra: Record<string, string | null> = {}) =>
    spiceText({
      Name: "Pepper, black: Tellicherry",
      Category: "Peppercorns",
      Family: "Pepper, black",
      "Pairs with": "Steak",
      ...extra,
    });

  it("accepts an umbrella and its member, and records who belongs to whom", () => {
    const result = library({
      "spices/pepper-black.txt": pepper(),
      "spices/pepper-black-tellicherry.txt": tellicherry(),
    });

    expect(result.problems).toEqual([]);
    expect(result.families.get("pepper-black")).toEqual(["pepper-black-tellicherry"]);
  });

  it("sorts the umbrella first and its member straight after", () => {
    const result = library({
      "spices/pepper-black-tellicherry.txt": tellicherry(),
      "spices/pepper-black.txt": pepper(),
      "spices/cumin.txt": spiceText(),
    });
    expect(result.spices.map((s) => s.name)).toEqual(["Cumin", "Pepper, black", "Pepper, black: Tellicherry"]);
  });

  it("says when the Family is not a spice, and suggests one", () => {
    const problems = problemsOf({
      "spices/pepper-black.txt": pepper(),
      "spices/pepper-black-tellicherry.txt": tellicherry({ Family: "Pepper, blak" }),
    });
    expect(problems).toContain(
      'spices/pepper-black-tellicherry.txt: Family "Pepper, blak" is not a spice in the library. Add it first, or check the spelling. Did you mean "Pepper, black"?',
    );
  });

  it("requires a variety's Name to start with its family's Name", () => {
    const problems = problemsOf({
      "spices/pepper-black.txt": pepper(),
      "spices/tellicherry.txt": tellicherry({ Name: "Tellicherry" }),
    });
    expect(problems).toContain(
      'spices/tellicherry.txt: with Family "Pepper, black", the Name must start with "Pepper, black: " followed by the variety',
    );
  });

  it("says a Name with a colon needs a Family line", () => {
    const problems = problemsOf({
      "spices/pepper-black.txt": pepper(),
      "spices/pepper-black-tellicherry.txt": tellicherry({ Family: null }),
    });
    expect(problems).toEqual([
      'spices/pepper-black-tellicherry.txt: the Name has a colon, which marks a variety, but there is no Family line. Add "Family: Pepper, black" and make sure that spice exists',
    ]);
  });

  it("allows one level only", () => {
    const problems = problemsOf({
      "spices/pepper-black.txt": pepper({ Family: "Pepper, black: Tellicherry" }),
      "spices/pepper-black-tellicherry.txt": tellicherry(),
    });
    expect(problems.join("\n")).toMatch(/has a family of its own/);
  });

  it("does not let a spice be its own family", () => {
    expect(problemsOf({ "spices/pepper-black.txt": pepper({ Family: "Pepper, black" }) })).toContain(
      "spices/pepper-black.txt: a spice cannot be its own Family",
    );
  });
});

describe("one broken file does not hide the others", () => {
  it("reports every file's problems together, ordered by file", () => {
    const problems = problemsOf({
      "spices/cumin.txt": spiceText({ Tip: null }),
      "spices/clove.txt": cloveText({ Power: "9" }),
    });

    expect(problems).toEqual([
      "spices/clove.txt: Power must be from 1 to 5, found 9",
      'spices/cumin.txt: missing required field "Tip"',
    ]);
  });

  it("still lets a blend find a spice whose own file has a problem", () => {
    const files = validFiles();
    files["spices/clove.txt"] = cloveText({ Power: "9" });

    const problems = problemsOf(files);
    expect(problems).toEqual(["spices/clove.txt: Power must be from 1 to 5, found 9"]);
  });
});
