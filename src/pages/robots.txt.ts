/* ---------------------------------------------------------------------------
   robots.txt.

   Generated rather than dropped in public/, so the sitemap line uses the real
   site URL from src/config/site.ts instead of a second copy of it that would
   quietly go stale when the domain changes.
   --------------------------------------------------------------------------- */

import type { APIRoute } from "astro";

import { site } from "../config/site";

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL("/sitemap.xml", site.url).href}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
