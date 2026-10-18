/* ---------------------------------------------------------------------------
   Reads every recipe, validates them together, and stops the build if
   anything is wrong.

   The behaviour you asked for, precisely:
     - every problem across every file is collected and reported together,
       not just the first one found
     - each is formatted as `recipes/file.txt: problem` so it is scannable
     - the build exits non-zero, so Vercel never deploys a broken site

   The files are pulled in with import.meta.glob rather than read with fs. Two
   reasons. Astro bundles this module before running it, so anything derived
   from import.meta.url points inside dist/ rather than at your project, which
   makes fs paths unreliable. And a glob is resolved by Vite relative to this
   source file, which also means editing a recipe in `npm run dev` reloads the
   page immediately.

   Build time only. None of this reaches the browser.
   --------------------------------------------------------------------------- */

import { parseRecipe, type Recipe } from "./parse-recipe";
import { slugFromFilename } from "./slug";
import { photoFilenames } from "./photos";
import { warnIfPlaceholderUrl } from "../config/site";

/** Every .txt in the recipes folder, as raw text, resolved at build time. */
const recipeFiles = import.meta.glob<string>("../../recipes/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});

/**
 * Everything in the recipes folder, whatever its extension. Only the keys are
 * used, to catch files that do not belong there. The loader functions are
 * never called, so nothing is actually imported. The pattern does not descend
 * into recipes/photos, which is what we want.
 */
const anyFileInRecipesDir = import.meta.glob("../../recipes/*", {
  // Only the keys are ever read and the loader functions are never called, so
  // nothing here is actually imported. The query still matters: a dynamic
  // import with a literal path is a real module to Rollup, so without it an
  // unusual extension is resolved as source and the build dies inside Vite
  // with a parse error before our own "only .txt files belong here" message
  // ever prints. Verified by dropping a .docx in the folder: as plain source
  // Vite failed first, with ?raw our error wins.
  query: "?raw",
  import: "default",
});

/** Photo formats we accept. */
const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

let cache: Recipe[] | null = null;

/**
 * A failed validation is remembered too, not just a successful one. Astro
 * renders each page separately and every page asks for the recipes, so without
 * this the whole problem list would be recomputed and reprinted once per page.
 * One broken file should produce one report, however many pages the site has.
 */
let failure: RecipeProblems | null = null;

function basename(filePath: string): string {
  return filePath.split("/").pop()!;
}

/**
 * Every recipe, sorted by title. Memoised, so the validation runs once per
 * build no matter how many pages ask for it.
 *
 * Throws if anything is wrong with any file.
 */
export function loadRecipes(): Recipe[] {
  // Already reported once. Rethrow the same error without printing it again.
  if (failure !== null) throw failure;
  if (cache !== null) return cache;

  warnIfPlaceholderUrl();

  const problems: string[] = [];
  const recipes: Recipe[] = [];

  // Anything in the folder that is not a .txt is a mistake worth naming,
  // because it is usually a photo dropped in the wrong place.
  for (const filePath of Object.keys(anyFileInRecipesDir).sort()) {
    const name = basename(filePath);
    if (name.endsWith(".txt") || name.startsWith(".")) continue;

    const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
    problems.push(
      PHOTO_EXTENSIONS.includes(extension)
        ? `recipes/${name}: photos go in recipes/photos, not in recipes itself`
        : `recipes/${name}: only .txt recipe files belong in the recipes folder`,
    );
  }

  // What is actually in the photos folder, so a named photo can be checked.
  const availablePhotos = new Set(photoFilenames());
  const usedPhotos = new Set<string>();
  const slugOwners = new Map<string, string>();

  const entries = Object.entries(recipeFiles).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [filePath, text] of entries) {
    const filename = basename(filePath);
    const label = `recipes/${filename}`;

    const { slug, problem: slugProblem } = slugFromFilename(filename);
    if (slug === null) {
      problems.push(`${label}: ${slugProblem}`);
      continue;
    }

    // Two files producing the same URL is an error, not a silent last-wins.
    const existing = slugOwners.get(slug);
    if (existing !== undefined) {
      problems.push(
        `${label}: would produce the same URL "/recipes/${slug}" as recipes/${existing}`,
      );
      continue;
    }
    slugOwners.set(slug, filename);

    const { recipe, problems: fileProblems } = parseRecipe(label, slug, text);

    for (const problem of fileProblems) {
      problems.push(`${label}: ${problem}`);
    }

    if (recipe === null) continue;

    // The photo check needs the folder listing, so it happens here rather than
    // in the parser. A named photo that is not there is an error: showing no
    // photo instead would just hide the typo.
    if (recipe.photo !== null) {
      if (availablePhotos.has(recipe.photo)) {
        usedPhotos.add(recipe.photo);
      } else {
        const near = [...availablePhotos].find(
          (name) => name.toLowerCase() === recipe.photo!.toLowerCase(),
        );
        problems.push(
          near
            ? `${label}: photo "${recipe.photo}" not found, but "${near}" exists. Filenames are case-sensitive on the server even though they are not on Windows.`
            : `${label}: photo "${recipe.photo}" is not in recipes/photos`,
        );
        continue;
      }
    }

    recipes.push(recipe);
  }

  if (problems.length > 0) {
    failure = new RecipeProblems(problems);
    throw failure;
  }

  // Not an error, just worth knowing about. An orphaned photo is harmless, but
  // it is usually a sign that a Photo: line has a typo in it.
  const orphans = [...availablePhotos].filter((name) => !usedPhotos.has(name));
  if (orphans.length > 0) {
    console.warn(
      `\nNote: ${orphans.length} photo(s) in recipes/photos are not used by any recipe:\n` +
        orphans.map((name) => `  recipes/photos/${name}`).join("\n") +
        `\nThis is not an error. Delete them, or check the Photo: line of the recipe that should use them.\n`,
    );
  }

  cache = recipes.sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}

/**
 * Carries the whole list of problems.
 *
 * The full list is printed here rather than carried in the Error message, on
 * purpose. Astro echoes a thrown message several times, once per page it was
 * rendering plus its own summary, so putting the list in the message repeats
 * the whole thing four times in the build log. The printed report appears
 * once; the message stays short and points at it.
 */
export class RecipeProblems extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    const heading =
      problems.length === 1
        ? "1 problem found in the recipes folder:"
        : `${problems.length} problems found in the recipes folder:`;

    const body = problems.map((problem) => `  ${problem}`).join("\n");

    // The full list is printed here, once, and deliberately kept OUT of the
    // Error message. Astro echoes a thrown message several times (once per
    // page it was rendering, plus its own summary), so putting the list in the
    // message would repeat the whole thing four times in the build log. The
    // message stays short; this print is the real report.
    console.error(
      `
${heading}

${body}

Nothing was built. Fix these and run the build again.
`,
    );

    super(
      `${heading.replace(/:$/, "")}. The full list is printed above; nothing was built.`,
    );
    this.name = "RecipeProblems";
    this.problems = problems;
  }
}

