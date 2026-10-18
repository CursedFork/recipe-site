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

  /* The live URL, which Vercel will give you in Phase 7. Astro needs it to
     build absolute URLs for the sitemap and the social metadata. The trailing
     slash is deliberate. Leave the placeholder until the domain exists. */
  url: "https://example.com/",

  /* Fallback description for pages that do not set their own. Recipe pages
     will build their own from the recipe itself in Phase 6. */
  description:
    "A personal collection of recipes, searchable by ingredient, cuisine, meal and region.",

  /* The main navigation. Order is the order shown. The map arrives in Phase 5
     and the link is here already so the header does not change shape later. */
  nav: [
    { label: "Recipes", href: "/" },
    { label: "Map", href: "/map" },
  ],
} as const;

export type Site = typeof site;
