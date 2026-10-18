# Phase 1 decisions

Everything here is a proposal until you say yes. Open questions are marked **OPEN**.

---

## 1. Design: type, palette, spacing

I ran the `design-taste-frontend` skill (direction `one-motif`, seed 529845303, sector
restaurant, tone warm). I used it for what your spec scoped it to: the type scale, the palette
values and proportions, the spacing rhythm, and its no-slop checks. I did not take its page
composition, because a recipe index is not a landing page.

### Where the skill conflicts with your fixed choices

Your spec said to flag these rather than quietly picking. There are five, and your choices win
every time.

| # | The skill dealt | Your fixed choice | What I did |
|---|---|---|---|
| 1 | **Switzer**, one neo-grotesk for everything, no serif anywhere | A serif for headings, a clean sans for body | Rejected the face. Kept the skill's *settings*: five size steps, its fluid `clamp()` values, its tracking and leading laws, body text never below 16px. |
| 2 | **"Teal on paper"**: cool white `#f7f9f8`, teal ink `#06525c`, no black on the page | Warm off-white, charcoal text, one earthy accent | Rejected the hues. Kept the skill's *proportions*: one ground, one ink, one accent spent only on actions, surfaces separated by a step in tone rather than a line or a shadow. Then took the actual earthy values from the skill's own researched earth palettes (`moss-sand`, `olive-on-bone`, `green-mat-chocolate`). |
| 3 | An **imagery floor**: at least four real photographs per page, six to twelve preferred, and it dealt eight stock food photos from picsum.photos | No stock photos, ever. Only photos you supply | Rejected outright. **Consequence worth knowing:** the skill's `inspect.mjs` gate will permanently fail this site on its image count. That one check is not usable here. I will still run the rest of it and report what it says. |
| 4 | A hero of **stacked tabbed folders** on a dark ground with 96 to 160px condensed capitals | A recipe catalog, not a marketing page | Rejected. Your spec and the skill's own notes both say not to impose a landing-page hero on a recipe index. |
| 5 | A **motion floor**: its inspector fails any page with fewer than eight moving elements | Readable on a phone, propped on a counter, with wet hands | Rejected the floor. A recipe you are cooking from should not animate. Keeping only hover, focus and press feedback, all behind `prefers-reduced-motion`. |

### Type

Two faces, which is the skill's limit.

- **Headings: Source Serif 4** (variable). A warm transitional serif. I picked a serif that is
  also a genuine *text* serif, because most "headings" on this site are recipe titles at around
  20px on a card, not 60px. A display-only serif tuned for huge sizes looks cramped at 20px.
- **Body: Hanken Grotesk** (variable). A plain, open humanist sans with a large x-height, which
  is what you want for reading an ingredient list at arm's length.

Not frilly, no hairline strokes, no didone. Both are variable fonts, so each is one small file.

Five size steps, which is the skill's ceiling. Body sits at 17 to 19px, above the 16px floor,
because of the counter-and-wet-hands test.

```css
--text-xs:      clamp(0.8125rem, 0.79rem + 0.1vw,  0.875rem);  /* 13-14px  meta, times, counts */
--text-base:    clamp(1.0625rem, 1rem    + 0.25vw, 1.1875rem); /* 17-19px  body, ingredients, steps */
--text-lead:    clamp(1.25rem,   1.15rem + 0.5vw,  1.5rem);    /* 20-24px  card titles */
--text-head:    clamp(1.75rem,   1.4rem  + 1.6vw,  2.5rem);    /* 28-40px  recipe title, section heads */
--text-display: clamp(2.5rem,    1.9rem  + 3vw,    4rem);      /* 40-64px  site name, home only */
```

Settings, from the skill's laws for these faces:

| Role | Face | Weight | Tracking | Leading |
|---|---|---|---|---|
| display | Source Serif 4 | 600 | -0.02em | 1.05 |
| head | Source Serif 4 | 600 | -0.015em | 1.1 |
| lead (card titles) | Source Serif 4 | 600 | -0.01em | 1.2 |
| body | Hanken Grotesk | 400 | 0 | 1.6 |
| small | Hanken Grotesk | 500 | 0 | 1.4 |

Prose measure caps at 68 characters. Text is left-aligned throughout; nothing is centred.

### Palette

Ground, ink and surfaces are settled. Every value below clears WCAG AA for small text, which I
computed rather than guessed.

