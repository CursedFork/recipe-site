/* ---------------------------------------------------------------------------
   The blend file parser.

   Same shape as the spice parser: everything checkable from one file is
   checked here, and the ingredients are read into amounts and names. Matching
   each ingredient name to a real spice file needs the other files, so that
   happens afterwards in build-library.ts.

   Build time only.
   --------------------------------------------------------------------------- */

import { resolveRegion, suggestRegions, type ResolvedRegion } from "../regions";
import {
  BLEND_FIELDS,
  CONFIDENCE,
  MIN_BLEND_INGREDIENTS,
  RENAMED_FIELDS,
  REPEATABLE_FIELDS,
  type Confidence,
} from "./constants";
import { Reader, splitFile, unknownValue } from "./fields";
import { norm, slugOfPath, slugifyName, suggest, truncate } from "./text";
import type { Amount, BlendDraft, BlendIngredient, FoodRef } from "./types";
import { cuisines, foods, methods, uses } from "./vocab";

export interface BlendIndexEntry {
  name: string;
  aka: string[];
}

export interface BlendParse {
  path: string;
  draft: BlendDraft | null;
  problems: string[];
  index: BlendIndexEntry | null;
  /**
   * The ingredients that could be read, even when the file has other problems.
   * Their spice names are checked against the library regardless, so a typo in
   * one field does not hide a typo in an ingredient until the next build.
   */
  ingredients: BlendIngredient[];
}

const URL_PATTERN = /^https?:\/\/\S+$/;

/**
 * An ingredient line: an amount, then the spice's name, then optionally
 * "(optional)". The amount is a number of parts, or the single word "pinch",
 * or the two words "to taste".
 */
