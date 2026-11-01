/* ---------------------------------------------------------------------------
   The shopping list: spices a visitor means to buy.

   Pure functions over plain data, like the cabinet. Saved as spice filenames
   (slugs) in the browser's localStorage; the store that touches it is
   src/islands/spices/shopping-store.ts. Ships to the browser.
   --------------------------------------------------------------------------- */

import { addMany as addToCabinet, type Cabinet } from "./cabinet";

export const SHOPPING_KEY = "spices.shopping";

export interface ShoppingItem {
  slug: string;
  /** Ticked off in the shop, but not yet bought into the cabinet. */
  checked: boolean;
}

export interface ShoppingList {
  /** In the order they were added, without duplicates. */
  items: ShoppingItem[];
}

export const emptyList: ShoppingList = { items: [] };

/** Anything unexpected gives an empty list, never an error. */
export function parseList(raw: string | null): ShoppingList {
  if (raw === null) return emptyList;

  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return emptyList;

    const { items } = data as { items?: unknown };
    if (!Array.isArray(items)) return emptyList;

    const seen = new Set<string>();
    const kept: ShoppingItem[] = [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const { slug, checked } = item as { slug?: unknown; checked?: unknown };
      if (typeof slug !== "string" || slug === "" || seen.has(slug)) continue;
      seen.add(slug);
      kept.push({ slug, checked: checked === true });
    }
    return { items: kept };
  } catch {
    return emptyList;
  }
}

export function serializeList(list: ShoppingList): string {
  return JSON.stringify({ v: 1, items: list.items });
}

export const isOnList = (list: ShoppingList, slug: string): boolean =>
  list.items.some((item) => item.slug === slug);

/** Adds the ones not already there, keeping what is on the list as it was. */
export function addToList(list: ShoppingList, slugs: readonly string[]): ShoppingList {
  const have = new Set(list.items.map((item) => item.slug));
  const fresh: ShoppingItem[] = [];
  for (const slug of slugs) {
    if (have.has(slug)) continue;
    have.add(slug);
    fresh.push({ slug, checked: false });
  }
  return fresh.length === 0 ? list : { items: [...list.items, ...fresh] };
}

export function removeFromList(list: ShoppingList, slug: string): ShoppingList {
  return { items: list.items.filter((item) => item.slug !== slug) };
}

export function setChecked(list: ShoppingList, slug: string, checked: boolean): ShoppingList {
  return { items: list.items.map((item) => (item.slug === slug ? { ...item, checked } : item)) };
}

/** "Bought it": the spice leaves the list and goes into the cabinet. */
export function markBought(
  list: ShoppingList,
  cabinet: Cabinet,
  slug: string,
): { list: ShoppingList; cabinet: Cabinet } {
  return { list: removeFromList(list, slug), cabinet: addToCabinet(cabinet, [slug]) };
}

/** Every ticked item at once. */
export function markAllCheckedBought(
  list: ShoppingList,
  cabinet: Cabinet,
): { list: ShoppingList; cabinet: Cabinet } {
  const bought = list.items.filter((item) => item.checked).map((item) => item.slug);
  const gone = new Set(bought);
  return {
    list: { items: list.items.filter((item) => !gone.has(item.slug)) },
    cabinet: addToCabinet(cabinet, bought),
  };
}

/** Plain text, one spice per line, for pasting into a notes app or message. */
export function listAsText(list: ShoppingList, nameOf: (slug: string) => string): string {
  return list.items.map((item) => `${item.checked ? "[x]" : "[ ]"} ${nameOf(item.slug)}`).join("\n");
}

/** Saved items that are no longer in the library. */
export function unknownOnList(list: ShoppingList, known: ReadonlySet<string>): string[] {
  return list.items.map((item) => item.slug).filter((slug) => !known.has(slug));
}
