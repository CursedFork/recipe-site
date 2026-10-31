/* ---------------------------------------------------------------------------
   The shapes the parsers produce.

   Everything here is plain data with no behavior, so it can be handed to a
   React island as props and written into a static page.
   --------------------------------------------------------------------------- */

import type { ResolvedRegion } from "../regions";
import type { Category, Confidence, Form } from "./constants";

/** A food as written in a Pairs with, Classic or Also line, once resolved. */
export interface FoodRef {
  /** The canonical name from foods.json, whatever alias was typed. */
  name: string;
  kind: "group" | "item";
  groupId: string;
  groupName: string;
  /** Null when the reference is to the whole group. */
  itemId: string | null;
  /** Unique per group or item, so two spellings of one food can be compared. */
  key: string;
}

export interface Spice {
  /** Where the file lives, for error messages: spices/clove.txt */
  path: string;
  /** The filename without .txt, which is also the page address. */
  slug: string;
  name: string;
  aka: string[];
  category: Category;
  /** The Name of the umbrella spice this belongs to, if any. */
  family: string | null;
  forms: Form[];
  origin: ResolvedRegion[];
  cuisines: string[];
  flavor: string[];
  /** Null only for the categories that do not use Power. */
  power: number | null;
  heat: number | null;
  allergen: string | null;
  tip: string;
  pairsWith: FoodRef[];
  typicalDishes: string[];
  careful: string | null;
  sources: string[];
  confidence: Confidence;
  doubt: string | null;
}

export type Amount =
  | { kind: "parts"; value: number; text: string }
  | { kind: "pinch" }
  | { kind: "to-taste" };

export interface BlendIngredient {
  /** The line exactly as written. */
  raw: string;
  /** The spice name as written, before it was matched to a file. */
  name: string;
  /** The slug of the spice file it resolved to. Empty until cross-checked. */
  spiceSlug: string;
  amount: Amount;
  optional: boolean;
}

export interface Blend {
  path: string;
  slug: string;
  name: string;
  aka: string[];
  cuisines: string[];
  origin: ResolvedRegion[];
  uses: string[];
  methods: string[];
  classic: FoodRef[];
  also: FoodRef[];
  tip: string;
  typicalVersion: string;
  careful: string | null;
  sources: string[];
  confidence: Confidence;
  doubt: string | null;
  ingredients: BlendIngredient[];

  /** Worked out from the ingredients, never typed. Sorted. */
  allergens: string[];
  /** Ingredients with Power 4 or 5, strongest first, for the "Go easy" note. */
  goEasy: Array<{ name: string; power: number; optional: boolean }>;
}

/** A blend before its ingredients have been matched to spice files. */
export type BlendDraft = Omit<Blend, "allergens" | "goEasy">;

export interface SourceFile {
  /** Relative to the project, with forward slashes: spices/clove.txt */
  path: string;
  text: string;
}