```css
--bg:       #F7F3EC;  /* warm off-white  */
--surface:  #EFE9DE;  /* one tone step up, for cards. Not a border, not a shadow */
--ink:      #262321;  /* warm charcoal, not pure black. 14.1:1 on the ground */
--muted:    #5F5852;  /* secondary notes only.          6.3:1 on the ground  */
```

Dark mode, same structure:

```css
--bg:       #1C1A18;
--surface:  #262320;
--ink:      #EDE7DD;  /* 14.1:1 */
--muted:    #A39B91;  /*  6.3:1 */
```

### **OPEN:** the accent colour, your pick

One earthy accent, spent on links, the active filter, and buttons. Nothing else. Each has a
lighter tint for dark mode, since the full-strength version is unreadable on a dark ground.

| Option | Light mode | Dark tint | As link text | White on the fill | Feel |
|---|---|---|---|---|---|
| **Olive** | `#4F6238` | `#A7BE8E` | 6.05:1 | 6.70:1 | Dustiest and most muted of the three. Reads kitchen-garden. Sourced from the skill's `moss-sand`. |
| **Deep green** | `#1F4A33` | `#8FC9A8` | 9.10:1 | 10.07:1 | Darkest and most sober. Closest to "clean and modern". Highest contrast of the three. |
| **Burnt orange** | `#A8431A` | `#E89469` | 5.45:1 | 6.03:1 | The only warm one, so it is the only one that reads as *food*. Also the loudest, so it needs the most discipline about where it appears. |

All three pass AA for small text, so this is purely your taste. If you want my opinion: **olive**
sits most comfortably against a warm off-white, because the ground is already warm and burnt
orange competes with it rather than sitting on it. Deep green is the safe pick. Burnt orange is
the one with the most personality and the most risk.

### Spacing

A 4px base scale:

```css
--space-1: 0.25rem;  /*  4px */   --space-6:  2rem;   /*  32px */
--space-2: 0.5rem;   /*  8px */   --space-7:  3rem;   /*  48px */
--space-3: 0.75rem;  /* 12px */   --space-8:  4rem;   /*  64px */
--space-4: 1rem;     /* 16px */   --space-9:  6rem;   /*  96px */
--space-5: 1.5rem;   /* 24px */   --space-10: 8rem;   /* 128px */
```

- One pair of page margins everywhere: 20px on a phone, 32px from tablet up.
- Content caps at 1200px for the grid, 68 characters for prose.
- **Section gap: 96px desktop, 56px phone.** This is a deliberate deviation. The skill says 120
  to 220px, which is right for a marketing page with four sections. On a recipe index the filter
  bar sits directly above the card grid, and 120px of air between them would read as a mistake.
  What the law actually requires is that the gap between sections is clearly larger than any gap
  inside one, and 96px against a 32px internal gap satisfies that comfortably.
- **Every control is at least 44 by 44px.** This is the wet-hands rule made concrete, and it
  drives the size of the checkboxes, the filter chips and the servings stepper.

### No-slop rules I am holding us to

From the skill, and they are the part of it I agree with most. No gradients. No shadows on
anything at rest, only on things that genuinely float. No thin rules or hairline dividers;
separation comes from space and from the tone step between `--bg` and `--surface`. No tiny
uppercase letter-spaced labels. No monospace outside real code. No small label above a heading.
No rows of identical icon-topped cards. One button shape, decided once. No emoji.

---

## 2. Folder structure

```
recipe-site/
  recipes/                        <- YOUR content. Drop .txt files here and push.
    photos/                       <- YOUR photos, named by the Photo: header
  src/
    config/
      site.ts                     <- the one config file. Site name lives here.
    lib/                          <- build-time only. Never shipped to the browser.
      parse-recipe.ts             <- one file's text -> a recipe object, or a list of problems
      load-recipes.ts             <- reads the folder, parses all, collects EVERY error, throws
      slug.ts                     <- filename -> URL slug, and the rule that rejects bad ones
      regions.ts                  <- your region words -> ISO alpha-3, via the lookup
      units.ts                    <- fraction and unit maths (Phase 4). Pure functions.
    data/
      regions.ts                  <- the region lookup file. Alpha-3 is the key.
      iso-numeric-to-alpha3.ts    <- bridges the map data's numeric ids to alpha-3
    components/                   <- .astro, static, no JavaScript shipped
    islands/                      <- .tsx, React, the only things that ship JavaScript
    layouts/
      BaseLayout.astro
    pages/
      index.astro
      recipes/[slug].astro
      map.astro
    styles/
      tokens.css                  <- everything in section 1 above
      global.css
      print.css
  astro.config.mjs
```

