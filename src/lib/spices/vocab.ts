/* ---------------------------------------------------------------------------
   The controlled lists, and resolving a typed word against them.

   Foods, methods, uses, cuisines and allergens are lists kept in src/data so
   that adding to them is a one-line change to a JSON file. Every word in a
   spice or blend file is checked against them, which is what turns a typo into
   a build error with a suggestion instead of a quiet duplicate filter button.

   Matching ignores case and accents, and every name and alias must be unique
   across its whole list. A clash is a mistake in the list itself, not in a
   spice file, so it throws loudly when the list is loaded.

   Build time only.
   --------------------------------------------------------------------------- */

import allergensJson from "../../data/allergens.json";
import cuisinesJson from "../../data/cuisines.json";
import foodsJson from "../../data/foods.json";
import methodsJson from "../../data/methods.json";
import usesJson from "../../data/uses.json";

import type { FoodRef } from "./types";
import { norm, suggest } from "./text";

export interface VocabEntry {
  id: string;
  name: string;
  aliases?: readonly string[];
}

export interface VocabHit {
  id: string;
  name: string;
}

/** A flat list of names with aliases, such as methods or cuisines. */
export class Vocabulary {
  private readonly words = new Map<string, VocabHit>();
  readonly names: string[];

  constructor(
    readonly label: string,
    entries: readonly VocabEntry[],
  ) {
    this.names = entries.map((entry) => entry.name);

    for (const entry of entries) {
      for (const word of [entry.name, ...(entry.aliases ?? [])]) {
        const key = norm(word);
        const existing = this.words.get(key);

        if (existing && existing.id !== entry.id) {
          throw new Error(
            `${label}: "${word}" is used twice, by "${existing.name}" and "${entry.name}". ` +
              `Every name and alias must be unique.`,
          );
        }

        this.words.set(key, { id: entry.id, name: entry.name });
      }
    }
  }

  resolve(text: string): VocabHit | null {
    return this.words.get(norm(text)) ?? null;
  }

  suggest(text: string, limit = 3): string[] {
    return suggest(text, this.names, limit);
  }
}

interface FoodsJson {
  groups: Array<{
    id: string;
    name: string;
    aliases?: string[];
    items: Array<{ id: string; name: string; aliases?: string[] }>;
  }>;
}

/**
 * Foods have two levels. A group such as Beef covers every item inside it, and
 * an item such as Steak is one thing a cook says. A typed word can be either,
 * or an alias for either: "ribeye" is an alias of the item Steak, and "lamb" is
 * an alias of the whole group Lamb and goat.
 */
export class FoodVocabulary {
  private readonly words = new Map<string, FoodRef>();
  readonly names: string[] = [];

  constructor(json: FoodsJson) {
    const itemIds = new Set<string>();

    for (const group of json.groups) {
      const groupRef: FoodRef = {
        name: group.name,
        kind: "group",
        groupId: group.id,
        groupName: group.name,
        itemId: null,
        key: `group:${group.id}`,
      };

      this.names.push(group.name);
      for (const word of [group.name, ...(group.aliases ?? [])]) this.add(word, groupRef);

      for (const item of group.items) {
        if (itemIds.has(item.id)) {
          throw new Error(`foods: the item id "${item.id}" is used twice.`);
        }
        itemIds.add(item.id);

        const itemRef: FoodRef = {
          name: item.name,
          kind: "item",
          groupId: group.id,
          groupName: group.name,
          itemId: item.id,
          key: `item:${item.id}`,
        };

        this.names.push(item.name);
        for (const word of [item.name, ...(item.aliases ?? [])]) this.add(word, itemRef);
      }
    }
  }

  private add(word: string, ref: FoodRef): void {
    const key = norm(word);
    const existing = this.words.get(key);

    if (existing && existing.key !== ref.key) {
      throw new Error(
        `foods: "${word}" is used twice, by "${existing.name}" and "${ref.name}". ` +
          `Every name and alias must be unique across the whole file.`,
      );
    }

    this.words.set(key, ref);
  }

  resolve(text: string): FoodRef | null {
    return this.words.get(norm(text)) ?? null;
  }

  suggest(text: string, limit = 3): string[] {
    return suggest(text, this.names, limit);
  }
}

/** The real lists, built once from src/data. */
export const foods = new FoodVocabulary(foodsJson as FoodsJson);
export const methods = new Vocabulary("methods", methodsJson.methods);
export const uses = new Vocabulary("uses", usesJson.uses);
export const allergens = new Vocabulary("allergens", allergensJson.allergens);
export const cuisines = new Vocabulary(
  "cuisines",
  cuisinesJson.groups.flatMap((group) =>
    group.cuisines.map((name) => ({ id: norm(name), name })),
  ),
);
