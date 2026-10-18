/* ---------------------------------------------------------------------------
   Scaling amounts and converting units.

   Pure functions with no DOM and no state, so the recipe page and the tests
   both use exactly the same code. Every rule below is covered by a test in
   units.test.ts.

   The three rules that matter most, and why:

   1. A line with no amount never scales and never converts. "salt to taste"
      is advice, not a measurement.

   2. Volume is never converted to weight. A cup of flour is not 125 grams
      except for one particular flour, packed one particular way, and getting
      it wrong ruins a bake. Lines like that stay in their original units and
      the reader is told once, quietly, rather than on every line.

   3. Temperatures convert only when the Fahrenheit is explicit. "350°F",
      "350 F" and "350 degrees F" are safe to read; a bare "350" could be
      anything, so it is left completely alone.
   --------------------------------------------------------------------------- */

import type { Ingredient } from "./parse-recipe";

export type UnitSystem = "us" | "metric";

/* ---- Formatting amounts as fractions ------------------------------------ */

/**
 * Denominators a cook actually has. Real measuring spoons and cups come in
 * halves, thirds, quarters and eighths, so an amount is snapped to the closest
 * of those rather than shown as a decimal. "2 1/4 cups" is something you can
 * measure; "2.25 cups" is something you have to think about.
 */
const DENOMINATORS = [2, 3, 4, 8];

/** Anything within this of a whole number is that whole number. */
const WHOLE_TOLERANCE = 1 / 32;

/**
 * Render a number the way a recipe writes it.
 *
 *   2.25   -> "2 1/4"
 *   0.6667 -> "2/3"
 *   0.5    -> "1/2"
 *   1.875  -> "1 7/8"
 *   3      -> "3"
 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";

  let whole = Math.floor(value);
  let fraction = value - whole;

  // Close enough to the whole number below.
  if (fraction < WHOLE_TOLERANCE) return String(whole);

  // Close enough to the whole number above.
  if (fraction > 1 - WHOLE_TOLERANCE) return String(whole + 1);

  let best: { numerator: number; denominator: number; error: number } | null = null;

  for (const denominator of DENOMINATORS) {
    const numerator = Math.round(fraction * denominator);
    if (numerator <= 0 || numerator >= denominator) continue;

    const error = Math.abs(fraction - numerator / denominator);
    // Strictly less, so a tie goes to the simpler denominator: 1/2 beats 4/8.
    if (best === null || error < best.error) {
      best = { numerator, denominator, error };
    }
  }

  if (best === null) return String(whole === 0 ? round(value, 2) : whole);

  const fractionText = `${best.numerator}/${best.denominator}`;
  return whole === 0 ? fractionText : `${whole} ${fractionText}`;
}

/* ---- Unit tables --------------------------------------------------------- */

/** Volume units, in millilitres. */
const VOLUME_IN_ML: Record<string, number> = {
  tsp: 4.92892,
  tbsp: 14.7868,
  "fl oz": 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
};

/** Weight units, in grams. */
const WEIGHT_IN_G: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
  kg: 1000,
};

/** Units that are already metric, so metric mode leaves them alone. */
const ALREADY_METRIC = new Set(["ml", "l", "g", "kg"]);

/**
 * Units that take an "s" when there is more than one of them.
 *
 * The parser normalises "cups" to "cup" so that the maths has one spelling to
 * work with, which means display has to put the plural back. Abbreviations are
 * deliberately not in here: a recipe says "2 tbsp" and "500 g", never "2 tbsps"
 * or "500 gs".
 */
const PLURALISES = new Set(["cup", "pint", "quart", "gallon"]);

/**
 * Put a unit back into the form a recipe would print.
 *
 * Plural only above one, which is how recipes are actually written:
 * "1/2 cup" and "1 cup" are singular, "1 1/2 cups" and "2 cups" are not.
 */
export function displayUnit(unit: string | null, value: number): string | null {
  if (unit === null || !PLURALISES.has(unit)) return unit;
  return value > 1 ? `${unit}s` : unit;
}

export function isVolumeUnit(unit: string | null): boolean {
  return unit !== null && unit in VOLUME_IN_ML;
}

export function isWeightUnit(unit: string | null): boolean {
  return unit !== null && unit in WEIGHT_IN_G;
}

/* ---- Ingredients measured by volume that should not be ------------------
   Dry and solid goods that a metric cook weighs rather than scoops. Turning
   "2 cups flour" into "473 ml flour" is technically correct and completely
   useless, and turning it into grams needs a density per ingredient, which is
   guessing. So these keep their original units and the reader gets one note.

   This is a judgement list, not a law of physics. Add to it freely: it only
   ever makes the site more cautious. It is documented in the README. */

const WEIGHED_NOT_SCOOPED = [
  "flour",
  "sugar",
  "rice",
  "oats",
  "oatmeal",
  "cocoa",
  "cornstarch",
  "cornflour",
  "breadcrumbs",
  "semolina",
  "polenta",
  "couscous",
  "quinoa",
  "lentil",
  "chocolate",
  "cheese",
  "butter",
  "shortening",
  "almond",
  "walnut",
  "pecan",
  "cashew",
  "peanut",
  "hazelnut",
  "pistachio",
  "raisin",
  "sultana",
  "coconut",
  "powdered",
  "confectioners",
  "icing",
];