**Where parsing runs.** Everything in `src/lib` is imported from page frontmatter, so it runs
inside `astro build` and never reaches the browser.

I considered Astro's Content Collections with a Zod schema, which is the more "official" route,
and I am recommending against it. Your spec asks for something specific: collect every problem
across every file in one pass, format each as `recipes/file.txt: problem`, and exit non-zero.
A plain module gives me exact control over that output. Zod and Astro would wrap my messages in
their own formatting and report per-file as it goes. Content Collections also buy caching and
typing, and at your scale the caching is irrelevant and I get the typing from TypeScript anyway.

`load-recipes.ts` will validate everything once, memoise, print the full problem list to stderr
so it is never truncated in Vercel's build log, and then throw.

## 3. Libraries

Deliberately short.

- `astro`
- `@astrojs/react`, `react`, `react-dom`
- `@fontsource-variable/source-serif-4`, `@fontsource-variable/hanken-grotesk` (**OPEN**, see below)
- Later, and I will ask first: `vitest` in Phase 4 for the fraction and unit tests you want to
  see actually passing, and `@astrojs/sitemap` in Phase 6.

**No Tailwind.** You use it on Teacher's Pet so this is worth explaining. This site has maybe ten
components and a design system that is thirty lines of custom properties. Astro's scoped styles
plus those tokens is less machinery than a Tailwind install and config, and hand-written CSS makes
the no-slop rules above easier to see and keep. Say the word if you would rather have it and I
will add it instead, it is not a strong objection.

**No search library.** Your spec rules out Fuse and I agree. Plain `.filter()` over an array
that is already in the page.

### **OPEN:** how the fonts get onto the page

| Option | Install | What it costs |
|---|---|---|
| **Self-host (recommended)** | `npm i @fontsource-variable/source-serif-4 @fontsource-variable/hanken-grotesk` | Two packages, fonts served from your own domain. No third-party request, nothing for you to allow, no layout shift from a slow CDN, and it keeps working if Google Fonts is blocked on a school network. |
| Google Fonts CDN | none | Two `<link>` tags to `fonts.googleapis.com`. No install, but it is a request to an outside site on every visit, which your rules say to ask about. |
| System fonts only | none | Zero install, zero network. But `ui-serif` resolves to a different face on Windows, macOS and Android, so the site would look materially different per device. |

I recommend self-hosting. On a school network especially.

## 4. React islands

Your expectation was one island each for search and filters, the recipe page controls, the map,
and the theme toggle, with everything else static. **I agree, with one change and one
clarification.**

| Island | Directive | Why it needs to be one |
|---|---|---|
| `RecipeBrowser` | `client:load` | Search, the three filters, the result count, the empty state, **and the card grid** |
| `RecipeControls` | `client:load` | Servings scaler, unit toggle, ingredient checkboxes, cook mode, print button, and the ingredient and instruction text they all rewrite |
| `WorldMap` | `client:load` | Hover, selection, and the region list's active state |
| `ThemeToggle` | `client:load` | The button only |

Everything else is static Astro: the layout, the nav, the footer, the recipe page's title, times,
photo and notes, the map page's region list markup, and every page's head.

**The change: the card grid belongs inside the filter island, not outside it.** Your version has
the controls as an island and the cards static. The problem is that a React island cannot cleanly
hide and show DOM nodes it does not own, so filtering would mean reaching out and toggling
attributes on Astro-rendered elements, and the empty state gets awkward.

The reason this costs nothing is a detail of how Astro works that is worth knowing: **Astro
server-renders your React islands to real HTML at build time** and then hydrates them in place.
`client:load` does not mean "render in the browser". So the cards are in the static HTML exactly
as they would be from an Astro component. They are indexable, they paint instantly, and nothing
waits on JavaScript. Hydration only makes the filtering interactive. We get clean React state and
lose nothing, which is why I would rather expand this island than work around it.

If I had got that wrong and the cards only appeared after hydration, it would have forced exactly
the fake skeleton loaders your spec tells me not to add. Worth saying out loud, because that is
the trap.

