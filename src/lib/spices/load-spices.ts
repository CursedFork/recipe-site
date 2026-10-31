/* ---------------------------------------------------------------------------
   Reads the real /spices and /blends folders.

   Everything that matters is in build-library.ts, which works on text so the
   tests can feed it broken files. This file is only the part that touches the
   disk, using import.meta.glob for the same reason load-recipes.ts does:
   Astro bundles modules before running them, so a path built from
   import.meta.url points inside dist/ rather than at the project.

   NOT WIRED INTO ANY PAGE YET. Phase 5 imports loadLibrary() from the library
   page. Until the spice files exist for everything the sample blends name, the
   real library reports problems, which is why nothing calls it during a build.

   Build time only.
   --------------------------------------------------------------------------- */

import { staples } from "../../config/pantry";
import { buildLibrary, type Library } from "./build-library";
import type { SourceFile } from "./types";

/** Every .txt file as raw text, resolved when the module is built. */
const spiceText = import.meta.glob<string>("../../../spices/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});

const blendText = import.meta.glob<string>("../../../blends/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});

/**
 * Everything in either folder, whatever its extension, only so a file that
 * does not belong can be named. The loader functions are never called, so
 * nothing is imported. The ?raw query is what stops Vite trying to parse an
 * unusual file as source before our own message gets a chance to print.
 */
const anythingInSpices = import.meta.glob("../../../spices/*", { query: "?raw", import: "default" });
const anythingInBlends = import.meta.glob("../../../blends/*", { query: "?raw", import: "default" });

/** "../../../spices/clove.txt" becomes "spices/clove.txt". */
function projectPath(globKey: string): string {
  const match = globKey.match(/(spices|blends)\/[^/]+$/);
  return match ? match[0] : globKey;
}

function sourceFiles(modules: Record<string, string>): SourceFile[] {
  return Object.entries(modules).map(([key, text]) => ({ path: projectPath(key), text }));
}

function strayPaths(): string[] {
  return [...Object.keys(anythingInSpices), ...Object.keys(anythingInBlends)]
    .map(projectPath)
    .filter((path) => {
      const base = path.split("/").pop() ?? path;
      return !base.endsWith(".txt") && !base.startsWith(".");
    })
    .sort();
}

/**
 * Check the real folders and return everything found, without throwing.
 * Used by the tests, and by anything that wants the report without failing.
 */
export function readLibrary(): Library {
  return buildLibrary({
    files: [...sourceFiles(spiceText), ...sourceFiles(blendText)],
    strayPaths: strayPaths(),
    staples,
  });
}

let cache: Library | null = null;
let failure: LibraryProblems | null = null;

/**
 * The checked library. Remembered, so the validation runs once per build, and
 * so a failure is reported once rather than once per page that asks.
 *
 * Throws if anything is wrong, which is what stops a broken library deploying.
 */
export function loadLibrary(): Library {
  if (failure !== null) throw failure;
  if (cache !== null) return cache;

  const library = readLibrary();

  if (library.problems.length > 0) {
    failure = new LibraryProblems(library.problems);
    throw failure;
  }

  cache = library;
  return library;
}

/**
 * Carries the list of problems.
 *
 * The full list is printed once here and kept out of the Error message, for the
 * same reason as RecipeProblems: Astro echoes a thrown message several times,
 * so a long message would repeat the whole list in the build log.
 */
export class LibraryProblems extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    const heading =
      problems.length === 1
        ? "1 problem found in the spices and blends folders:"
        : `${problems.length} problems found in the spices and blends folders:`;

    const body = problems.map((problem) => `  ${problem}`).join("\n");

    console.error(`\n${heading}\n\n${body}\n\nNothing was built. Fix these and run the build again.\n`);

    super(`${heading.replace(/:$/, "")}. The full list is printed above; nothing was built.`);
    this.name = "LibraryProblems";
    this.problems = problems;
  }
}
