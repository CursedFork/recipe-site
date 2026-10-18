# Recipe site

A personal recipe website. You add a recipe by dropping a `.txt` file into
`recipes/` and pushing to GitHub. Vercel rebuilds the site.

There is no database, no login and no admin page. Nothing about the site can be
changed from a browser, only from files in this repository.

---

## Adding a recipe

1. Write a `.txt` file and save it in `recipes/`.
2. If it has a photo, put the image in `recipes/photos/` and name it in the
   `Photo:` line.
3. Commit and push. Vercel rebuilds and the recipe is live.

If anything in the file is wrong, **the build fails and nothing is deployed.**
That is deliberate: the site you already have stays up, and the build log tells
you exactly what to fix. See [When the build fails](#when-the-build-fails).

### Running it locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:4321. Editing a recipe reloads the page immediately.

```bash
npm run build
```

Builds the site exactly as Vercel will, which is the quickest way to check a
new recipe file before pushing.

---

## The file format

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
2. Melt the butter in a wide pan.

Notes:
Optional free text.
```

The header comes first, then **one blank line**, then the body. That blank line
is what separates the two, so it has to be there.

### Header fields

| Field | Required | What it accepts |
|---|---|---|
| `Title` | Yes | Any text. This is the recipe's name on the site. |
| `Cuisine` | Yes | Any text. A new cuisine automatically becomes a new filter option, so spelling it the same way each time matters. |
| `Regions` | Yes | One or more countries or grouped regions, comma separated. See [Regions](#regions). |
| `Meal` | Yes | One or more of `breakfast`, `lunch`, `dinner`, `snack`, `dessert`, comma separated. |
| `Healthy` | Yes | Exactly `yes` or `no`. You decide this; the site does not calculate it. |
| `Prep` | Yes | A whole number of minutes. Just the number, no "min". |
| `Cook` | Yes | A whole number of minutes. `0` is fine for something uncooked. |
| `Servings` | Yes | A whole number, at least 1. |
| `Photo` | No | A filename in `recipes/photos`. Leave the line out entirely if there is no photo. |

**Field names are case-sensitive**, and **any field not in this table is an
error.** Both of those are on purpose: an ignored field is almost always a typo
that silently loses information, and `photo:` quietly doing nothing when you
meant `Photo:` is exactly the kind of bug that takes an hour to spot.

### Body sections

Three sections, each introduced by its name and a colon on its own line:

- `Ingredients:` **required**
- `Instructions:` **required**
- `Notes:` optional

**Any other section name is an error**, and so is **repeating a section**. A
second `Ingredients:` used to quietly replace the first one, which is exactly
the shape of a copy and paste accident, so the build now stops instead.

One deliberate exception: inside `Ingredients:` a line ending in a colon is a
group heading, not a new section, which is what makes `For the sauce:` work.
Inside `Notes:` the text is left alone entirely, so a line like `Variations:`
in a note is fine.

**`Notes:` is one paragraph.** Blank lines inside it are not kept, so a note
written as two paragraphs runs together into one. If you want a break, a note
is probably trying to be instructions.

### Ingredient lines

One ingredient per line, written as `amount unit item`.

- **Amounts** can be whole (`2`), fractions (`1/2`), mixed (`1 1/2`) or decimal
  (`1.5`). A fraction over zero, like `1/0`, is an error rather than a very
  large number.
- **A line ending in a colon is a group heading**, for example `For the sauce:`.
  A heading with no ingredients under it is an error, because it is almost
  always a line you meant to finish.
- **A line with no amount is shown exactly as written and never scales.** That
  is what makes `salt to taste` and `a handful of herbs` work.
- Units are recognised from a known list (`cup`, `tbsp`, `tsp`, `oz`, `lb`, `g`,
  `kg`, `ml`, `l`, and their plurals and spellings). A number followed by
  anything else keeps it as part of the item, so `3 eggs` is 3 of "eggs", not 3
  "egg" units.

Searching by ingredient matches **the item text, not the amount**, so searching
"tomato" finds `1 1/2 cups tomato puree` while searching "1" does not match
every recipe you own.

### Instruction lines

One step per line. Write them numbered (`1.`, `2.`) the way you naturally would
in a text file. The number is stripped and the page uses a real numbered list,
so the numbering can never drift out of order.

---

## Cooking from a recipe page

These are the controls on a recipe page, and the rules behind them, because a
couple of them deliberately refuse to do something you might expect.

**Servings.** The plus and minus buttons rescale every amount. Amounts are
snapped to halves, thirds, quarters and eighths, because those are the measures
you actually own: you get `2 1/4 cups`, not `2.25 cups`. A line with no amount,
like `salt to taste`, never changes.

Scaling a countable thing can give you half of one. Six servings of a
four-serving recipe turns `3 eggs` into `4 1/2 eggs`. That is arithmetically
right and there is no honest way to round it, so it is left alone.

**US and metric.** Volumes become ml or L and weights become g or kg.

Two things it will not do, both on purpose:

- **It never converts volume to weight.** A cup of flour is not 125 g except
  for one particular flour packed one particular way, and getting that wrong
  ruins a bake. So an ingredient that a metric cook would weigh rather than
  scoop stays in cups and spoons, and a note under the list says why, once.
  The list of those ingredients is at the top of `src/lib/units.ts` as
  `WEIGHED_NOT_SCOOPED`. **If something is converted that should not be, that
  list is the one place to fix it**, and adding to it only ever makes the site
  more cautious.
- **It only converts a temperature when the Fahrenheit is explicit.** `350°F`,
  `350 F`, `350 degrees F` and `350 Fahrenheit` all become `175°C`. A bare
  `350` is left completely alone, because it could be anything.

**Print.** Prints the page as you have it set, so whatever servings and units
you have chosen are what comes out of the printer, which is what you are about
to cook from. The nav, the controls and the photo are left off, it prints black
on white whatever the screen theme is, the checkboxes print as empty boxes to
tick, and no step is split across two pages.

**Cook mode.** Larger text and more room between things, for reading at arm's
length. It also asks the browser to keep the screen awake, and **only claims to
have done so once the browser has actually agreed**. If your browser has no
such feature, or refuses, the text still gets bigger and the note says the
screen may dim.

**What is remembered.** Your unit choice and your light or dark preference are
kept between visits. Servings and ticked checkboxes are not: each recipe opens
at the servings it was written for.

---

## Regions

Regions are what put a recipe on the map, and they are the most likely thing to
break, so they work in a specific way.

**The canonical key is an ISO 3166-1 alpha-3 code**, not a display name. The
lookup lives in [`src/data/regions.ts`](src/data/regions.ts) and maps every
accepted spelling to a code.

This exists because world map data uses its own spellings. It calls the United
States "United States of America" and Ivory Coast "Côte d'Ivoire". If a recipe
and the map disagree about a name, the recipe silently never appears on the
map, and you would have no idea why. Resolving your words to a code once, at
build time, is what prevents that.

So:

- Write countries however you naturally would. `United States`, `USA`, `US` and
  `America` all work, and so does the raw code `USA`.
- **A region that is not in the lookup is a build error**, naming the file and
  the exact text. You will also get a suggestion if it looks like a typo:
  writing `Middle Eest` tells you `Did you mean "Middle East"?`
- Fusion dishes can list several: `Regions: Japan, Mexico, West Africa`.

### Grouped regions

A grouped region expands to all of its member countries, so a recipe tagged
`Middle East` shows up for each of them on the map.

| Group | Covers |
|---|---|
| Middle East | Egypt, Iran, Iraq, Israel, Jordan, Lebanon, Saudi Arabia, Syria, Turkey |
| North Africa | Algeria, Egypt, Morocco, Tunisia |
| West Africa | Ghana, Nigeria, Senegal |
| East Africa | Ethiopia, Kenya |
| East Asia | China, Japan, South Korea, Taiwan |
| South Asia | India, Nepal, Pakistan, Sri Lanka |
| Southeast Asia | Indonesia, Malaysia, Philippines, Singapore, Thailand, Vietnam |
| Mediterranean | France, Greece, Italy, Morocco, Portugal, Spain, Turkey |
| Scandinavia | Denmark, Norway, Sweden |
| Caribbean | Cuba, Jamaica |
| Latin America | Argentina, Brazil, Colombia, Mexico, Peru |

### Adding a country or a group

`src/data/regions.ts` currently covers the cuisines a home cook reaches for
rather than every country on earth. Adding one is a single line:

```ts
PRK: { name: "North Korea" },
```

Phase 5 extends this to full ISO coverage when the map is built. Until then, if
you write a region that is not there, the build stops and tells you, which is
better than it quietly going missing.

---

## Filenames and URLs

**The filename is the URL.** `chicken-tikka-masala.txt` becomes
`/recipes/chicken-tikka-masala`.

There is no tidying-up step. A filename must already be lowercase letters,
numbers and single hyphens:

| Filename | Result |
|---|---|
| `chicken-tikka-masala.txt` | `/recipes/chicken-tikka-masala` |
| `soup-3-ways.txt` | `/recipes/soup-3-ways` |
| `Chicken Tikka.txt` | **Error.** Capitals and a space. |
| `chicken_tikka.txt` | **Error.** Underscore. |
| `chicken--tikka.txt` | **Error.** Double hyphen. |
| `café.txt` | **Error.** Needs escaping in a URL. |

The build refuses rather than silently renaming, because if the build quietly
turned `Chicken Tikka.txt` into `chicken-tikka`, the file in front of you and
the URL it produces would be two different things. The error message suggests a
compliant name, but renaming the file is your call.

**Two files that would produce the same URL is also an error.**

---

## Photos

- Photos go in `recipes/photos/`, never in `recipes/` itself.
- Name the file in the recipe's `Photo:` line, filename only, no path.
- Accepted: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, in **all lower case or
  all upper case**. A file saved as `tikka.Jpg` with that mixed-case extension
  is not picked up, and the recipe naming it fails with "photo is not in
  recipes/photos" while the file is plainly sitting there. Renaming it to
  `tikka.jpg` fixes it.
- **A `Photo:` line naming a file that is not there is a build error.** Showing
  no photo instead would just hide the typo.
- Filenames are **case-sensitive on the server** even though they are not on
  Windows. `Photo.JPG` and `photo.jpg` are different files once deployed, so
  the build checks for this and tells you when it finds a near-match.
- A photo in the folder that no recipe uses is **not** an error. You get a note
  in the build log, because it usually means a `Photo:` line has a typo.

Photos are resized and converted to WebP automatically, and every image gets an
explicit width and height so the page never jumps around as pictures load.

**Recipes without a photo are completely normal.** The card is designed to look
right with nothing to show, not to leave a gap where an image should be.

---

## When the build fails

Every problem across every file is reported together, in one pass, as
`recipes/file.txt: problem`. You are never in the position of fixing one thing,
rebuilding, and finding the next.

A build with two deliberately broken files produces this:

```
9 problems found in the recipes folder:

  recipes/Broken Recipe.txt: filename cannot be used as a URL because it contains capital letters, spaces. Use lowercase letters, numbers and single hyphens, for example "broken-recipe.txt"
  recipes/broken-everything.txt: unknown header "Calories". Allowed: Title, Cuisine, Regions, Meal, Healthy, Prep, Cook, Servings, Photo
  recipes/broken-everything.txt: missing required header "Servings"
  recipes/broken-everything.txt: region "Narnia" is not in the region lookup. Add it to src/data/regions.ts, or use one of the names listed in the README.
  recipes/broken-everything.txt: region "Middle Eest" is not in the region lookup. Did you mean "Middle East"?
  recipes/broken-everything.txt: meal "brunch" is not one of: breakfast, lunch, dinner, snack, dessert
  recipes/broken-everything.txt: header "Healthy" must be exactly "yes" or "no", found "sometimes"
  recipes/broken-everything.txt: header "Prep" must be a whole number of minutes, found "twenty"
  recipes/broken-everything.txt: missing "Instructions:" section

Nothing was built. Fix these and run the build again.
```

The build then exits non-zero, so **Vercel will not deploy it** and the version
of the site already live stays up.

---

## How the project is laid out

```
recipes/                 Your content. Drop .txt files here.
  photos/                Your photos.
src/
  config/site.ts         Site name, URL and navigation. The one file to edit.
  lib/                   Build-time code. None of it reaches the browser.
    parse-recipe.ts        One file's text to a recipe, or a list of problems
    load-recipes.ts        Reads the folder, collects every error, fails the build
    slug.ts                Filename to URL rule
    regions.ts             Resolves your words to ISO codes
    photos.ts              Bridges recipes/photos into Astro's image pipeline
    units.ts               Fraction and unit maths, with units.test.ts beside it
    map-geometry.ts        Projects the world map into SVG paths
  data/regions.ts        The region lookup. Alpha-3 is the key.
  components/            Static Astro. No JavaScript shipped.
  islands/               React. The only things that ship JavaScript.
  layouts/               The page shell, including the head and the theme script
  pages/                 One file per URL
    index.astro            The recipe list
    recipes/[slug].astro   One page per recipe file
    map.astro              The map
    404.astro              Not found
    sitemap.xml.ts         Generated from the recipes
    robots.txt.ts          Generated, so it uses the real site URL
  styles/                tokens.css is the whole design system
```

Four React islands ship JavaScript, and nothing else does: the recipe browser
(search and filters), the recipe page controls, the map, and the theme toggle.
Everything else is HTML by the time it reaches a browser.

[`DECISIONS.md`](DECISIONS.md) explains why things are the way they are: the
type scale and palette, which components are React islands and why, the mapping
approach, and where the design tooling was overruled.

---

## Putting it on the internet

You do this once. After that, adding a recipe is just dropping a `.txt` file in
`recipes/` and pushing.

Nothing here costs money. The site is static files, and it sits inside Vercel's
free tier with room to spare.

### Before you start

**Set the site URL.** This is the one step that matters most, and the build
nags you about it every time until you do it.

`url` in [`src/config/site.ts`](src/config/site.ts) is still
`https://example.com/`. That value becomes the canonical tag on every page, the
link preview URL, every entry in the sitemap, and the Sitemap line in
robots.txt. A canonical tag pointing at example.com tells Google that the real
version of your page lives somewhere else, which is a very effective way to
keep a site out of search results entirely.

You will not know the real address until Vercel gives you one, so the order is:
deploy, copy the address Vercel shows you, set `url`, push again. Two deploys,
and the second one takes about a minute.

**Pick a site name while you are here.** `name` in the same file is still
`Recipe Notebook`, which was a placeholder. It shows in the header, the browser
tab, the footer and every link preview.

### Step 1: put the code on GitHub

The repository exists locally with your full history. It has no remote yet.

Create an empty repository on GitHub, at <https://github.com/new>:

- Any name you like. `recipe-site` is fine.
- **Private or public is your choice.** Private is the safer default and works
  identically with Vercel. If you make it public, remember that everything in
  it is readable, including every recipe.
- **Do not** tick "Add a README", "Add .gitignore" or "Choose a license".
  Those create a first commit on GitHub that your local history does not have,
  and you then have to untangle two unrelated histories. You already have all
  three files.

GitHub will then show you a "push an existing repository" snippet. It is these
two commands, with your own username and repository name:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

```bash
git push -u origin main
```

If it asks for a password, GitHub does not accept your account password here.
Either install the GitHub CLI and run `gh auth login`, or create a personal
access token and use that as the password. The CLI is less fiddly.

### Step 2: connect Vercel

1. Sign in at <https://vercel.com> with your GitHub account. Signing in with
   GitHub means Vercel can see your repositories without any extra setup.
2. Click **Add New** then **Project**.
3. Find your repository and click **Import**. If it is not listed, click
   **Adjust GitHub App Permissions** and grant access to it.
4. **Change nothing on the configuration screen.** Vercel detects Astro and
   fills in the build command (`npm run build`), the output directory (`dist`)
   and the install command by itself. There are no environment variables to
   set, because this site has no secrets and talks to nothing.
5. Click **Deploy** and wait about a minute.

Vercel gives you an address like `your-repo.vercel.app`. Open it. The site
should look exactly like it does locally.

### Step 3: set the URL and push again

Open [`src/config/site.ts`](src/config/site.ts), set `url` to the address
Vercel gave you, with a trailing slash:

```ts
url: "https://your-repo.vercel.app/",
```

Then:

```bash
git add -A && git commit -m "Set the site URL" && git push
```

Vercel rebuilds on its own. The build warning about the placeholder stops, and
the canonical tags and sitemap now point at the real site.

### After that: adding a recipe

1. Write a `.txt` file in `recipes/`, and put any photo in `recipes/photos/`.
2. Run `npm run build` to check it. This is worth the twenty seconds: it is
   exactly what Vercel runs, so if it passes locally it will pass there.
3. Commit and push.

```bash
git add -A && git commit -m "Add the tikka masala recipe" && git push
```

Vercel rebuilds in about a minute. **If a recipe file is broken, the build
fails and nothing is deployed**, so the version already live stays up and the
build log tells you exactly what to fix. See
[When the build fails](#when-the-build-fails).

### Things worth knowing before they bite you

**A recipe's address comes from its filename, so renaming a file breaks any
link to it.** If you have shared `your-site/recipes/chicken-tikka` with someone
and then rename the file, their link goes to the 404 page. That page offers a
way back to the recipe list, but the old link is gone. Rename early or not at
all.

**Do not set `NODE_ENV=production` in Vercel's environment variables.** The map
is projected at build time by `d3-geo` and `topojson-client`, which are
devDependencies because nothing they do reaches the browser. Vercel installs
devDependencies by default, which is why this works. Setting that variable
makes npm skip them and the build fails with "Cannot find module 'd3-geo'".
There is no reason to set it, but it is a popular thing to copy from a tutorial.

**Node version.** `package.json` asks for Node 22 or newer. Vercel's current
default satisfies that. If a build ever fails on something syntactic, check the
Node version in Project Settings before looking anywhere else.

**Caching is already handled, and there is nothing for you to configure.**
Astro gives every built asset a content hash in its filename, and Vercel serves
those with a long cache lifetime automatically. Because the filename changes
whenever the content does, a visitor can never be served a stale stylesheet or
an out-of-date photo. There is no login and no user data anywhere on this site,
so the usual danger of a shared cache serving one person's data to another has
nothing to bite on here.

**Custom domain, if you ever want one.** Project Settings, then Domains, then
add it and follow the DNS instructions. Afterwards set `url` in
`src/config/site.ts` to the new address and push, or the canonical tags will
keep pointing at the `.vercel.app` one.

### If something goes wrong

**The build failed on Vercel but works locally.** Read the build log; the
recipe problems are printed as a plain list. The usual cause is a photo
filename whose capitalisation differs from the `Photo:` line, because Windows
treats `Photo.JPG` and `photo.jpg` as the same file and the server does not.

**The site deployed but looks unstyled.** Almost always a build that half
failed. Check the log rather than the page.

**A recipe is missing from the map.** Its `Regions:` line resolved to somewhere
with no shape at the map's scale, or to nothing at all. An unknown region is a
build error, so this is usually the first case: the build log lists any country
it could not draw.