**I verified this rather than trusting it.** The theme toggle is a React island with
`client:load`, and after building, `dist/index.html` contains the fully rendered button, its
`aria-label` and its tooltip text, all in the static HTML:

```html
<button type="button" class="icon-button theme-toggle"
        aria-label="Switch to dark mode" data-tooltip="Switch to dark mode">
```

So the card grid living inside the filter island costs nothing in first paint or indexability.

**The clarification: the theme toggle island is not what prevents the dark mode flash.** The
toggle is just a button. What stops the flash is a tiny inline script in `<head>` that reads
localStorage and sets an attribute on `<html>` before the browser paints anything. That script is
not React and not an island, it is five lines in the layout. Both get built in Phase 6, but the
inline script is the part that matters and I did not want it to look like the island's job.

**Hydration budget, measured from the real build rather than estimated.** I guessed roughly 45KB
for React before building and that was too low. The actual figures:

| | Gzipped |
|---|---|
| React and React DOM, plus Astro's island runtime | **67.2KB** |
| The `ThemeToggle` island itself | **0.8KB** |
| All the CSS, including every `@font-face` rule | **4.7KB** |
| Fonts a typical visitor downloads (the two latin subsets) | about **84KB** |

So React is a flat 67KB floor the moment any island exists, and each additional island after that
is nearly free. That is the real argument for keeping the island count to four: the cost is in
having React at all, not in how many components use it. It is worth paying for the recipe page
controls, which genuinely need shared state across five interacting pieces. It would not be worth
paying for a theme toggle on its own.

Three islands on the recipe page, two on the home page, two on the map page.

## 5. Photos

`<Image />` from `astro:assets`, which is built into Astro and needs no extra install. It emits
explicit `width` and `height` on every image, so the layout never jumps, and it produces WebP
automatically, which covers your "modern formats if it is cheap" ask at no cost.

One thing I want to verify rather than promise. Your spec puts photos in `/recipes/photos`, at
the project root, outside `src/`. `astro:assets` is designed around images under `src/`. I believe
importing them with `import.meta.glob('../../recipes/photos/*')` works and hands `<Image />` the
metadata it needs, because the folder is still inside the project root. **I will prove it in
Phase 2 with a real file rather than assume it.** If it does not work, the fallback is to move the
folder to `src/recipes/photos`, which changes one line of your workflow and nothing else. I will
tell you either way.

The no-photo card is the design, per your spec, and the photo is the enhancement. I am designing
that card first in Phase 3.

## 6. The map, for Phase 5

I checked these rather than assuming, because your spec told me to. One correction up front: my
first search turned up claims that `react-simple-maps` is stuck on React 18 and that you need a
third-party fork. **That is out of date.** Upstream is at 5.0.5, published 2026-09-12, and its
peer range explicitly includes `19.x`. No fork needed.

I also downloaded `world-atlas@2.0.2/countries-110m.json` to a scratch folder, outside the
project, purely to inspect it. The findings matter:

- It has **177 countries** and weighs 107KB raw, **39KB gzipped**.
- Its ids are **ISO 3166-1 numeric**, not alpha-3. USA is `840`, India `356`, France `250`.
- The only property on each country is `name`, and the spellings are its own: **"United States
  of America"**, **"Côte d'Ivoire"**, **"W. Sahara"**. This is exactly the mismatch your spec
  predicted. If you write "United States" or "Ivory Coast", nothing will match.
- **Three entries have no id at all:** N. Cyprus, Somaliland and Kosovo, because they have no
  assigned ISO numeric code. Any approach has to decide what to do with them.

So whichever option we pick, a numeric-to-alpha-3 bridge is required. That is a fixed 250-row
table, and I would commit it as data rather than add a dependency for it.

### The options

