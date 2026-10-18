// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

// The site URL lives in src/config/site.ts with everything else you edit, so
// there is one place to change when Vercel gives you a real domain. This file
// is .ts rather than .mjs purely so it can read that one value.
import { site } from "./src/config/site";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // Everything is prerendered to static HTML at build time. There is no server
  // at runtime, no database and no API, which is what makes this deployable as
  // plain files on Vercel's CDN.
  output: "static",

  // Astro needs this to build absolute URLs for canonical tags, the sitemap
  // and link previews. Change `url` in src/config/site.ts, not here.
  site: site.url,
});
