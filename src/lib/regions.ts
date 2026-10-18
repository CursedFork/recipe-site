/* ---------------------------------------------------------------------------
   Resolving the words you write into canonical ISO alpha-3 codes.

   Runs at build time only. An unresolvable region is a build error naming the
   recipe file and the exact text that did not match, because you would much
   rather fix a typo than wonder why a recipe never showed up on the map.
   --------------------------------------------------------------------------- */

import {
  countries,
  groupedRegions,
  type Alpha3,
  type GroupKey,
} from "../data/regions";

/** What one region word on a recipe resolved to. */
export interface ResolvedRegion {
  /** Exactly what was written in the file, for display. */
  label: string;
  /** The display name from the lookup. */
  name: string;
  /** A single country, or a group covering several. */
  kind: "country" | "group";
  /** The group's key, when kind is "group". */
  groupKey?: GroupKey;
  /** Canonical codes. One for a country, several for a group. */
  codes: Alpha3[];
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Every accepted spelling, mapped to what it resolves to. Built once.
 * A name and an alias are treated identically, so "USA", "US" and "United
 * States of America" all land on USA.
 */
const index = buildIndex();

function buildIndex(): Map<string, ResolvedRegion> {
  const map = new Map<string, ResolvedRegion>();

  const put = (key: string, value: ResolvedRegion) => {
    const normalised = normalise(key);
    const existing = map.get(normalised);

    // Harmless overlap: a spelling that lands on the entry it already points
    // at. The United States is the obvious case, where the alpha-3 code "USA"
    // is also the natural alias someone would type.
    if (existing !== undefined) {
      const sameEntry =
        existing.name === value.name && existing.kind === value.kind;
      if (sameEntry) return;

      // A genuine clash: one spelling claimed by two different places. That is
      // a mistake in this lookup, not in a recipe, so it should be loud.
      throw new Error(
        `src/data/regions.ts: "${key}" is claimed by both "${existing.name}" and "${value.name}". ` +
          `Each name and alias must point at one place.`,
      );
    }

    map.set(normalised, value);
  };

  for (const [code, country] of Object.entries(countries)) {
    const alpha3 = code as Alpha3;
    const entry: ResolvedRegion = {
      label: country.name,
      name: country.name,
      kind: "country",
      codes: [alpha3],
    };

    put(country.name, entry);
    // The code itself is always accepted, so you can write "IND" if you want.
    put(alpha3, entry);
    for (const alias of (country as { aliases?: readonly string[] }).aliases ?? []) {
      put(alias, entry);
    }
  }

  for (const [key, group] of Object.entries(groupedRegions)) {
    const entry: ResolvedRegion = {
      label: group.name,
      name: group.name,
      kind: "group",
      groupKey: key as GroupKey,
      codes: [...group.members],
    };

    put(group.name, entry);
    put(key, entry);
    for (const alias of (group as { aliases?: readonly string[] }).aliases ?? []) {
      put(alias, entry);
    }
  }

  return map;
}

/**
 * Resolve one written region. Returns null when nothing matches, which the
 * caller turns into a build error.
 */
export function resolveRegion(written: string): ResolvedRegion | null {
  const found = index.get(normalise(written));
  if (!found) return null;

  // Keep what was actually written for display, so a recipe tagged "UK" still
  // reads "UK" on its own page even though it resolved to GBR.
  return { ...found, label: written.trim() };
}

/**
 * Suggestions for an unmatched region, so the error message is useful rather
 * than just negative. Cheap edit-distance, good enough for a typo.
 */
export function suggestRegions(written: string, limit = 3): string[] {
  const target = normalise(written);
  const scored: Array<{ name: string; score: number }> = [];

  const seen = new Set<string>();
  for (const entry of index.values()) {
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);
    scored.push({ name: entry.name, score: distance(target, normalise(entry.name)) });
  }

  return scored
    .filter((candidate) => candidate.score <= Math.max(2, Math.floor(target.length / 3)))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((candidate) => candidate.name);
}

/** Levenshtein distance. Small inputs, so the simple version is fine. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }

  return previous[b.length];
}