| | **A. Project at build time** (recommended) | **B. react-simple-maps** | **C. A prebuilt SVG** |
|---|---|---|---|
| What it is | `d3-geo` and `topojson-client` as **dev** dependencies. The build turns the TopoJSON into SVG path strings. The page ships plain `<svg>`. | The React component library does the projection in the browser. | A third-party world SVG, committed, where each path already has a country id. |
| Library JS shipped | **0KB** | **32.3KB** min+gzip, plus React | **0KB** |
| Other payload | The projected paths inline, roughly 25 to 35KB gzipped. Mostly repetitive digits, so they compress very well. | The 39KB geo data, fetched or inlined | The SVG file |
| Maintained | `d3-geo` 3.1.1, Mar 2024. `topojson-client` 3.1.0, 2019, but it is small and feature-complete. Both ISC. | **Yes, actively.** 5.0.5, Sep 2026. MIT. | Depends entirely on the source |
| React version | **Irrelevant.** Neither library touches React. | Fine, `19.x` is in the peer range | Irrelevant |
| Country ids vs your alpha-3 key | **We control the pipeline, so the SVG carries alpha-3 directly.** Exact fit. | Hands you `geo.id`, which is numeric. Bridge still needed, just at runtime. | Varies by source. Often alpha-2, sometimes alpha-3. Needs checking. |
| Keyboard and screen readers | **Easiest.** We own every element, so each country can be a real link or button with an `aria-label` and its recipe count. | Hardest. `<Geography>` gives you a `<path>` with an `onClick`. You add `tabIndex`, `role` and key handling yourself, against its prop pass-through. | We own the markup, so similar to A |
| Pan and zoom | Not unless I build it | **Included** | Not unless I build it |
| The catch | I write the projection step, roughly 60 lines | 32KB for something A does for nothing, and the accessibility work your spec is most worried about is harder | I would be inheriting someone else's projection, simplification and ids, and I would need your permission to download it and then verify its licence. Least control, no real saving. |

**I recommend A.** It ships no library JavaScript, it gives alpha-3 ids natively because we build
them, and it makes the keyboard-navigable region list your spec asks for genuinely easy instead of
a fight. **B** is a sound fallback and the right answer if you decide you want pan and zoom. **C**
I would avoid.

Nothing gets built now. One thing for later: Option A or B means committing that 107KB public
domain Natural Earth file into the repo, which is a download from an outside site, so **I will ask
you in Phase 5 before adding it.** The copy I inspected lives in a scratch folder and is not in
the project.

## 7. .gitignore

```
node_modules/
dist/
.astro/
.vercel/
.taste-skill/      # the design skill's working files, per your spec
.env
.env.*
!.env.example
.DS_Store
Thumbs.db
*.log
npm-debug.log*
coverage/          # Phase 4, when the unit tests arrive
```

No secrets anywhere in this project, and nothing in it needs any. The `.env` lines are belt and
braces so a stray file can never be committed.

---

## 8. What the skill's own gate says about what I built

I ran both halves of it and I am reporting everything, including what it does not like.

**`lint.mjs` over `src`: clean.** 0 FAIL, 0 WARN, 8 files.

**`inspect.mjs` in a real browser at 1440, 768 and 390px.** First, what it measured, which
confirms the design is actually wired up rather than just written down:

```
typefaces    Hanken Grotesk Variable 90%, Source Serif 4 Variable 9%
sizes        14 / 19 / 24 / 40 / 64 px     body 19px / 1.6
colour       page #f7f3ec  ·  button #4f6238
headline     64px, Source Serif 4 Variable 600, tracking -0.02em, leading 1.05
```

Those are exactly the five type steps, the leading, the ground and the olive from section 1.

**One note on running it.** Pointed at `dist/index.html` the inspector reports nonsense: Times New
Roman, a white page, 16px body. That is because it serves the file from the project root, so the
absolute `/_astro/...` stylesheet path resolves to nothing and it measures an unstyled page. Run
it against the dev server instead:

```bash
node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:4321
```

### What it flags, and what I did about each

| Finding | Verdict |
|---|---|
| `grey-body`: running text set in the muted ink | **Genuine. Fixed.** I had used `--muted` for explanatory paragraphs. The skill is right that a page set in soft grey reads unfinished. **Rule going forward: `--muted` is for secondary notes only, never for text someone actually reads.** |
| `eyebrow`: captions sitting above headings | **Genuine. Fixed at desktop and tablet.** The type specimen labelled each sample above it, which is exactly the banned eyebrow label. Captions now sit under their samples. |
| `eyebrow` at 390px only | **Artifact, left alone.** At phone width one section's trailing caption ends up adjacent to the next section's heading, and the detector cannot tell which one it belongs to. It exists only on the temporary specimen page and disappears in Phase 3. |
| `few-pictures`: 0 pictures, wants 4 to 12 | **Expected and permanent**, conflict 3. Your no-stock-photos rule. This check can never pass on this site and should be ignored, not designed around. |
| `no-footage`: no video | **Expected**, same family as the above. |
| `still-page`: 0 elements moved | **Expected**, conflict 5. The motion floor is for marketing pages. This one holds still on purpose. |
| `focal-point`: largest type is 4.4vw, wants about 8.4vw | **Expected**, conflict 4. That figure comes from landing-page heroes. Also the current page is a specimen with no hero at all. Worth revisiting in Phase 3 for the real home page, where the site name genuinely can be the dominant thing. |
| `first-action`: no button in the first screen | **Expected now, resolved in Phase 3.** The first action on a recipe index is the search field, which does not exist yet. |

