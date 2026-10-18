# Recipe website build spec

You are building a personal recipe website for me, Andrew, using Astro with React components
for the interactive parts. It will be hosted on Vercel and deployed from a GitHub repo.

## Working agreement

- Work in phases. Finish one phase, show me what changed and how to check it, then stop and
  wait for my approval before starting the next one.
- Before you delete files, overwrite anything, install a dependency, or do anything that costs
  money, ask me first. Name the exact command and what it pulls in.
- Never put secrets or API keys in code. This site needs none, so if you think you need one,
  stop and tell me why.
- No database, no login, no admin page. If a feature seems to need one, you have misread the
  spec. Ask me.
- Keep it simple over clever. If something here is unclear or conflicts, state your assumption
  or ask me.
- Explain things in plain language. No em-dashes.

## The goal

A living collection of recipes I have cooked or written myself. I add a recipe by dropping a
.txt file into a recipes folder and pushing to GitHub, and Vercel rebuilds the site. Visitors
(family and friends, possibly the public) can only read, search, and filter.

The txt files are written by another AI agent, so they follow a strict format. The build must
fail with a clear error naming the file and the problem if a file breaks the format. A broken
file must never deploy a broken site.

## Tools you have, and when to use each

I have these installed globally. Use them at the phases named below, not all at once.

**`design-taste-frontend` skill.** Art direction. Use it in Phase 1 to set type, palette,
spacing, and composition before you build anything. Read the "Look and feel" section below
first, because I have already fixed some of those choices and they are not up for
redecoration. Take from the skill what it is genuinely best at: the exact type scale and
pairing, the palette values and how much of each to use, spacing rhythm, and its no-slop
checks. Do not let it impose a marketing-page hero structure on a recipe index, because a
recipe catalog is not a landing page. Its working files land in `.taste-skill/`, so add that
to `.gitignore` in Phase 1.

**`web-design-guidelines` skill.** Code review against the Web Interface Guidelines. Run it at
the end of Phases 3, 4, and 5 over the components you just wrote, and again in Phase 6 over
everything. It reads a pinned local rules file, so it needs no network.

**Accessibility Auditor agent.** Read-only (Read, Grep, Glob). Use it in Phase 6 for a full
pass. The map page especially needs it.

**Code Reviewer agent.** Read-only. Use it once in Phase 6, before deployment.

**Minimal Change Engineer agent.** Use it when I ask for a small fix after a phase is approved
and I do not want it turning into a refactor.

**Frontend Developer agent.** Optional. I would rather build the first pass with you directly
so I can steer, but use it for self-contained component work if that is faster.

Agents start with no knowledge of this conversation, so brief them properly when you use one.

## Look and feel

Warm and cozy, on the edge of clean and modern. Not girly, not frilly. These are fixed:

- Warm off-white background, charcoal text.
- One earthy accent color. Olive, deep green, or burnt orange. Show me the options from the
  taste skill and let me pick.
- A serif for headings, a clean sans for body.
- Generous spacing. Mobile first. It has to be readable on a phone, propped on a counter, with
  wet hands.
- Dark mode optional: include a toggle, default to light, remember the choice.

The site name is not decided. Keep it in one config file as a placeholder I can change.

**On photographs, and this one matters.** The taste skill will push for real photographs and it
is right in general, but this is a personal recipe site. Do not download stock photos of food.
A stock curry photo on a page claiming I cooked it is a lie, and it will read as fake. Use only
photos I supply. Recipes with no photo must look genuinely good, not like a broken card with a
gap. Design the no-photo card first and treat the photo as the enhancement.

## How my global UI rules apply here

My global CLAUDE.md has five UI standards. On a static site most of them land differently than
they would in an app, so read this before applying them literally.

- **Skeleton loaders.** Mostly not applicable. This is a prerendered Astro site, so recipe
  content, cards, and filtering are all present at first paint with nothing to wait for. Do not
  add skeletons to simulate loading. The two real exceptions are the map page, if its geography
  data loads as a separate chunk, and photos, which should reserve their space with explicit
  width and height so nothing jumps when they arrive.
- **Caching.** Vercel's CDN handles the static output. Set long cache headers with content
  hashing on photos and built assets. There is no login and no user data here at all, so the
  rule about never caching signed-in data in a shared cache has nothing to bite on. Say so
  rather than inventing a cache layer.
- **Optimistic rendering.** Not applicable. There are no server mutations anywhere in this
  site. Do not invent an API to be optimistic about. The spirit of the rule is that UI should
  feel instant, which here means checkboxes, the servings scaler, the unit toggle, and the
  filters all respond immediately in local state.
- **Tooltips and labels.** Fully applicable, and this is the one to be strict about. Every
  icon-only button (dark mode, cook mode, print, unit toggle, any filter chip rendered as an
  icon) needs both a visible tooltip on hover and focus, and an `aria-label`, which is the text
  a screen reader reads out. Neither replaces the other.