const INGREDIENT = /^(?:(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+parts?|(pinch)|(to taste))\s+(.+)$/i;

/** Someone has written teaspoons or cups: a different kind of amount entirely. */
const WRONG_UNIT = /^\d+(?:[./\s]\d+)*\s*(?:tsp|teaspoons?|tbsp|tablespoons?|cups?|g|grams?|oz|ounces?|ml)\b/i;

export function parseBlendFile(path: string, text: string): BlendParse {
  const parsed = splitFile(text, BLEND_FIELDS, REPEATABLE_FIELDS, "Ingredients");
  const problems = [...parsed.problems];

  if (parsed.empty) return { path, draft: null, problems, index: null, ingredients: [] };

  const read = new Reader(parsed, problems);

  /* ---- Name and the filename -------------------------------------------- */

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

  /* ---- The controlled lists --------------------------------------------- */

  const cuisineNames = resolveAll(
    read.list("Cuisines", true),
    problems,
    "Cuisines",
    (word) => cuisines.resolve(word)?.name ?? null,
    (word) => unknownValue("Cuisines", word, "a known cuisine", cuisines.suggest(word), "src/data/cuisines.json"),
  );

  const useNames = resolveAll(
    read.list("Uses", true),
    problems,
    "Uses",
    (word) => uses.resolve(word)?.name ?? null,
    (word) => unknownValue("Uses", word, "a known use", uses.suggest(word), "src/data/uses.json"),
  );

  const methodNames = resolveAll(
    read.list("Methods", true),
    problems,
    "Methods",
    (word) => methods.resolve(word)?.name ?? null,
    (word) => unknownValue("Methods", word, "a known method", methods.suggest(word), "src/data/methods.json"),
  );

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

  /* ---- Foods ------------------------------------------------------------ */

  const classic = resolveFoods(read.list("Classic", true), problems, "Classic");
  const also = resolveFoods(read.list("Also", false), problems, "Also");

  for (const food of classic) {
    if (also.some((other) => other.key === food.key)) {
      problems.push(`"${food.name}" is in both Classic and Also. A food belongs in one list.`);
    }
  }

  /* ---- Words and sources ------------------------------------------------ */

  const tip = read.text("Tip", true);
  const typicalVersion = read.text("Typical version", true);
  const careful = read.text("Careful", false) ?? null;

  const sources = read.all("Source");
  if (sources.length === 0) {
    problems.push(`missing required field "Source". Every blend needs at least one link.`);
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

  /* ---- The ingredients -------------------------------------------------- */

  const ingredients = readIngredients(parsed.body, problems);

  /* ---- Done ------------------------------------------------------------- */

  const index: BlendIndexEntry | null = name !== undefined ? { name, aka } : null;

  if (
    problems.length > 0 ||
    name === undefined ||
    tip === undefined ||
    typicalVersion === undefined ||
    confidence === undefined
  ) {
    return { path, draft: null, problems, index, ingredients };
  }

  return {
    path,
    problems: [],
    index,
    ingredients,
    draft: {
      path,
      slug: slugOfPath(path),
      name,
      aka,
      cuisines: cuisineNames,
      origin,
      uses: useNames,
      methods: methodNames,
      classic,
      also,
      tip,
      typicalVersion,
      careful,
      sources,
      confidence,
      doubt,
      ingredients,
    },
  };
}

/** Resolve a list against a controlled list, reporting unknown and repeated values. */
function resolveAll(
  words: string[] | undefined,
  problems: string[],
  field: string,
  resolve: (word: string) => string | null,
  unknownMessage: (word: string) => string,
): string[] {
  const found: string[] = [];

  for (const word of words ?? []) {
    const canonical = resolve(word);
    if (canonical === null) {
      problems.push(unknownMessage(word));
    } else if (found.includes(canonical)) {
      problems.push(`${field} lists "${canonical}" twice (one of the spellings is an alias)`);
    } else {
      found.push(canonical);
    }
  }

  return found;
}

function resolveFoods(words: string[] | undefined, problems: string[], field: string): FoodRef[] {
  const found: FoodRef[] = [];

  for (const word of words ?? []) {
    const hit = foods.resolve(word);
    if (!hit) {
      problems.push(unknownValue(field, word, "a known food", foods.suggest(word), "src/data/foods.json"));
    } else if (found.some((f) => f.key === hit.key)) {
      problems.push(`${field} lists "${hit.name}" twice (one of the spellings is an alias)`);
    } else {
      found.push(hit);
    }
  }

  return found;
}

/**
 * Read the Ingredients section.
 *
 * The first line below the blank line must be "Ingredients:". The most common
 * mistake is a header field written below the blank line, where it would
 * otherwise be read as an ingredient, so that gets its own message.
 */
function readIngredients(body: string[], problems: string[]): BlendIngredient[] {
  const ingredients: BlendIngredient[] = [];

  if (body.length === 0) {
    problems.push(
      `missing the "Ingredients:" section. After the header, leave one blank line, ` +
        `then write Ingredients: and one ingredient per line.`,
    );
    return ingredients;
  }

  const stray = fieldNameOf(body[0]);
  if (body[0] !== "Ingredients:") {
    problems.push(
      stray
        ? `"${stray}:" is below the blank line. Every single-line field goes ABOVE the blank line, and only the Ingredients list goes below it.`
        : `after the blank line the first line must be "Ingredients:", found "${truncate(body[0])}"`,
    );
    return ingredients;
  }

  // Lines that could not be read. When any failed, the count checks at the end
  // would only add noise ("needs at least 2 ingredients") on top of the real
  // problem, so they are skipped.
  let unreadable = 0;

  for (const line of body.slice(1)) {
    const match = line.match(INGREDIENT);

    if (!match) {
      unreadable++;
      const field = fieldNameOf(line);
      if (field) {
        problems.push(
          `"${field}:" is below the blank line. Every single-line field goes ABOVE the blank line, and only the Ingredients list goes below it.`,
        );
      } else if (WRONG_UNIT.test(line)) {
        problems.push(
          `cannot read ingredient line "${truncate(line)}". Amounts are written in parts ("2 parts Cumin"), not in teaspoons, grams or cups.`,
        );
      } else {
        problems.push(
          `cannot read ingredient line "${truncate(line)}". Write "8 parts Cumin", "1/2 part Nutmeg (optional)", "pinch Salt" or "to taste Salt".`,
        );
      }
      continue;
    }

    const optional = /\s+\(optional\)$/i.test(match[4]);
    const name = match[4].replace(/\s+\(optional\)$/i, "").trim();

    if (name.length === 0) {
      unreadable++;
      problems.push(`ingredient line "${truncate(line)}" has an amount but no spice name`);
      continue;
    }

    const amount = readAmount(match, line, problems);
    if (amount === null) {
      unreadable++;
      continue;
    }

    ingredients.push({ raw: line, name, spiceSlug: "", amount, optional });
  }

  if (unreadable === 0) {
    if (ingredients.length < MIN_BLEND_INGREDIENTS) {
      problems.push(`a blend needs at least ${MIN_BLEND_INGREDIENTS} ingredients, found ${ingredients.length}`);
    } else if (ingredients.every((ingredient) => ingredient.optional)) {
      problems.push(`every ingredient is marked optional. A blend needs at least one required ingredient.`);
    }
  }

  return ingredients;
}

/** A header field name followed by a colon, if the line starts with one. */
function fieldNameOf(line: string): string | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const key = line.slice(0, colon).trim();
  const isField = (BLEND_FIELDS as readonly string[]).includes(key) || key in RENAMED_FIELDS;
  return isField ? key : null;
}

function readAmount(match: RegExpMatchArray, line: string, problems: string[]): Amount | null {
  if (match[2]) return { kind: "pinch" };
  if (match[3]) return { kind: "to-taste" };

  const text = match[1].trim();
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  const fraction = text.match(/^(\d+)\/(\d+)$/);

  let value: number;
  if (mixed) {
    if (Number(mixed[3]) === 0) return zeroDenominator(line, problems);
    value = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  } else if (fraction) {
    if (Number(fraction[2]) === 0) return zeroDenominator(line, problems);
    value = Number(fraction[1]) / Number(fraction[2]);
  } else {
    value = Number(text);
  }

  if (!(value > 0)) {
    problems.push(`ingredient line "${truncate(line)}" has an amount of zero. An amount must be more than zero.`);
    return null;
  }

  return { kind: "parts", value, text };
}

function zeroDenominator(line: string, problems: string[]): null {
  problems.push(`ingredient line "${truncate(line)}" has a zero denominator, so its amount is not a number`);
  return null;
}
