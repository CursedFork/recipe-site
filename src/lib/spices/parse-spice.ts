/* ---------------------------------------------------------------------------
   The spice file parser.

   Checks everything that can be checked from ONE file: required fields,
   ranges, the controlled lists, the filename. What needs the other files (is
   this family a real spice, is this name already taken) is checked afterwards
   in build-library.ts.

   Build time only.
   --------------------------------------------------------------------------- */

import { resolveRegion, suggestRegions, type ResolvedRegion } from "../regions";
import {
  CATEGORIES,
  CONFIDENCE,
  FORMS,
  HEAT_REQUIRED,
  POWER_EXEMPT,
  REPEATABLE_FIELDS,
  SPICE_FIELDS,
  type Category,
  type Confidence,
  type Form,
} from "./constants";
import { Reader, splitFile, unknownValue } from "./fields";
import { suggest, slugOfPath, slugifyName, truncate, norm } from "./text";
import type { FoodRef, Spice } from "./types";
import { allergens, cuisines, foods } from "./vocab";

export interface SpiceIndexEntry {
  name: string;
  aka: string[];
  family: string | null;
}

export interface SpiceParse {
  path: string;
  spice: Spice | null;
  problems: string[];
  /**
   * Available even when the file has other problems. A blend that names this
   * spice can then still find it, so one broken spice file does not make every
   * blend that uses it report "unknown spice" as well.
   */
  index: SpiceIndexEntry | null;
}

const URL_PATTERN = /^https?:\/\/\S+$/;

