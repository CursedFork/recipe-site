/* ---------------------------------------------------------------------------
   The cross-file checks, and the derived data.

   The file parsers check what one file can say about itself. This checks what
   only the whole library can: is the name already taken, is this family a real
   spice, does this ingredient exist. It also works out the things a blend
   never types by hand, its allergens and its "go easy" list.

   It is a pure function over text, with no file access, so the tests can feed
   it broken files directly. load-spices.ts is the thin part that reads the real
   folders.

   Every problem across every file is collected and returned together.

   Build time only.
   --------------------------------------------------------------------------- */

import { parseBlendFile, type BlendParse } from "./parse-blend";
import { parseSpiceFile, type SpiceParse } from "./parse-spice";
import { compareNames, norm, slugOfPath, slugifyName, suggest } from "./text";
import type { Blend, BlendIngredient, SourceFile, Spice } from "./types";

export interface LibraryInput {
  files: SourceFile[];
  /** Paths in the two folders that are not .txt files. */
  strayPaths?: string[];
  /** Names from src/config/pantry.ts. */
  staples?: readonly string[];
}

export interface Library {
  spices: Spice[];
  blends: Blend[];
  /** The slug of each umbrella spice, to the slugs of its members. */
  families: Map<string, string[]>;
  /** Every problem, formatted as "path: problem", in file order. */
  problems: string[];
}

const byPath = (a: SourceFile, b: SourceFile) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

/**
 * When two files claim one name or address, the one whose filename is the slug
 * of its Name is the rightful owner. Putting it first means the error lands on
 * the file that is actually in the wrong, not on whichever happens to sort
 * second. (Array.sort is stable, so everything else keeps its order.)
 */
function rightfulOwnerFirst(
  a: { path: string; index: { name: string } | null },
  b: { path: string; index: { name: string } | null },
): number {
  const owns = (parse: { path: string; index: { name: string } | null }) =>
    parse.index !== null && slugOfPath(parse.path) === slugifyName(parse.index.name) ? 0 : 1;
  return owns(a) - owns(b);
}

const quoted = (names: readonly string[]) => names.map((name) => `"${name}"`).join(" or ");

