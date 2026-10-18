/* ---------------------------------------------------------------------------
   The sitemap, generated at build time from the recipes themselves.

   There is an official @astrojs/sitemap integration, and this is about twenty
   lines instead, with no extra dependency and no configuration to get wrong.
   For a site whose entire page list is "the home page, the map, and one page
   per recipe file", writing it out directly is simpler than wiring something
   up to do the same thing.
   --------------------------------------------------------------------------- */

import type { APIRoute } from "astro";

import { loadRecipes } from "../lib/load-recipes";
import { site } from "../config/site";

export const GET: APIRoute = () => {
  const recipes = loadRecipes();

  const paths = [
    "/",
    "/map",
    ...recipes.map((recipe) => `/recipes/${recipe.slug}`),
  ];

  const urls = paths
    .map((path) => {
      const absolute = new URL(path, site.url).href;
      // The home page is the entry point and the recipes are the content, so
      // they rank above the map in the site's own ordering.
      const priority = path === "/" ? "1.0" : path === "/map" ? "0.5" : "0.8";
      return `  <url>\n    <loc>${absolute}</loc>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
