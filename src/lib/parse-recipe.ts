/* ---------------------------------------------------------------------------
   The recipe parser.

   Takes one file's text and returns either a recipe or a list of problems.
   It never throws and never gives up at the first problem: it collects
   everything wrong with the file so one build tells you all of it.

   Build time only. None of this reaches the browser.
   --------------------------------------------------------------------------- */

import { resolveRegion, suggestRegions, type ResolvedRegion } from "./regions";

/* ---- The format ---------------------------------------------------------- */

/** Every header that must be present. Anything missing is an error. */
export const REQUIRED_HEADERS = [
  "Title",
  "Cuisine",
  "Regions",
  "Meal",
  "Healthy",
  "Prep",
  "Cook",
  "Servings",
] as const;

/** Headers that may be present. Anything else is an error. */
export const OPTIONAL_HEADERS = ["Photo"] as const;

export const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

/** The only accepted meal times. */
export const MEALS = ["breakfast", "lunch", "dinner", "snack", "dessert"] as const;
export type Meal = (typeof MEALS)[number];

/**
 * Measurement units the parser recognises. A number followed by one of these
 * is an amount with a unit; a number followed by anything else is an amount
 * with the rest as the item, so "3 eggs" parses as 3 of "eggs".
 *
 * Phase 4 does the conversion maths. This list only has to be good enough to
 * tell a unit apart from an ingredient.
 */
const UNITS = new Map<string, string>(
  Object.entries({
    // volume, US
    cup: "cup", cups: "cup",
    tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
    tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
    "fl oz": "fl oz", floz: "fl oz",
    pint: "pint", pints: "pint",
    quart: "quart", quarts: "quart",
    gallon: "gallon", gallons: "gallon",
    // volume, metric
    ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
    l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
    // weight, US
    oz: "oz", ounce: "oz", ounces: "oz",
    lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
    // weight, metric
    g: "g", gram: "g", grams: "g",
    kg: "kg", kilogram: "kg", kilograms: "kg",
  }),
);

/* ---- What comes out ------------------------------------------------------ */

export interface Ingredient {
  /** The line exactly as written, which is what we show if we cannot scale it. */
  raw: string;
  /** True when the line ends in a colon, making it a group heading. */
  isHeading: boolean;
  /**
   * The numeric amount, or null when the line has none. A line with no amount
   * ("salt to taste") is displayed as written and never scales.
   */
  amount: number | null;
  /** The amount exactly as written, for example "1 1/2". */
  amountText: string | null;
  /** A recognised unit, normalised. Null when there is none. */
  unit: string | null;
  /** Everything after the amount and unit. */
  item: string;
}

export interface Recipe {
  slug: string;
  /** The source file, for error messages and for your own reference. */
  file: string;
  title: string;
  cuisine: string;
  regions: ResolvedRegion[];
  /** Every canonical code this recipe touches, deduplicated. */
  regionCodes: string[];
  meals: Meal[];
  healthy: boolean;
  prep: number;
  cook: number;
  servings: number;
  photo: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  notes: string | null;
  /**
   * Lowercased ingredient item text, for the home page search. Searching by
   * ingredient means matching the item, not the amount, so "tomato" finds
   * "1 1/2 cups tomato puree" but "1" does not match everything.
   */
  searchableIngredients: string[];
}

export interface ParseResult {
  recipe: Recipe | null;
  /** Every problem found, not just the first. */
  problems: string[];
}

/* ---- The parser ---------------------------------------------------------- */

