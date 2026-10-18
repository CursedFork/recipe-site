// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // Everything is prerendered to static HTML at build time. There is no server
  // at runtime, no database and no API, which is what makes this deployable as
  // plain files on Vercel's CDN.
  output: "static",

  // Phase 6 sets `site` here, to the live URL from src/config/site.ts, once
  // Vercel has given us a real domain. Astro needs it to build absolute URLs
  // for canonical tags and the sitemap, so it is pointless to guess now.
});
