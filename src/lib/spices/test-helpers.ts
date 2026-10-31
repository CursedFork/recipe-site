/* ---------------------------------------------------------------------------
   Helpers for the spice and blend tests. Not used by the site.

   Each helper builds a VALID file, and a test breaks exactly one thing in it,
   so a failing assertion always points at the rule under test and nothing
   else.
   --------------------------------------------------------------------------- */

import { buildLibrary } from "./build-library";
import { BLEND_FIELDS, SPICE_FIELDS } from "./constants";

type Overrides = Record<string, string | null>;

function header(order: readonly string[], values: Record<string, string>): string {
  // Known fields in their usual order, then anything else, so a test can add a
  // field the format does not know about and see the error it should get.
  const keys = [
    ...order.filter((key) => values[key] !== undefined),
    ...Object.keys(values).filter((key) => !order.includes(key)),
  ];

  return keys
    .flatMap((key) => values[key].split("\n").map((value) => `${key}: ${value}`))
    .join("\n");
}

/** Cumin, unless overridden. A null value leaves the field out entirely. */
export function spiceText(overrides: Overrides = {}): string {
  const base: Record<string, string> = {
    Name: "Cumin",
    Category: "Seeds and pods",
    Form: "whole, ground",
    Origin: "India",
    Cuisines: "Indian, Mexican",
    Flavor: "earthy, warm",
    Power: "3",
    Tip: "Toast it in a dry pan first.",
    "Pairs with": "Lentils, Chicken",
    Source: "https://example.org/cumin",
    Confidence: "high",
  };

  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }

  return header(SPICE_FIELDS, merged) + "\n";
}

/** A blend, with the ingredient lines given separately. */
export function blendText(
  overrides: Overrides = {},
  ingredients: string[] = ["2 parts Cumin", "1 part Clove"],
): string {
  const base: Record<string, string> = {
    Name: "Test Blend",
    Cuisines: "Indian",
    Origin: "India",
    Uses: "Dry rub",
    Methods: "Roast",
    Classic: "Chicken",
    Tip: "Rub it in before cooking.",
    "Typical version": "One typical version, not the only one.",
    Source: "https://example.org/test-blend",
    Confidence: "high",
  };

  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }

  return `${header(BLEND_FIELDS, merged)}\n\nIngredients:\n${ingredients.join("\n")}\n`;
}

/** Clove: Power 5, so it triggers the "go easy" note. */
export function cloveText(overrides: Overrides = {}): string {
  return spiceText({
    Name: "Clove",
    Category: "Warm spices",
    Power: "5",
    "Pairs with": "Ham, Curry",
    ...overrides,
  });
}

/** Run files through the validator. Keys are paths: "spices/cumin.txt". */
export function library(files: Record<string, string>, extra: { staples?: string[]; strayPaths?: string[] } = {}) {
  return buildLibrary({
    files: Object.entries(files).map(([path, text]) => ({ path, text })),
    ...extra,
  });
}

/** Just the problems. */
export function problemsOf(files: Record<string, string>, extra: { staples?: string[]; strayPaths?: string[] } = {}) {
  return library(files, extra).problems;
}

/** A small valid library most tests start from. */
export function validFiles(): Record<string, string> {
  return {
    "spices/cumin.txt": spiceText(),
    "spices/clove.txt": cloveText(),
    "blends/test-blend.txt": blendText(),
  };
}