export function parseRecipe(
  file: string,
  slug: string,
  text: string,
): ParseResult {
  const problems: string[] = [];
  const add = (problem: string) => problems.push(problem);

  // Normalise line endings. Files written on Windows arrive with \r\n and the
  // stray \r would otherwise end up inside values.
  const normalised = text.replace(/\r\n?/g, "\n");

  if (normalised.trim().length === 0) {
    return { recipe: null, problems: ["file is empty"] };
  }

  /* ---- Split the header from the body ------------------------------------
     The format is: header lines, one blank line, then the body. */

  const blankLine = normalised.indexOf("\n\n");
  if (blankLine === -1) {
    return {
      recipe: null,
      problems: [
        "cannot find the blank line that separates the header from the body. " +
          "The header fields come first, then one empty line, then Ingredients:",
      ],
    };
  }

  const headerText = normalised.slice(0, blankLine);
  const bodyText = normalised.slice(blankLine + 2);

  /* ---- Header ----------------------------------------------------------- */

  const headers = new Map<string, string>();

  headerText.split("\n").forEach((line, index) => {
    if (line.trim().length === 0) return;

    const colon = line.indexOf(":");
    if (colon === -1) {
      add(
        `header line ${index + 1} is not a "Field: value" pair: "${truncate(line)}"`,
      );
      return;
    }

    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (headers.has(key)) {
      add(`header "${key}" appears more than once`);
      return;
    }

    headers.set(key, value);
  });

  // Unknown fields are an error, not something to ignore, because an ignored
  // field is almost always a typo that silently loses information.
  for (const key of headers.keys()) {
    if (!ALL_HEADERS.includes(key as (typeof ALL_HEADERS)[number])) {
      const near = ALL_HEADERS.find(
        (known) => known.toLowerCase() === key.toLowerCase(),
      );
      add(
        near
          ? `unknown header "${key}". Did you mean "${near}"? Header names are case-sensitive.`
          : `unknown header "${key}". Allowed: ${ALL_HEADERS.join(", ")}`,
      );
    }
  }

  for (const key of REQUIRED_HEADERS) {
    if (!headers.has(key)) {
      add(`missing required header "${key}"`);
    } else if (headers.get(key)!.length === 0) {
      add(`header "${key}" is empty`);
    }
  }

  /* ---- Header values ---------------------------------------------------- */

  const title = headers.get("Title") ?? "";
  const cuisine = headers.get("Cuisine") ?? "";

  // Regions
  const regions: ResolvedRegion[] = [];
  const regionsRaw = headers.get("Regions");
  if (regionsRaw !== undefined && regionsRaw.length > 0) {
    const written = regionsRaw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (written.length === 0) {
      add(`header "Regions" has no values`);
    }

    for (const word of written) {
      const resolved = resolveRegion(word);
      if (resolved) {
        regions.push(resolved);
      } else {
        const suggestions = suggestRegions(word);
        add(
          `region "${word}" is not in the region lookup` +
            (suggestions.length > 0
              ? `. Did you mean ${suggestions.map((s) => `"${s}"`).join(" or ")}?`
              : `. Add it to src/data/regions.ts, or use one of the names listed in the README.`),
        );
      }
    }
  }

  // Meal
  const meals: Meal[] = [];
  const mealRaw = headers.get("Meal");
  if (mealRaw !== undefined && mealRaw.length > 0) {
    const written = mealRaw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0);

    for (const word of written) {
      if ((MEALS as readonly string[]).includes(word)) {
        if (meals.includes(word as Meal)) {
          add(`meal "${word}" is listed twice`);
        } else {
          meals.push(word as Meal);
        }
      } else {
        add(`meal "${word}" is not one of: ${MEALS.join(", ")}`);
      }
    }

    if (meals.length === 0 && written.length === 0) {
      add(`header "Meal" has no values`);
    }
  }

  // Healthy
  let healthy = false;
  const healthyRaw = headers.get("Healthy");
  if (healthyRaw !== undefined && healthyRaw.length > 0) {
    const value = healthyRaw.toLowerCase();
    if (value === "yes") healthy = true;
    else if (value === "no") healthy = false;
    else add(`header "Healthy" must be exactly "yes" or "no", found "${healthyRaw}"`);
  }

  // Whole-number fields
  const prep = wholeNumber("Prep", headers.get("Prep"), add);
  const cook = wholeNumber("Cook", headers.get("Cook"), add);
  const servings = wholeNumber("Servings", headers.get("Servings"), add);

  if (servings !== null && servings < 1) {
    add(`header "Servings" must be at least 1, found ${servings}`);
  }

  // Photo. Whether the file actually exists is checked in load-recipes.ts,
  // which is the only place that can see the photos folder.
  const photoRaw = headers.get("Photo");
  const photo = photoRaw && photoRaw.length > 0 ? photoRaw : null;
  if (photo !== null && /[\\/]/.test(photo)) {
    add(
      `header "Photo" must be just a filename, not a path. Photos all live in recipes/photos, so write "${photo.split(/[\\/]/).pop()}"`,
    );
  }

  /* ---- Body ------------------------------------------------------------- */

  const sections = splitSections(bodyText);

  for (const name of Object.keys(sections)) {
    if (!["Ingredients", "Instructions", "Notes"].includes(name)) {
      add(
        `unknown section "${name}:". Allowed sections are Ingredients:, Instructions: and Notes:`,
      );
    }
  }

  const ingredientLines = sections["Ingredients"];
  const instructionLines = sections["Instructions"];

  if (ingredientLines === undefined) {
    add(`missing "Ingredients:" section`);
  } else if (ingredientLines.length === 0) {
    add(`"Ingredients:" section is empty`);
  }

  if (instructionLines === undefined) {
    add(`missing "Instructions:" section`);
  } else if (instructionLines.length === 0) {
    add(`"Instructions:" section is empty`);
  }

  const ingredients = (ingredientLines ?? []).map(parseIngredient);

  // A group heading with nothing under it is almost always a mistake.
  ingredients.forEach((ingredient, index) => {
    if (!ingredient.isHeading) return;
    const next = ingredients[index + 1];
    if (next === undefined || next.isHeading) {
      add(`ingredient group "${ingredient.raw}" has no ingredients under it`);
    }
  });

  const instructions = (instructionLines ?? []).map(stripStepNumber);

  const notesLines = sections["Notes"];
  const notes =
    notesLines !== undefined && notesLines.length > 0
      ? notesLines.join("\n")
      : null;

  /* ---- Done ------------------------------------------------------------- */

  if (problems.length > 0) {
    return { recipe: null, problems };
  }

  const regionCodes = [...new Set(regions.flatMap((region) => region.codes))].sort();

  return {
    recipe: {
      slug,
      file,
      title,
      cuisine,
      regions,
      regionCodes,
      meals,
      healthy,
      prep: prep!,
      cook: cook!,
      servings: servings!,
      photo,
      ingredients,
      instructions,
      notes,
      searchableIngredients: ingredients
        .filter((ingredient) => !ingredient.isHeading)
        .map((ingredient) => ingredient.item.toLowerCase())
        .filter((item) => item.length > 0),
    },
    problems: [],
  };
}