/**
 * True when this item is one a metric cook would weigh, so a volume
 * measurement of it should be left exactly as written.
 */
export function isWeighedNotScooped(item: string): boolean {
  const text = item.toLowerCase();
  return WEIGHED_NOT_SCOOPED.some((word) => text.includes(word));
}

/* ---- Rounding ------------------------------------------------------------ */

function round(value: number, places = 0): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Round a metric amount to something you could actually measure.
 *
 * Under 10, to the nearest whole unit, so a quarter teaspoon does not vanish.
 * Above that, to the nearest 5, which is how measuring jugs and scales are
 * marked: 30 ml, not 29.57; 355 ml, not 354.88.
 */
export function roundMetric(value: number): number {
  if (value < 10) return Math.max(1, Math.round(value));
  return Math.round(value / 5) * 5;
}

/* ---- Converting one measurement ------------------------------------------ */

export interface ConvertedAmount {
  amountText: string;
  unit: string | null;
  /** True when metric was asked for and we deliberately did not convert. */
  keptOriginalUnit: boolean;
}

/**
 * Scale an amount and express it in the requested system.
 * `factor` is the servings multiplier, so 4 servings to 6 is 1.5.
 */
export function convertAmount(
  amount: number,
  unit: string | null,
  item: string,
  factor: number,
  system: UnitSystem,
): ConvertedAmount {
  const scaled = amount * factor;

  // No unit to convert: "3 eggs" is 3 eggs in any system.
  if (unit === null) {
    return { amountText: formatAmount(scaled), unit: null, keptOriginalUnit: false };
  }

  if (system === "us" || ALREADY_METRIC.has(unit)) {
    return { amountText: formatAmount(scaled), unit, keptOriginalUnit: false };
  }

  if (isVolumeUnit(unit)) {
    // Rule 2: a dry good measured by volume stays exactly as written.
    if (isWeighedNotScooped(item)) {
      return { amountText: formatAmount(scaled), unit, keptOriginalUnit: true };
    }

    const millilitres = scaled * VOLUME_IN_ML[unit];
    if (millilitres >= 1000) {
      return { amountText: String(round(millilitres / 1000, 1)), unit: "L", keptOriginalUnit: false };
    }
    return { amountText: String(roundMetric(millilitres)), unit: "ml", keptOriginalUnit: false };
  }

  if (isWeightUnit(unit)) {
    const grams = scaled * WEIGHT_IN_G[unit];
    if (grams >= 1000) {
      return { amountText: String(round(grams / 1000, 2)), unit: "kg", keptOriginalUnit: false };
    }
    return { amountText: String(roundMetric(grams)), unit: "g", keptOriginalUnit: false };
  }

  // An unrecognised unit is left alone rather than guessed at.
  return { amountText: formatAmount(scaled), unit, keptOriginalUnit: false };
}

/* ---- A whole ingredient line --------------------------------------------- */

export interface RenderedIngredient {
  text: string;
  keptOriginalUnit: boolean;
}

/**
 * Turn one parsed ingredient into the line to show, at the given servings and
 * in the given system.
 */
export function renderIngredient(
  ingredient: Ingredient,
  factor: number,
  system: UnitSystem,
): RenderedIngredient {
  // Headings and lines with no amount are shown exactly as written.
  if (ingredient.isHeading || ingredient.amount === null) {
    return { text: ingredient.raw, keptOriginalUnit: false };
  }

  const { amountText, unit, keptOriginalUnit } = convertAmount(
    ingredient.amount,
    ingredient.unit,
    ingredient.item,
    factor,
    system,
  );

  // The scaled value in the ORIGINAL unit, which is what decides the plural.
  // In metric the unit will be ml or g, which never pluralise anyway.
  const scaledValue = ingredient.amount * factor;

  const parts = [amountText, displayUnit(unit, scaledValue), ingredient.item].filter(
    (part): part is string => part !== null && part.length > 0,
  );

  return { text: parts.join(" "), keptOriginalUnit };
}

/* ---- Temperatures in instructions ---------------------------------------- */

/**
 * Explicit Fahrenheit only.
 *
 * Matches: 350°F, 350 °F, 350F, 350 F, 350 degrees F, 350 degrees Fahrenheit
 * Does not match: a bare 350, or "350 Flour", because F must stand alone.
 */
const FAHRENHEIT = /(\d+(?:\.\d+)?)\s*(?:°\s*F\b|°\s*Fahrenheit\b|degrees?\s+F\b|degrees?\s+Fahrenheit\b|\s*F(?![a-eg-zA-EG-Z]))/gi;

/** Fahrenheit to Celsius, rounded to a setting an oven dial actually has. */
export function fahrenheitToCelsius(fahrenheit: number): number {
  const celsius = ((fahrenheit - 32) * 5) / 9;
  return Math.round(celsius / 5) * 5;
}

/**
 * Rewrite explicit Fahrenheit temperatures in a line of instructions.
 * Anything that is not unambiguously a temperature is left untouched.
 */
export function convertTemperatures(text: string, system: UnitSystem): string {
  if (system === "us") return text;

  return text.replace(FAHRENHEIT, (match, number: string) => {
    const fahrenheit = Number.parseFloat(number);
    if (!Number.isFinite(fahrenheit)) return match;
    return `${fahrenheitToCelsius(fahrenheit)}°C`;
  });
}