### **OPEN:** one real tension worth your decision

`palette-cream` warns that `#F7F3EC` is a "yellow-cream background" and suggests "a low-chroma
stone or bone, not a yellow cream". I looked up the actual rule rather than guessing at it. A
colour is classed as cream when its hue is between 22 and 62 degrees, its saturation is at least
0.16, and its lightness is at least 0.88. Ours is hue 38, saturation 0.41, lightness 0.95, so it
matches.

**The important part: this is only a warning, not a failure.** The failure case is cream *plus
terracotta*, which is the combination the skill calls an assistant brand palette. Our accent is
olive at hue 87, nowhere near terracotta, so the actual trap is avoided.

Still, it is a genuine disagreement with your fixed "warm off-white", so you should decide it
rather than me:

- **Keep `#F7F3EC`.** A bright, clean, warm off-white. The warning stands, and I think it is
  defensible, because the thing the rule is really guarding against is the cream-and-rust pairing.
- **Or go a shade deeper to a bone, around `#E5E1D8`.** That drops the lightness below 0.88 and
  clears the rule outright. It is the ground from the skill's own researched `green-mat-chocolate`
  palette, it is still unmistakably a warm off-white, and contrast with the charcoal ink stays
  around 12.5:1. It reads as more pigmented and a little more like paper, less like a bright screen.

My own view is weak either way. If the site is mostly read in a bright kitchen, the deeper bone is
easier on the eye; if you want it to feel crisp and modern, keep what is there.

---

## 9. Phase 3: the home page

### What the Web Interface Guidelines review found

I ran the `web-design-guidelines` skill over the island, the card, the stylesheet and the layout.
Its pinned rules file checksummed clean against the value recorded in the skill, so the rules were
intact. Seven findings, all fixed:

| Finding | Fix |
|---|---|
| Card titles were `h3` directly under the page `h1`, skipping a level | Card titles are now `h2`. The outline is `h1` then `h2` per recipe, and the empty state's heading is the same level either way. |
| No `meta theme-color`, so a phone's address bar stayed white over a dark page | Added. It cannot be done with media-query meta tags here, because the theme follows your stored choice rather than the OS setting, so the inline head script sets it and the toggle updates it. |
| Search input had no `name` | Added. |
| Placeholder did not end with an ellipsis | Now `tomato, chicken, lemon…` |
| No `touch-action: manipulation` on tap targets | Added. Without it, tapping a filter on a phone waits about 300ms for a possible double-tap-to-zoom before anything happens. That is squarely the wet-hands case. |
| Default blue tap-flash on a warm palette | Replaced with a wash of the accent, rather than switched off: some feedback on tap is the point. |
| Headings could leave an orphaned last word | `text-wrap: balance` on headings and card titles. |

### Two things the review raises that are worth knowing, not fixing yet

- **Virtualisation.** The guidelines say lists over 50 items should be virtualised. You have 3.
  Your spec says to tell you if the collection ever gets big enough to matter, so: the point to
  reconsider is somewhere past a few hundred recipes, and it would be the card grid, not the
  search.
- **Font preloading.** Critical fonts should be preloaded. Fontsource already sets
  `font-display: swap`, so there is no invisible-text period, but an explicit `<link rel="preload">`
  would still help the first paint. It needs the hashed build filenames, so I would rather do it
  properly in the Phase 6 performance pass than hardcode something brittle now.

### The taste inspector, re-run on the real home page

Three of the Phase 1 findings are gone now that the temporary preview page is deleted: `eyebrow`,
`grey-body` and `first-action`. What it measures now is exactly the design from section 1:

```
typefaces  Hanken Grotesk Variable 81%, Source Serif 4 Variable 19%
sizes      14 / 19 / 24 / 40 / 64 px        (five steps, which is the ceiling)
colour     page #f7f3ec · accent #4f6238
headline   64px, Source Serif 4 Variable 600, tracking -0.02em, leading 1.05
```