/* ---- Helpers ------------------------------------------------------------- */

function wholeNumber(
  field: string,
  raw: string | undefined,
  add: (problem: string) => void,
): number | null {
  if (raw === undefined || raw.length === 0) return null;

  if (!/^\d+$/.test(raw)) {
    add(
      `header "${field}" must be a whole number${field === "Servings" ? "" : " of minutes"}, found "${raw}"`,
    );
    return null;
  }

  return Number.parseInt(raw, 10);
}

/**
 * Split the body into its named sections. A section starts at a line that is
 * exactly one of the known section names followed by a colon.
 */
function splitSections(body: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  for (const line of body.split("\n")) {
    const match = line.match(/^([A-Z][A-Za-z ]*):\s*$/);

    // Only a line that is a known section name on its own starts a section.
    // This matters because "For the sauce:" is a group heading inside
    // Ingredients, not a new section.
    if (match && ["Ingredients", "Instructions", "Notes"].includes(match[1])) {
      current = match[1];
      sections[current] = [];
      continue;
    }

    // A line like "Toppings:" at the top level, outside any section, is a
    // section we do not know about. Flag it by recording it.
    if (match && current === null) {
      current = match[1];
      sections[current] = [];
      continue;
    }

    if (current === null) {
      // Stray text before the first section. Ignored rather than an error,
      // because a trailing blank line is harmless.
      if (line.trim().length > 0) {
        sections["__stray"] ??= [];
        sections["__stray"].push(line);
      }
      continue;
    }

    if (line.trim().length > 0) {
      sections[current].push(line.trim());
    }
  }

  delete sections["__stray"];
  return sections;
}

/**
 * Parse one ingredient line into amount, unit and item.
 *
 * "1 1/2 cups tomato puree"  ->  1.5, "cup", "tomato puree"
 * "2 tbsp butter"            ->  2,   "tbsp", "butter"
 * "3 eggs"                   ->  3,   null,   "eggs"
 * "salt to taste"            ->  null, null,  "salt to taste"
 * "For the sauce:"           ->  heading
 */
function parseIngredient(raw: string): Ingredient {
  const line = raw.trim();

  if (line.endsWith(":")) {
    return {
      raw: line,
      isHeading: true,
      amount: null,
      amountText: null,
      unit: null,
      item: line.slice(0, -1).trim(),
    };
  }

  // Mixed number ("1 1/2"), fraction ("1/2"), decimal ("1.5") or whole ("2").
  const amountMatch = line.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+(.*)$/);

  if (!amountMatch) {
    // No amount at all. Displayed as written, never scaled.
    return {
      raw: line,
      isHeading: false,
      amount: null,
      amountText: null,
      unit: null,
      item: line,
    };
  }

  const amountText = amountMatch[1];
  const rest = amountMatch[2];
  const amount = parseAmount(amountText);

  // Is the next word a unit? Check two words first, for "fl oz".
  const words = rest.split(/\s+/);
  const twoWord = words.slice(0, 2).join(" ").toLowerCase();
  const oneWord = words[0]?.toLowerCase() ?? "";

  if (UNITS.has(twoWord)) {
    return {
      raw: line,
      isHeading: false,
      amount,
      amountText,
      unit: UNITS.get(twoWord)!,
      item: words.slice(2).join(" "),
    };
  }

  if (UNITS.has(oneWord)) {
    return {
      raw: line,
      isHeading: false,
      amount,
      amountText,
      unit: UNITS.get(oneWord)!,
      item: words.slice(1).join(" "),
    };
  }

  return {
    raw: line,
    isHeading: false,
    amount,
    amountText,
    unit: null,
    item: rest,
  };
}

/** "1 1/2" -> 1.5, "1/3" -> 0.333..., "2" -> 2, "1.5" -> 1.5 */
function parseAmount(text: string): number {
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2]);
  }

  return Number(text);
}

/**
 * Instructions are written "1. Heat the oven." The number is how you write a
 * list in a text file, not content, so it comes off and the page uses a real
 * ordered list instead.
 */
function stripStepNumber(line: string): string {
  return line.replace(/^\s*\d+[.)]\s*/, "").trim();
}

function truncate(text: string, length = 60): string {
  const clean = text.trim();
  return clean.length <= length ? clean : `${clean.slice(0, length)}...`;
}