- **Professional polish.** Covered by the tools section above.

## Recipe file format (the source of truth)

Files live in `/recipes`, and the filename becomes the page URL. Each file starts with a header,
then a blank line, then the body:

```
Title: Chicken Tikka Masala
Cuisine: Indian
Regions: India
Meal: dinner
Healthy: no
Prep: 20
Cook: 30
Servings: 4
Photo: chicken-tikka-masala.jpg

Ingredients:
For the sauce:
1 1/2 cups tomato puree
2 tbsp butter
salt to taste

Instructions:
1. Heat the oven to 350°F.
2. ...

Notes:
Optional free text.
```

Rules:

- Cuisine is free text, and a new cuisine automatically becomes a new filter option.
- Regions is a comma-separated list of countries and/or grouped regions (for example Middle
  East, West Africa, East Asia). Fusion dishes can list more than one.
- Meal is one or more of: breakfast, lunch, dinner, snack, dessert.
- Healthy is yes or no. I decide this, the site does not calculate it.
- Prep and Cook are whole numbers of minutes. Servings is a whole number.
- Photo is optional. Photos live in `/recipes/photos`. Recipes without a photo must still look
  good.
- Ingredient lines are "amount unit item" on their own line. Amounts can be whole numbers,
  fractions, or decimals. Lines ending in a colon are group headings. Lines with no amount, like
  "salt to taste", display as written and never scale.
- Notes is optional.

### Format decisions I want you to pin down in Phase 2

These are gaps in my spec. Decide them, write them into the README, and tell me what you chose.

- **Filenames to URLs.** Define the slug rule exactly: lowercase, hyphens, no spaces, no
  characters that need escaping. Reject a filename that does not comply with a build error
  rather than silently mangling it. Two files that would produce the same slug is also an error.
- **Missing photos.** If a file names a photo that is not in `/recipes/photos`, that is a build
  error naming both the recipe file and the missing filename. Silently showing no photo hides my
  typo.
- **Unknown header fields and missing required ones.** Both are errors. List the required set
  explicitly.
- **Error reporting.** Collect and report every problem across all files in one pass, not just
  the first one found, and exit non-zero so Vercel does not deploy a broken build. Format each
  as `recipes/file.txt: problem` so it is scannable.
- **Region names.** See the map section. The canonical key is an ISO code, not a display name.

## Features

### Home page

A grid of recipe cards showing title, tags, times, and the photo if there is one. Visitors can
search by title or ingredient, filter by cuisine, filter by meal time, and use a healthy-only
toggle. Filters combine.

- Searching by ingredient means matching the item text, not the amount. Searching "tomato"
  should find "1 1/2 cups tomato puree". Substring matching is fine.
- Filtering must feel instant, and with a personal recipe collection it will be, because the
  whole dataset is already in the page. Do not add a search library like Fuse or an external
  search service. Plain filtering over an in-memory array is the right call until the collection
  passes a few hundred recipes. If it ever does, tell me then.
- Show the result count, and write a real empty state for when filters match nothing.
- Keep the active filters in the URL query string so I can share a filtered view and the back
  button works.

### Recipe page

Ingredient checkboxes, prep and cook time, a servings scaler, a print-friendly view, a cook
mode, and a US/metric toggle. Both the unit choice and the theme choice persist.

- **Servings scaler.** Rescales all amounts and handles fractions nicely: show `1 1/2 cups`, not
  `1.5 cups`. Lines with no amount never scale.
- **Units.** Convert volumes to ml or L and weights to g or kg. Convert Fahrenheit to Celsius in
  the instructions where you can detect it safely. Be conservative: `350°F`, `350 F`, and
  `350 degrees F` are detectable, a bare `350` is not, so leave it alone. Never guess.
- **Never convert between volume and weight.** No cups of flour to grams. Leave those lines in
  their original units and tell the reader quietly, once, not per line.
- **Print view.** A print stylesheet, not a separate page. Hide nav, filters, and controls. Show
  the full ingredients and instructions, and respect whatever servings and units are currently
  selected, since that is what I am about to cook.
- **Cook mode.** Large text and a screen that stays awake if the browser allows it. The Screen
  Wake Lock API needs HTTPS and is not supported everywhere, so it must degrade quietly. If the
  lock fails or is unavailable, do not show a control that claims the screen will stay on.
- **Persistence.** Theme and unit choice go in localStorage. Two things people get wrong here:
  reads and writes must be wrapped in try/catch, because localStorage throws in some private
  browsing modes, and the theme must be applied by a tiny inline script in the head before
  first paint, or the page flashes light before going dark.

### Map page

