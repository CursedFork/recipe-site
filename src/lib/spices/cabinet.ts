/* ---------------------------------------------------------------------------
   The cabinet: which spices a visitor says they have.

   Pure functions over plain data, so every rule is tested without a browser.
   The part that touches localStorage is src/islands/spices/cabinet-store.ts.

   What is saved is the spice filenames (slugs). That is why renaming a spice
   file orphans anyone's saved copy, and why unknownOwned() exists: the page
   lists those instead of silently dropping them.

   Ships to the browser, so it imports nothing from the build-time code.
   --------------------------------------------------------------------------- */

export const CABINET_KEY = "spices.cabinet";

export interface Cabinet {
  /** Spice slugs, sorted and without duplicates. */
  owned: string[];
  /** Whether salt, black pepper and sugar are assumed to be in the kitchen. */
  staples: boolean;
}

export const emptyCabinet: Cabinet = { owned: [], staples: true };

const tidy = (slugs: Iterable<string>): string[] => [...new Set(slugs)].sort();

/**
 * Read what was saved. Anything unexpected gives an empty cabinet, never an
 * error: storage can hold text from an older version of the page, or text
 * somebody edited by hand.
 */
export function parseCabinet(raw: string | null): Cabinet {
  if (raw === null) return emptyCabinet;

  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return emptyCabinet;

    const { owned, staples } = data as { owned?: unknown; staples?: unknown };

    return {
      owned: Array.isArray(owned)
        ? tidy(owned.filter((item): item is string => typeof item === "string" && item !== ""))
        : [],
      staples: typeof staples === "boolean" ? staples : true,
    };
  } catch {
    return emptyCabinet;
  }
}

export function serializeCabinet(cabinet: Cabinet): string {
  return JSON.stringify({ v: 1, owned: tidy(cabinet.owned), staples: cabinet.staples });
}

export function setOwned(cabinet: Cabinet, slug: string, has: boolean): Cabinet {
  const owned = new Set(cabinet.owned);
  if (has) owned.add(slug);
  else owned.delete(slug);
  return { ...cabinet, owned: tidy(owned) };
}

export function addMany(cabinet: Cabinet, slugs: readonly string[]): Cabinet {
  return { ...cabinet, owned: tidy([...cabinet.owned, ...slugs]) };
}

export function removeMany(cabinet: Cabinet, slugs: readonly string[]): Cabinet {
  const gone = new Set(slugs);
  return { ...cabinet, owned: cabinet.owned.filter((slug) => !gone.has(slug)) };
}

/** Empties the spices but leaves the staples switch alone: it is a setting. */
export function clearOwned(cabinet: Cabinet): Cabinet {
  return { ...cabinet, owned: [] };
}

export function setStaples(cabinet: Cabinet, staples: boolean): Cabinet {
  return { ...cabinet, staples };
}

/** Saved spices that are no longer in the library. */
export function unknownOwned(cabinet: Cabinet, known: ReadonlySet<string>): string[] {
  return cabinet.owned.filter((slug) => !known.has(slug));
}
