/* ---------------------------------------------------------------------------
   The finder: which blends can be made from the spices a visitor owns.

   Pure functions, so every rule in plan section 9 is tested. Ships to the
   browser, so it imports only other browser-safe files.
   --------------------------------------------------------------------------- */

import { compareNames } from "./text";
import type { Fit, LibraryBlend } from "./blend-filter";

/** One ingredient line of a blend, with what the matching needs to know. */
export interface FinderIngredient {
  slug: string;
  name: string;
  optional: boolean;
  /** Slugs of the varieties, when the line names a whole family. Else empty. */
  members: string[];
  /** Other varieties in the same family, when the line names one variety. */
  siblings: Array<{ slug: string; name: string }>;
}

export interface FinderBlend extends LibraryBlend {
  ingredients: FinderIngredient[];
}

export interface Hint {
  /** The spice the blend asks for and the visitor lacks. */
  missing: string;
  /** A close relative the visitor does own. */
  have: string;
}

export interface BlendStatus {
  /** Required ingredients not covered, in the blend's own order. */
  missing: FinderIngredient[];
  /** Optional ingredients not covered. Never block anything. */
  niceToHave: FinderIngredient[];
  hints: Hint[];
}

/** Ticked spices, plus the staples while the switch is on. */
export function ownedSet(owned: readonly string[], staples: boolean, stapleSlugs: readonly string[]): Set<string> {
  return new Set(staples ? [...owned, ...stapleSlugs] : owned);
}

/** A line naming a family is met by the umbrella or any variety. */
export function isCovered(ingredient: FinderIngredient, owned: ReadonlySet<string>): boolean {
  return owned.has(ingredient.slug) || ingredient.members.some((slug) => owned.has(slug));
}

export function statusOf(blend: FinderBlend, owned: ReadonlySet<string>): BlendStatus {
  const missing: FinderIngredient[] = [];
  const niceToHave: FinderIngredient[] = [];
  const hints: Hint[] = [];

  for (const ingredient of blend.ingredients) {
    if (isCovered(ingredient, owned)) continue;

    if (ingredient.optional) {
      niceToHave.push(ingredient);
      continue;
    }

    missing.push(ingredient);
    const relative = ingredient.siblings.find((sibling) => owned.has(sibling.slug));
    if (relative) hints.push({ missing: ingredient.name, have: relative.name });
  }

  return { missing, niceToHave, hints };
}

export function statusLabel(missingCount: number): string {
  if (missingCount === 0) return "Ready now";
  if (missingCount === 1) return "Missing one";
  if (missingCount === 2) return "Missing two";
  return "Missing three or more";
}

export type SortMode = "best" | "ready";

export interface FinderResult {
  blend: FinderBlend;
  fit: Fit | null;
  status: BlendStatus;
}

const FIT_RANK = { classic: 0, also: 1 } as const;

/**
 * Adds the cabinet status to blends that already passed the other filters.
 *
 * "Best match" puts fit first, then status. "Ready first" puts status first,
 * then fit. With no food chosen the fit part is skipped (every fit is null),
 * and with an empty cabinet the status part is skipped, so the list stays A to Z.
 */
export function rankForCabinet(
  results: ReadonlyArray<{ blend: LibraryBlend; fit: Fit | null }>,
  owned: ReadonlySet<string>,
  cabinetEmpty: boolean,
  sort: SortMode,
  maxMissing: number | null = null,
): FinderResult[] {
  const ranked: FinderResult[] = [];

  for (const { blend, fit } of results) {
    const finderBlend = blend as FinderBlend;
    const status = statusOf(finderBlend, owned);
    if (maxMissing !== null && status.missing.length > maxMissing) continue;
    ranked.push({ blend: finderBlend, fit, status });
  }

  const fitRank = (r: FinderResult) => (r.fit ? FIT_RANK[r.fit] : 2);
  const statusRank = (r: FinderResult) => (cabinetEmpty ? 0 : Math.min(r.status.missing.length, 3));

  return ranked.sort((a, b) => {
    const byFit = fitRank(a) - fitRank(b);
    const byStatus = statusRank(a) - statusRank(b);
    const first = sort === "best" ? byFit || byStatus : byStatus || byFit;
    return first || compareNames(a.blend.name, b.blend.name);
  });
}
