/* ---------------------------------------------------------------------------
   The one config file.

   This is the file to edit. Nothing else in the site hard-codes any of it.
   --------------------------------------------------------------------------- */

export const site = {
  /* ---- PLACEHOLDER. Change this. ---------------------------------------
     Undecided on purpose. It shows in the header, in the browser tab, in the
     footer, and in the page titles. Keep it short: it is set at display size
     on the home page, and the type scale is tuned for roughly two or three
     words. */
  name: "Recipe Notebook",

  /* One line under the site name on the home page. Keep it to about 20 words.
     Set this to an empty string to leave it out entirely. */
  tagline: "Recipes I have actually cooked, written down so I do not forget them.",

  /* Used in the footer and in the page metadata. */
  author: "Andrew",

  /* The live URL. Everything absolute is built from this one value: the
     canonical tag on every page, the link previews, every entry in the
     sitemap and the Sitemap line in robots.txt. The trailing slash matters.

     If you ever put a custom domain in front of this, change it here and
     push, or all of the above will keep pointing at the vercel.app address. */
  url: "https://andrews-recipes.vercel.app/",

  /* Fallback description, used by any page that does not set its own.
     Recipe pages build theirs from the recipe itself. */
  description:
    "A personal collection of recipes, searchable by ingredient, cuisine, meal and region.",

  /* The main navigation. Order is the order shown. */
  nav: [
    { label: "Recipes", href: "/" },
    { label: "Map", href: "/map" },
  ],
} as const;

export type Site = typeof site;

/**
 * The placeholder URL, which must not survive to a real deploy.
 *
 * `url` feeds the canonical tag on every page, og:url, every entry in the
 * sitemap and the Sitemap line in robots.txt. Left as example.com, a canonical
 * tag tells search engines that the real version of each page lives somewhere
 * else, which is the single most effective way to keep a site out of the
 * index. So the build says so, loudly, every time.
 */
export const PLACEHOLDER_URL = "https://example.com/";

export function warnIfPlaceholderUrl(): void {
  if (site.url !== PLACEHOLDER_URL) return;

  console.warn(`
  The site URL is still the placeholder (${PLACEHOLDER_URL}).

  Canonical tags, link previews, the sitemap and robots.txt are all built
  from it, and a canonical tag pointing at example.com tells search engines
  that this site is a copy of somewhere else.

  Set \`url\` in src/config/site.ts to your Vercel address before you share
  the site.
`);
}