What remains is only the known conflicts: `few-pictures` and `no-footage` (your no-stock-photos
rule), `still-page` (the motion floor, rejected), and `focal-point` (it wants the largest type at
about 8.4vw, which is 121px for "Recipe Notebook" at desktop width; that figure comes from
marketing heroes and a recipe index is not one). Plus `palette-cream`, which is still the open
question in section 8 and still waiting on you.

### How the URL carries the filters

`/?q=tomato&cuisine=Indian,Thai&meal=dinner&healthy=1`. Empty values are left out, so an unfiltered
home page is a clean `/`.

**On the back button.** Toggling a filter pushes a history entry, so Back undoes that one filter.
Typing in the search box replaces instead, and only after a 250ms pause, because pushing an entry
per keystroke would mean pressing Back forty times to escape one word. Filtering itself is instant
and not debounced; only the URL write waits.

Reading the URL is deliberately forgiving, because that text may have been hand-edited or
truncated. `?cuisine=indian` lights up the "Indian" chip, and a value that matches nothing in the
collection is dropped rather than left as an active filter that matches nothing and looks broken.

**One honest limitation.** The page is prerendered, so the server has no idea what query string a
visitor arrived with. It renders the unfiltered grid and the island applies the URL on mount. On a
shared filtered link there is therefore a single frame where all recipes are present before the
filter applies. The alternative is a hydration mismatch or duplicating the filter logic in an
inline script, and neither is worth it for one frame.

---

## 10. Phase 4: the recipe page

### The maths, and the three rules it holds to

All of it is pure functions in `src/lib/units.ts`, with no DOM and no state, so the page and the
tests run exactly the same code. `npm test` runs 40 assertions.

1. **A line with no amount never scales and never converts.** "salt to taste" is advice, not a
   measurement.
2. **Volume is never converted to weight.** A cup of flour is not 125 g except for one particular
   flour packed one particular way, and getting it wrong ruins a bake. Those lines keep their
   original units and the reader is told once, under the list, rather than on every line.
3. **A temperature converts only when the Fahrenheit is explicit.** `350°F`, `350 F` and
   `350 degrees F` are safe to read. A bare `350` could be anything, so it is left completely alone.

### Two judgement calls worth your eye

**Which ingredients stay in cups.** Rule 2 needs to know which things a metric cook weighs rather
than scoops, and there is no way to derive that: it is a list. It lives at the top of `units.ts`
as `WEIGHED_NOT_SCOOPED` and currently covers flour, sugar, rice, oats, nuts, chocolate, cheese,
butter and friends. Adding to it only ever makes the site more cautious, so add freely. If you
write a recipe where something is wrongly converted, that list is the one place to fix it.

**Fractions are snapped to halves, thirds, quarters and eighths.** Those are the measures you
actually own. It means an awkward scale lands on the nearest one you can measure rather than
printing `0.42 cup`: scaling `1/3 cup` by 1.25 gives `3/8 cup`. The trade is that such a line is
rounded by a few percent. For everything that lands cleanly, and that is most of it, the answer is
exact.

### What I did not do, and why

- **Servings and units are not in the URL.** Your spec puts the unit choice in localStorage, which
  it does, and asks for URL state on the home page filters only. So a recipe link always opens at
  the servings it was written for. Say the word if you would rather share "this recipe, doubled".
- **Scaling a countable item can give you half of one.** Six servings of a four-serving recipe
  turns `3 eggs` into `4 1/2 eggs`. That is arithmetically right and there is no honest way to
  round it, since whether you can use half an egg depends on the recipe. It is left as it is.

### The Web Interface Guidelines review

Two findings, both fixed:

| Finding | Fix |
|---|---|
| Two live regions announced the same action, so changing servings was read out twice | The servings `<output>` is now the only live region. The "Scaled from 4 to 6" line is ordinary visible text. |
| Ingredient text had no `overflow-wrap`, so a long unbroken word could push out of its column | Added, with `min-width: 0` on the flex children that needed it before they would wrap. |

**One conflict I did not act on.** The guidelines ask for Title Case on headings and buttons,
Chicago style. The `design-taste-frontend` house rules call for sentence case and treat shouty
labels as a tell, and your fixed look is warm rather than corporate. Sentence case wins: "Cook
mode", not "Cook Mode". Flagging it because the two tools genuinely disagree and I picked a side.