export function parseSpiceFile(path: string, text: string): SpiceParse {
  const parsed = splitFile(text, SPICE_FIELDS, REPEATABLE_FIELDS);
  const problems = [...parsed.problems];

  if (parsed.empty) return { path, spice: null, problems, index: null };

  if (parsed.body.length > 0) {
    problems.push(
      `unexpected text after the blank line: "${truncate(parsed.body[0])}". ` +
        `A spice file is header lines only.`,
    );
  }

  const read = new Reader(parsed, problems);

  /* ---- Name, and the filename that must follow from it ------------------ */

  const name = read.text("Name", true);

  if (name !== undefined) {
    const expected = `${slugifyName(name)}.txt`;
    const actual = `${slugOfPath(path)}.txt`;
    if (expected !== actual) {
      problems.push(
        `the filename must match the Name. "${name}" belongs in "${expected}", not "${actual}"`,
      );
    }
  }

  const aka = read.list("Aka", false) ?? [];
  const akaSeen = new Set<string>();
  for (const word of aka) {
    const key = norm(word);
    if (akaSeen.has(key)) problems.push(`Aka lists "${word}" twice`);
    akaSeen.add(key);
  }

  /* ---- Category, family, forms ------------------------------------------ */

  const categoryText = read.text("Category", true);
  let category: Category | undefined;
  if (categoryText !== undefined) {
    category = CATEGORIES.find((c) => norm(c) === norm(categoryText));
    if (!category) {
      problems.push(
        unknownValue(
          "Category",
          categoryText,
          "a category",
          suggest(categoryText, CATEGORIES),
          `${CATEGORIES.join(", ")}`,
        ),
      );
    }
  }

  const family = read.text("Family", false) ?? null;

  const formsText = read.list("Form", true) ?? [];
  const forms: Form[] = [];
  for (const word of formsText) {
    const form = FORMS.find((f) => f === norm(word));
    if (!form) {
      problems.push(
        unknownValue("Form", word, "a form", suggest(word, FORMS), FORMS.join(", ")),
      );
    } else if (forms.includes(form)) {
      problems.push(`Form lists "${form}" twice`);
    } else {
      forms.push(form);
    }
  }

  /* ---- Origin and cuisines ---------------------------------------------- */

  const origin: ResolvedRegion[] = [];
  for (const word of read.list("Origin", true) ?? []) {
    const region = resolveRegion(word);
    if (region) {
      origin.push(region);
    } else {
      problems.push(
        unknownValue(
          "Origin",
          word,
          "in the region lookup",
          suggestRegions(word),
          "src/data/regions.ts, where a missing country is one line to add",
        ),
      );
    }
  }

  const cuisineNames: string[] = [];
  for (const word of read.list("Cuisines", true) ?? []) {
    const hit = cuisines.resolve(word);
    if (!hit) {
      problems.push(
        unknownValue("Cuisines", word, "a known cuisine", cuisines.suggest(word), "src/data/cuisines.json"),
      );
    } else if (cuisineNames.includes(hit.name)) {
      problems.push(`Cuisines lists "${hit.name}" twice`);
    } else {
      cuisineNames.push(hit.name);
    }
  }

  const flavor = read.list("Flavor", true) ?? [];

  /* ---- Power and heat --------------------------------------------------- */

  const powerExempt = category !== undefined && POWER_EXEMPT.includes(category);
  let power: number | null = null;

  if (powerExempt) {
    if (read.has("Power")) {
      problems.push(
        `Power is not used for the category "${category}". Leave the Power line out.`,
      );
    }
  } else {
    power = readRating(read, "Power", 1, 5, true);
  }

  const heatRequired = category !== undefined && HEAT_REQUIRED.includes(category);
  const heat = readRating(read, "Heat", 0, 5, heatRequired);

  /* ---- Allergen --------------------------------------------------------- */

  let allergen: string | null = null;
  const allergenText = read.text("Allergen", false);
  if (allergenText !== undefined) {
    const hit = allergens.resolve(allergenText);
    if (hit) {
      allergen = hit.name;
    } else {
      problems.push(
        unknownValue(
          "Allergen",
          allergenText,
          "an allergen tag",
          allergens.suggest(allergenText),
          allergens.names.join(", "),
        ),
      );
    }
  }

  /* ---- Words about the spice -------------------------------------------- */

  const tip = read.text("Tip", true);

  const pairsWith: FoodRef[] = [];
  for (const word of read.list("Pairs with", true) ?? []) {
    const hit = foods.resolve(word);
    if (!hit) {
      problems.push(
        unknownValue("Pairs with", word, "a known food", foods.suggest(word), "src/data/foods.json"),
      );
    } else if (pairsWith.some((p) => p.key === hit.key)) {
      problems.push(`Pairs with lists "${hit.name}" twice (one of the spellings is an alias)`);
    } else {
      pairsWith.push(hit);
    }
  }

  const typicalDishes = read.list("Typical dishes", false) ?? [];
  const careful = read.text("Careful", false) ?? null;

  /* ---- Sources, confidence, doubt --------------------------------------- */

  const sources = read.all("Source");
  if (sources.length === 0) {
    problems.push(`missing required field "Source". Every spice needs at least one link.`);
  }
  for (const url of sources) {
    if (!URL_PATTERN.test(url)) {
      problems.push(`Source "${truncate(url)}" is not a web address starting with http:// or https://`);
    }
  }

  const confidenceText = read.text("Confidence", true);
  let confidence: Confidence | undefined;
  if (confidenceText !== undefined) {
    confidence = CONFIDENCE.find((c) => c === norm(confidenceText));
    if (!confidence) {
      problems.push(
        unknownValue(
          "Confidence",
          confidenceText,
          "a confidence level",
          suggest(confidenceText, CONFIDENCE),
          CONFIDENCE.join(", "),
        ),
      );
    }
  }

  const doubt = read.text("Doubt", false) ?? null;
  if (confidence !== undefined && confidence !== "high" && doubt === null) {
    problems.push(
      `Confidence is "${confidence}", so a Doubt line is needed saying what you are unsure of`,
    );
  }

  /* ---- Done ------------------------------------------------------------- */

  const index: SpiceIndexEntry | null =
    name !== undefined ? { name, aka, family } : null;

  if (problems.length > 0 || name === undefined || category === undefined || tip === undefined || confidence === undefined) {
    return { path, spice: null, problems, index };
  }

  return {
    path,
    problems: [],
    index,
    spice: {
      path,
      slug: slugOfPath(path),
      name,
      aka,
      category,
      family,
      forms,
      origin,
      cuisines: cuisineNames,
      flavor,
      power,
      heat,
      allergen,
      tip,
      pairsWith,
      typicalDishes,
      careful,
      sources,
      confidence,
      doubt,
    },
  };
}

/** A whole-number rating within a range. Returns null when absent or invalid. */
function readRating(
  read: Reader,
  field: string,
  low: number,
  high: number,
  required: boolean,
): number | null {
  const text = read.text(field, required);
  if (text === undefined) return null;

  if (!/^\d+$/.test(text)) {
    read.problems.push(`${field} must be a whole number from ${low} to ${high}, found "${text}"`);
    return null;
  }

  const value = Number.parseInt(text, 10);
  if (value < low || value > high) {
    read.problems.push(`${field} must be from ${low} to ${high}, found ${value}`);
    return null;
  }

  return value;
}
