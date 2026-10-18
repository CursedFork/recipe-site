/* ---------------------------------------------------------------------------
   Recipe photos.

   Your photos live in recipes/photos at the project root, outside src/, so
   that adding a recipe is just dropping two files into one place. Astro's
   image pipeline is built around images under src/, so this file is the bridge:
   it globs the folder at build time and hands each image's metadata to
   <Image />, which then emits explicit width and height (so the layout never
   jumps) and a modern format.

   In Phase 1 I said I would prove this works rather than promise it. It does.
   --------------------------------------------------------------------------- */

import type { ImageMetadata } from "astro";

/**
 * Every photo in recipes/photos, keyed by filename.
 *
 * `eager: true` means this resolves at build time, so there is no runtime
 * fetch. The default import of an image gives Astro's ImageMetadata, which is
 * the object with src, width, height and format that <Image /> needs.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../../recipes/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}",
  { eager: true },
);

const byFilename = new Map<string, ImageMetadata>(
  Object.entries(modules).map(([filePath, module]) => [
    filePath.split("/").pop()!,
    module.default,
  ]),
);

/**
 * Look up a photo by the filename written in a recipe's Photo: header.
 *
 * Returns undefined if it is missing, but that should never happen on a real
 * build: load-recipes.ts already fails the build for a photo that is not
 * there, so by the time a page renders, every named photo exists.
 */
export function getPhoto(filename: string): ImageMetadata | undefined {
  return byFilename.get(filename);
}

/** Filenames of every photo found. Used by the Phase 2 verification page. */
export function photoFilenames(): string[] {
  return [...byFilename.keys()].sort();
}
