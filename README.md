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

Any other section name is an error.

### Ingredient lines

One ingredient per line, written as `amount unit item`.

- **Amounts** can be whole (`2`), fractions (`1/2`), mixed (`1 1/2`) or decimal
  (`1.5`).
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
"tomato" finds `1 1/2 cups tomato puree`.

### Instruction lines

One step per line. Write them numbered (`1.`, `2.`) the way you naturally would
in a text file. The number is stripped and the page uses a real numbered list,
so the numbering can never drift out of order.

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
- Accepted: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.
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
recipes/              Your content. Drop .txt files here.
  photos/             Your photos.
src/
  config/site.ts      The site name and navigation. The one file to edit.
  lib/                Build-time code. Never reaches the browser.
    parse-recipe.ts     One file's text to a recipe, or a list of problems
    load-recipes.ts     Reads the folder, collects every error, fails the build
    slug.ts             Filename to URL rule
    regions.ts          Resolves your words to ISO codes
    photos.ts           Bridges recipes/photos into Astro's image pipeline
  data/regions.ts     The region lookup. Alpha-3 is the key.
  components/         Static Astro. No JavaScript shipped.
  islands/            React. The only things that ship JavaScript.
  layouts/            The page shell
  pages/              One file per URL
  styles/             tokens.css is the whole design system
```

[`DECISIONS.md`](DECISIONS.md) explains why things are the way they are: the
type scale and palette, which components are React islands and why, the mapping
approach, and where the design tooling was overruled.

---

## Deployment

Covered in Phase 7, along with connecting this repository to Vercel.
