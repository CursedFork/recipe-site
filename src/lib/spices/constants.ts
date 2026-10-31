/* ---------------------------------------------------------------------------
   The fixed lists for spice and blend files.

   These are the values that do not change as the library grows. The lists
   that DO grow (foods, cuisines and so on) live in src/data as JSON, so adding
   to them never means touching code.
   --------------------------------------------------------------------------- */

export const CATEGORIES = [
  "Peppercorns",
  "Chiles",
  "Paprika",
  "Seeds and pods",
  "Warm spices",
  "Roots and rhizomes",
  "Dried herbs",
  "Alliums and aromatics",
  "Salts and sugars",
  "Tangy and floral",
  "Other ingredients",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Power would be meaningless on table salt or a hazelnut, so these skip it. */
export const POWER_EXEMPT: readonly Category[] = ["Salts and sugars", "Other ingredients"];

/** A chile without a Heat rating is almost certainly a forgotten line. */
export const HEAT_REQUIRED: readonly Category[] = ["Chiles"];

export const FORMS = ["whole", "ground", "flakes", "leaves", "granules"] as const;
export type Form = (typeof FORMS)[number];

export const CONFIDENCE = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const SPICE_FIELDS = [
  "Name",
  "Aka",
  "Category",
  "Family",
  "Form",
  "Origin",
  "Cuisines",
  "Flavor",
  "Power",
  "Heat",
  "Allergen",
  "Tip",
  "Pairs with",
  "Typical dishes",
  "Careful",
  "Source",
  "Confidence",
  "Doubt",
] as const;

export const BLEND_FIELDS = [
  "Name",
  "Aka",
  "Cuisines",
  "Origin",
  "Uses",
  "Methods",
  "Classic",
  "Also",
  "Tip",
  "Typical version",
  "Careful",
  "Source",
  "Confidence",
  "Doubt",
] as const;

/**
 * Fields that were called something else in the first draft of the format.
 * An agent working from an older copy of the instructions will use the old
 * name, and "Did you mean Uses?" would point it the wrong way, so the error
 * says the field was renamed instead.
 */
export const RENAMED_FIELDS: Record<string, string> = {
  Use: "Tip",
  Cuisine: "Cuisines",
  Sources: "Source",
};

/** The only field that may appear more than once. */
export const REPEATABLE_FIELDS = ["Source"] as const;

/** The fewest ingredients that make a blend rather than a single spice. */
export const MIN_BLEND_INGREDIENTS = 2;