### Cook mode and the screen

Cook mode always works: it makes the text larger and gives the rows more room. The screen wake
lock is requested separately, and the page only says the screen will stay awake once the lock has
actually been granted. If the browser has no Wake Lock API, or refuses because the page is not on
HTTPS, or drops the lock on low battery, the note changes to say the screen may still dim. There
is never a control claiming something that is not happening.

The lock is re-requested when you come back to the tab, because browsers release it while you are
away, and it is always released when you leave the page.

### Print

A stylesheet, not a separate route. That matters for one reason: the page you print is the page
you are looking at, so **whatever servings and units you have selected are what comes out of the
printer**, which is what you are about to cook from. A separate print route would have to work
those out again and would get it wrong the first time you forgot.

It hides the nav, the controls, the footer and the photo, forces black on white whatever the
screen theme is, keeps the checkboxes as empty boxes to tick on paper, and avoids splitting a step
across two pages.

---

## 11. Phase 5: the map

### It cost no library JavaScript, as promised

`d3-geo` and `topojson-client` are devDependencies. They run during `astro build`, turn the
Natural Earth shapes into SVG path strings, and never reach the browser. Verified on the built
output: **0 KB of map library is shipped.**

### I got the size estimate wrong in Phase 1, and here are the real numbers

I said the projected paths would be "roughly 25 to 35 KB gzipped". They were not. Measured on the
built page:

| | Map page, gzipped |
|---|---|
| Full-precision coordinates, as d3 emits them | **125 KB** |
| Rounded to one decimal place | **86 KB** |
| Rounded to whole numbers (what it ships) | **58 KB** |

d3 writes full floats, so one border point costs something like
`M123.45678901234,234.56789012345`. In a 1000-unit viewBox a whole number is accurate to half a
unit, which is under a pixel at any size this map is drawn, so nothing visible is lost for a saving
of more than half.

**What that means for the choice I recommended.** At 58 KB this is still the lighter option:
`react-simple-maps` would have been 39 KB of data plus 32 KB of library, about 71 KB, and would
still have needed the same alpha-3 bridge and more accessibility work. So the recommendation
stands, but by a smaller margin than the numbers I gave you in Phase 1. I would rather correct that
than let the earlier figure stand.

### Matching countries by name, and the one that got away

Your lookup has 63 countries; the map data has 177. I match yours to the map by name, using the
aliases already in `regions.ts`. Only two needed thought:

- **United States.** The map calls it "United States of America". The alias was already there.
- **Singapore.** It is not in the map data at all, because at 1:110m it is too small to draw.

Singapore is the interesting one, because it is not a mistake to fix. The build prints a note
naming any lookup country with no shape, and such a place still appears in the region list, which
is the keyboard route anyway. It simply has no shape to click. If you ever write a recipe from
Singapore it will be findable, just not clickable on the map.

### The accessibility decisions, since maps routinely fail this

- **The list is the control, not a fallback.** Every place with recipes is a real button in it,
  with its count written as text. That is the keyboard and screen reader route, and it is also
  genuinely the faster way to find a small country.
- **The map's shapes are deliberately not in the tab order.** Tabbing through 176 mostly empty
  countries to reach India would be worse than useless. The SVG carries `role="img"` and a label
  saying what it shows and that the list gives the same places as buttons. `role="img"` also means
  a screen reader sees one described picture rather than 176 unlabelled paths.
- **Colour is never the only signal.** A country with recipes is filled in the accent *and* given a
  heavier outline; a selected one is filled in the ink and heavier still. Three states, three
  weights. The count is text in the list regardless of any of it.

**One thing worth knowing about the colours.** I tried to carry land-versus-sea on fill alone and
could not: against a near-white sea, a land tone quiet enough to stay in the background is about
1.2:1 from it, and one dark enough to reach 3:1 then collapses into the accent so the recipe
countries stop standing out. Measured both ways. The answer was the one paper maps have always
used: outline the land. The stroke is derived from the ink with `color-mix`, so it follows the
theme without a new token.

The house rule against hairlines is about dividers in a user interface. A coastline is the content
of a map, not decoration around it.

### Selection is in the URL

`/map?region=IND` for a country, `/map?region=middle-east` for a grouped region. Shareable, and
the back button steps through the places you looked at. Choosing a grouped region lights every
country in it: picking Middle East highlights all nine.