export function buildLibrary(input: LibraryInput): Library {
  const found: Array<{ path: string; message: string }> = [];
  const add = (path: string, message: string) => found.push({ path, message });

  for (const stray of input.strayPaths ?? []) {
    const folder = stray.startsWith("blends/") ? "blends" : "spices";
    add(stray, `only .txt files belong in the ${folder} folder`);
  }

  const spiceParses = input.files
    .filter((file) => file.path.startsWith("spices/"))
    .sort(byPath)
    .map((file) => parseSpiceFile(file.path, file.text));

  const blendParses = input.files
    .filter((file) => file.path.startsWith("blends/"))
    .sort(byPath)
    .map((file) => parseBlendFile(file.path, file.text));

  for (const parse of [...spiceParses, ...blendParses]) {
    for (const message of parse.problems) add(parse.path, message);
  }

  /* ======================================================================
     Spices
     ====================================================================== */

  // Every spice file that has a readable Name takes part, even if it has other
  // problems, so one broken file does not cascade into errors elsewhere.
  const named = spiceParses
    .filter((parse): parse is SpiceParse & { index: NonNullable<SpiceParse["index"]> } => parse.index !== null)
    .sort(rightfulOwnerFirst);

  const byName = new Map<string, (typeof named)[number]>();
  const bySlug = new Map<string, (typeof named)[number]>();

  for (const parse of named) {
    const nameKey = norm(parse.index.name);
    const sameName = byName.get(nameKey);

    if (sameName) {
      add(parse.path, `the Name "${parse.index.name}" is already used by ${sameName.path}`);
      continue;
    }
    byName.set(nameKey, parse);

    // Two different names can still land on one address: "Chile: Ancho" and
    // "Chile, ancho" both become chile-ancho.
    const slug = slugifyName(parse.index.name);
    const sameSlug = bySlug.get(slug);
    if (sameSlug) {
      add(
        parse.path,
        `"${parse.index.name}" would have the same address (/spices/library/${slug}) as ` +
          `"${sameSlug.index.name}" in ${sameSlug.path}`,
      );
    } else {
      bySlug.set(slug, parse);
    }
  }

  // Every word that can stand for a spice: its Name, and each Aka.
  const spiceWords = new Map<string, (typeof named)[number]>();
  for (const parse of named) spiceWords.set(norm(parse.index.name), parse);

  for (const parse of named) {
    for (const word of parse.index.aka) {
      const key = norm(word);
      const asName = byName.get(key);

      if (asName && asName !== parse) {
        add(parse.path, `Aka "${word}" is already the Name of ${asName.path}`);
        continue;
      }

      const owner = spiceWords.get(key);
      if (owner && owner !== parse) {
        add(
          parse.path,
          `Aka "${word}" is also used by "${owner.index.name}" (${owner.path}). A word may point at only one spice`,
        );
      } else {
        spiceWords.set(key, parse);
      }
    }
  }

  const everySpiceWord = named.flatMap((parse) => [parse.index.name, ...parse.index.aka]);

  // Families
  for (const parse of named) {
    const { name, family } = parse.index;

    if (family !== null) {
      const umbrella = byName.get(norm(family));

      if (!umbrella) {
        const close = suggest(family, named.map((other) => other.index.name));
        add(
          parse.path,
          `Family "${family}" is not a spice in the library. Add it first, or check the spelling.` +
            (close.length > 0 ? ` Did you mean ${quoted(close)}?` : ""),
        );
      } else if (umbrella === parse) {
        add(parse.path, `a spice cannot be its own Family`);
      } else if (umbrella.index.family !== null) {
        add(
          parse.path,
          `Family "${umbrella.index.name}" has a family of its own ("${umbrella.index.family}"). Families are one level only`,
        );
      } else if (!norm(name).startsWith(`${norm(umbrella.index.name)}: `)) {
        add(
          parse.path,
          `with Family "${umbrella.index.name}", the Name must start with "${umbrella.index.name}: " followed by the variety`,
        );
      }
    } else if (name.includes(": ")) {
      add(
        parse.path,
        `the Name has a colon, which marks a variety, but there is no Family line. ` +
          `Add "Family: ${name.slice(0, name.lastIndexOf(": "))}" and make sure that spice exists`,
      );
    }
  }

  // Pantry staples
  for (const staple of input.staples ?? []) {
    if (!spiceWords.has(norm(staple))) {
      const close = suggest(staple, everySpiceWord);
      add(
        "src/config/pantry.ts",
        `the staple "${staple}" is not a spice in the library.` +
          (close.length > 0 ? ` Did you mean ${quoted(close)}?` : ` Add it to the spices folder first.`),
      );
    }
  }

  /* ======================================================================
     Blends
     ====================================================================== */

  const namedBlends = blendParses
    .filter((parse): parse is BlendParse & { index: NonNullable<BlendParse["index"]> } => parse.index !== null)
    .sort(rightfulOwnerFirst);

  const blendNames = new Map<string, (typeof namedBlends)[number]>();
  const blendSlugs = new Map<string, (typeof namedBlends)[number]>();

  for (const parse of namedBlends) {
    const key = norm(parse.index.name);
    const same = blendNames.get(key);

    if (same) {
      add(parse.path, `the Name "${parse.index.name}" is already used by ${same.path}`);
      continue;
    }
    blendNames.set(key, parse);

    const slug = slugifyName(parse.index.name);
    const sameSlug = blendSlugs.get(slug);
    if (sameSlug) {
      add(
        parse.path,
        `"${parse.index.name}" would have the same address (/spices/blends/${slug}) as ` +
          `"${sameSlug.index.name}" in ${sameSlug.path}`,
      );
    } else {
      blendSlugs.set(slug, parse);
    }
  }

  const blendWords = new Map<string, (typeof namedBlends)[number]>();
  for (const parse of namedBlends) blendWords.set(norm(parse.index.name), parse);

  for (const parse of namedBlends) {
    for (const word of parse.index.aka) {
      const key = norm(word);
      const asName = blendNames.get(key);

      if (asName && asName !== parse) {
        add(parse.path, `Aka "${word}" is already the Name of ${asName.path}`);
        continue;
      }

      const owner = blendWords.get(key);
      if (owner && owner !== parse) {
        add(
          parse.path,
          `Aka "${word}" is also used by "${owner.index.name}" (${owner.path}). A word may point at only one blend`,
        );
      } else {
        blendWords.set(key, parse);
      }
    }
  }

  // Ingredients: match each to a spice file, and work out what a blend never types.
  const spiceBySlug = new Map<string, Spice>();
  for (const parse of spiceParses) if (parse.spice) spiceBySlug.set(parse.spice.slug, parse.spice);

  const blends: Blend[] = [];

  for (const parse of blendParses) {
    const resolved: BlendIngredient[] = [];
    const seen = new Map<string, string>();
    let allResolved = true;

    for (const ingredient of parse.ingredients) {
      const hit = spiceWords.get(norm(ingredient.name));

      if (!hit) {
        allResolved = false;
        const close = suggest(ingredient.name, everySpiceWord);
        add(
          parse.path,
          `ingredient "${ingredient.name}" is not a spice in the library.` +
            (close.length > 0 ? ` Did you mean ${quoted(close)}?` : "") +
            ` If it is a new spice, add its file to the spices folder first.`,
        );
        continue;
      }

      const slug = slugOfPath(hit.path);
      const earlier = seen.get(slug);
      if (earlier !== undefined) {
        allResolved = false;
        add(
          parse.path,
          `the ingredient "${hit.index.name}" is listed twice (as "${earlier}" and as "${ingredient.name}")`,
        );
        continue;
      }

      seen.set(slug, ingredient.name);
      resolved.push({ ...ingredient, spiceSlug: slug });
    }

    if (!parse.draft || !allResolved || parse.problems.length > 0) continue;

    const allergenSet = new Set<string>();
    const goEasy: Blend["goEasy"] = [];

    for (const ingredient of resolved) {
      const spice = spiceBySlug.get(ingredient.spiceSlug);
      if (!spice) continue;

      if (spice.allergen) allergenSet.add(spice.allergen);
      if (spice.power !== null && spice.power >= 4) {
        goEasy.push({ name: spice.name, power: spice.power, optional: ingredient.optional });
      }
    }

    goEasy.sort((a, b) => b.power - a.power || compareNames(a.name, b.name));

    blends.push({
      ...parse.draft,
      ingredients: resolved,
      allergens: [...allergenSet].sort(),
      goEasy,
    });
  }

  /* ======================================================================
     The result
     ====================================================================== */

  const spices = spiceParses
    .flatMap((parse) => (parse.spice ? [parse.spice] : []))
    .sort((a, b) => compareNames(a.name, b.name));

  const families = new Map<string, string[]>();
  for (const spice of spices) {
    if (spice.family === null) continue;
    const umbrella = byName.get(norm(spice.family));
    if (!umbrella) continue;
    const umbrellaSlug = slugOfPath(umbrella.path);
    families.set(umbrellaSlug, [...(families.get(umbrellaSlug) ?? []), spice.slug]);
  }

  // Stable: by path, then in the order the problems were found.
  const problems = found
    .map((entry, order) => ({ ...entry, order }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.order - b.order))
    .map((entry) => `${entry.path}: ${entry.message}`);

  return {
    spices,
    blends: blends.sort((a, b) => compareNames(a.name, b.name)),
    families,
    problems,
  };
}
