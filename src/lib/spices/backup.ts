/* ---------------------------------------------------------------------------
   Backing up the cabinet as plain text, and reading a pasted list back.

   The text is one spice name per line, so it can be kept in a notes app and
   pasted into another browser. Pure functions, so every rule is tested.
   Ships to the browser.
   --------------------------------------------------------------------------- */

export interface NamedSpice {
  slug: string;
  name: string;
  /** The variety alone for a family member: "Ancho" for "Chile: Ancho". */
  label: string;
  aka: string[];
}

/** Lowercase, accents removed, spaces collapsed, so "Árbol" matches "arbol". */
const plain = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** One name per line, in A to Z order, using the names the library shows. */
export function cabinetAsText(owned: readonly string[], spices: readonly NamedSpice[]): string {
  const names = new Map(spices.map((spice) => [spice.slug, spice.name]));
  return owned
    .map((slug) => names.get(slug))
    .filter((name): name is string => name !== undefined)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
}

export interface ParsedList {
  /** Spices the lines named, without duplicates. */
  slugs: string[];
  /** Lines that matched nothing, as typed, so they can be reported. */
  unknown: string[];
}

/**
 * Reads one spice per line. A line matches a spice by its full name, its
 * filename, an alias, or (when it is unambiguous) the variety alone. A leading
 * bullet, dash or "[x]" is ignored, so a copied shopping list works too.
 */
export function parseSpiceList(text: string, spices: readonly NamedSpice[]): ParsedList {
  const byName = new Map<string, string>();
  const labelCounts = new Map<string, string[]>();

  for (const spice of spices) {
    byName.set(plain(spice.name), spice.slug);
    byName.set(spice.slug, spice.slug);
    for (const alias of spice.aka) byName.set(plain(alias), spice.slug);

    const label = plain(spice.label);
    labelCounts.set(label, [...(labelCounts.get(label) ?? []), spice.slug]);
  }

  const slugs = new Set<string>();
  const unknown: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:\[[ xX]\]|[-*•])\s*/, "").trim();
    if (line === "") continue;

    const key = plain(line);
    const direct = byName.get(key);
    const byLabel = labelCounts.get(key);
    const found = direct ?? (byLabel && byLabel.length === 1 ? byLabel[0] : undefined);

    if (found) slugs.add(found);
    else unknown.push(line);
  }

  return { slugs: [...slugs].sort(), unknown };
}