An interactive world map. Clicking a country or grouped region shows the recipes from that area.
Countries with recipes look different from those without. Use a free, no-API-key approach.

- **Keep a lookup file mapping grouped regions to their countries, and make ISO 3166-1 alpha-3
  codes the canonical key.** Display names live alongside the codes. This is the most likely
  place for this feature to break: my recipe files say "India" or "Middle East" in human words,
  while map data identifies countries by code or by its own spellings, and the two will not
  agree on things like "United States" versus "United States of America". Resolve my words to
  codes through the lookup file at build time, and make an unresolvable region a build error
  naming the recipe file and the unmatched text. I would much rather fix a typo than wonder why
  a recipe never shows on the map.
- **Propose the mapping approach in Phase 1** with two or three options, and for each tell me the
  bundle size it adds, whether it is actively maintained and compatible with the React version
  we are on, and whether its country identifiers match the lookup file scheme. Public domain
  TopoJSON world data plus a lightweight renderer is likely the right shape, but check the
  compatibility rather than assuming it.
- **Accessibility, which maps routinely fail.** Color alone cannot be the signal for which
  countries have recipes, so pair it with a count or a pattern. A click-only map is unusable by
  keyboard, so provide a plain list of regions with recipe counts next to or under the map, as a
  real navigable equivalent rather than a hidden fallback. It is also genuinely useful for
  everyone. Have the Accessibility Auditor agent review this page specifically in Phase 6.

## Technical decisions to propose in Phase 1

Propose, explain, and wait for my yes. Flag anything you are unsure about rather than picking
quietly.

- Folder structure, and where parsing code lives so it runs at build time.
- Which components need to be React islands with a `client:` directive, and which stay static
  Astro. Over-hydrating throws away the reason to use Astro. My expectation: one island for
  search and filters, one for the recipe page controls, one for the map, one small one for the
  theme toggle, and everything else static. Tell me if you disagree.
- How photos are processed. I want explicit width and height on every image so the layout never
  jumps, and modern formats if that is cheap to do.
- The mapping library, per the map section.
- Anything you want to add to `.gitignore`, including `.taste-skill/`.

## Phases

Stop for my review at the end of every phase. Tell me exactly what to check and how.

1. **Plan and scaffold.** Run the `design-taste-frontend` skill to settle type, palette, and
   spacing within the fixed choices above, and show me the accent color options. Propose the
   folder structure and libraries. Create the Astro project with React, the theme, the layout,
   and the placeholder site name in its config file. Stop.
2. **Recipe parsing.** The parser and validator, with the error behavior pinned down above.
   Create three sample recipes with obviously fake placeholder content, one with a photo and two
   without. Show me a deliberately broken file and the exact error it produces. Stop.
3. **Home page.** Cards, search, three filters, result count, empty state, URL query state. Run
   the `web-design-guidelines` skill over what you wrote and fix what it finds. Stop.
4. **Recipe page.** Checkboxes, scaler, unit toggle, print view, cook mode. Show me the test
   cases for the fraction and unit math, including the ones listed below. Run
   `web-design-guidelines` again. Stop.
5. **Map page and the region lookup file.** Include the keyboard-navigable region list. Run
   `web-design-guidelines`. Stop.
6. **Polish.** Dark mode toggle with no flash on load, then a full pass with the Accessibility
   Auditor agent and the `web-design-guidelines` skill, then the Code Reviewer agent. Mobile
   check at a real phone width. Page titles, meta descriptions, and basic SEO. Show me the
   findings and what you fixed. Stop.
7. **Deployment.** A README covering how to add a recipe, the exact file format including every
   rule and error above, and how to connect the GitHub repo to Vercel. Walk me through each
   step. Do not run deployment steps without asking.

## Test cases I want to see in Phase 4

Show these as actual passing tests or a visible table, not as claims.

- `1 1/2 cups` scaled from 4 servings to 6 is `2 1/4 cups`, displayed as a fraction.
- `1/3 cup` scaled to double is `2/3 cup`, and scaled by 1.5 is `1/2 cup`.
- `2 tbsp` in metric is about `30 ml`.
- `1 1/2 cups` in metric is about `355 ml`, rounded to something a cook would use.
- `350°F` becomes `175°C`, rounded to a real oven setting rather than `176.67`.
- `salt to taste` is unchanged at every scale and in both unit systems.
- A flour line in cups stays in cups in metric mode, with the quiet note shown once.
- A bare `350` in an instruction is left completely alone.
- Scaling to a servings count that produces an awkward amount still reads sensibly.

## When to stop and ask me

- Anything that would add a database, a login, an admin page, or an API.
- Any dependency you are not confident about, or any install command.
- Any need for a photo I have not given you.
- Any conflict between the fixed look and feel choices and what the taste skill deals you.
- Any point where the recipe format cannot express something a recipe needs.
