# Spices section: Phase 1 plan

**Status: approved with all nine defaults. Phase 2 (the parsers and validators) is built and tested.** No page reads them yet, so the live site is unchanged. Section 16 at the end says what was built.

The paste-ready file formats are in [`spice-formats.txt`](spice-formats.txt).

---

## 1. What I found in the existing site, and what I will reuse

| Area | What is already there | What the Spices section does with it |
|---|---|---|
| Data files | `recipes/*.txt`: header lines, a blank line, then a body. Parsed at build time. Every problem is collected and reported once as `file: problem`, and the build fails. | Same convention for `/spices` and `/blends`, with new parsers in the same style and the same error format. |
| Filename is the URL | A strict slug rule, and a bad filename is an error rather than being quietly fixed. | Same rule. I add one thing: the filename must also match the file's `Name`. |
| Reading files at build time | `import.meta.glob`, with the success and the failure both remembered, and a short thrown message. | Same. |
| Region lookup | `src/data/regions.ts`, keyed on ISO alpha-3, with aliases and a "did you mean" suggestion. | Reused for every `Origin:` field. It needs extending (see conflict 3 below). |
| React islands | Islands only where state is shared. The whole page is still written into the HTML at build time, so it reads without JavaScript. | Same for the library, finder and shopping list. |
| Look and feel | Tokens, chips, cards, dark mode, the 44px control rule, the print stylesheet, the tooltip plus `aria-label` rule. | All reused. The Power meter is the one new visual piece. |
| Saving in the browser | `localStorage` wrapped in `try/catch`. | Same, for the cabinet and the shopping list. |
| Tests | `vitest` for the fraction and unit maths. | The matching and ranking rules become pure functions with tests, so the test cases you want to see are real passing tests. |

### Four places where your brief and the existing site pull apart

1. **Where the vocabulary files live.** You wrote `/data/foods.json`. This project keeps data in `src/data/`, next to the region lookup. I assumed `src/data/`.
2. **The nav has no sub-links.** `site.nav` is a flat list. My proposal: a **Spices** link in the main nav, plus a second row of four links (Library, Finder, Blends, Shopping list) that appears on every `/spices` page. I chose a visible row over a hover dropdown because hover menus are unreliable on a phone and awkward by keyboard. A small count badge sits on the Spices link.
3. **"Levant" is wrong in the region lookup.** It is currently an alias of the nine-country "Middle East" group, which includes Egypt, Iran and Saudi Arabia. For za'atar that over-claims. In Phase 2 I would split out a real Levant group (Lebanon, Syria, Jordan, Palestine, Israel), add Palestine, and add other countries as spice origins need them (Tanzania, Madagascar, Grenada, Guatemala, and so on). Nothing existing uses the old alias. I will not touch `regions.ts` until you approve.
4. **Three places need to agree on the cabinet.** The nav badge, the library and the finder all read the same saved list. That needs a small shared store, with the browser's `storage` event so two open tabs stay in step. It adds one very small island to every page for the badge. React is already loaded on every page for the theme toggle, so the extra cost is about a kilobyte.

---

## 2. Folder structure and addresses

```
spices/                          one .txt per spice (filename is the address)
blends/                          one .txt per blend
docs/
  spices-plan.md                 this file
  spice-formats.txt              paste-ready formats for another agent
src/
  config/pantry.ts               the staples list (salt, black pepper, sugar)
  data/
    foods.json                   foods, with groups, items and aliases
    methods.json                 cooking methods
    uses.json                    how a blend is used
    cuisines.json                controlled cuisine names
    allergens.json               the seven allergen tags
  lib/spices/                    build time only, never shipped
    parse-spice.ts  parse-blend.ts  load-spices.ts
    vocab.ts                     resolves a typed food, method or cuisine, with suggestions
    matching.ts  ranking.ts      pure functions, covered by tests
  islands/spices/
    cabinet-store.ts             the shared saved cabinet and list
    SpiceLibrary.tsx  BlendFinder.tsx  ShoppingList.tsx  CabinetBadge.tsx
  components/SpicesSubNav.astro
  pages/spices/
    index.astro                  hub: top picks and buy next
    library.astro                the library
    library/[slug].astro         one spice
    finder.astro                 the blend finder
    blends.astro                 browse blends
    blends/[slug].astro          one blend
    list.astro                   the shopping list
```

Spice pages live under `/spices/library/` on purpose. If they sat directly under `/spices/`, a spice whose address was `finder` or `list` would collide with a real page.

---

## 3. The file formats: what I changed from your draft, and why

The complete formats are in [`spice-formats.txt`](spice-formats.txt). These are the changes.

| # | Change | Why |
|---|---|---|
| 1 | `Use:` becomes `Tip:` | Your blend draft has both `Uses:` (categories) and `Use:` (a sentence). One letter apart, they will be mixed up by a person or an agent. |
| 2 | In a blend file, every single-line field goes at the top and `Ingredients:` comes last | Your draft puts `Use:`, `Typical version:` and `Source:` after the ingredient list, where they would be read as ingredient lines. It also matches how recipe files already work. |
| 3 | `Cuisines:` (a list) in both files | Your draft has `Cuisine:` in one and `Cuisines:` in the other. Real blends belong to more than one cuisine. |
| 4 | `Source:` may repeat | One line per link. The recipe parser rejects a repeated field, so this is a deliberate exception. |
| 5 | New `Confidence:` (high, medium, low) and optional `Doubt:` | This is what makes the low-confidence report possible. The `Doubt:` line says why, in a sentence, and is never shown to visitors. |
| 6 | The filename must equal the slug of the `Name` | Stops a file and its title drifting apart, and keeps the saved cabinet's identifiers stable. |
| 7 | A family member is named `Family: Variety` | `Pepper, black: Tellicherry` always sits directly under `Pepper, black`. See section 4. |
| 8 | `Form:` can list several: whole, ground, flakes, leaves, granules | Ancho is sold as pods and as powder. |
| 9 | One entry per spice, whatever its form | See decision A. |
| 10 | `Heat:` is required for the Chiles category. `Power:` is not used for salts, sugars or the non-spice ingredients. | A Power meter on table salt would be meaningless, and a missing Heat on a chile would be a mistake worth catching. |
| 11 | Ingredient amounts are `parts` by volume, with fractions allowed, plus `pinch` and `to taste` | Real blends have a salt line that is a pinch. Forcing it into a ratio is false precision. |
| 12 | Cuisines come from a controlled list | A typo then becomes a build error with a suggestion, not a second filter button. |
| 13 | Blend allergens are never typed. They are worked out from the ingredients. | Nothing can drift out of date. |
| 14 | An `Aka:` word must be unique across all spice files | The same word pointing at two spices would make a blend line ambiguous. |

**Considered and left out, to keep it simple:** an "A or B" alternative inside an ingredient line (za'atar's thyme, oregano or marjoram is the case that wants it); a `Formerly:` field for renamed spices; photos; separate entries for whole and ground.

---

## 4. Naming convention

`Name:` follows **Base, kind: Variety**.

- **Base** is the word a cook looks up first: Pepper, Chile, Cinnamon, Cumin.
- **kind** (after the comma) is the broad type: black, white, mild red.
- **Variety** (after the colon) is the named cultivar or origin.
- A spice with nothing to group under it is just its name: `Clove`, `Cumin`.
- **Singular and sentence case**, with proper nouns capitalized.

```
Pepper, black
Pepper, black: Malabar
Pepper, black: Tellicherry
Pepper, Sichuan
Pepper, Sichuan: Green
Pepper, white
Chile, mild red
Chile, mild red: Ancho
Chile, mild red: Guajillo
Cinnamon
Cinnamon: Ceylon
Cinnamon: Cassia
```

**Rule for family members:** if a spice has a `Family:`, its `Name` must be that family's name, then a colon, then its variety. The build checks it.

**Sorting:** compare the whole name, and let the comma and colon sort before any letter. That puts the umbrella first and its members straight after it, so all the peppers sit together.

**Filename rule** (the same one recipes use, plus apostrophes dropped): lowercase, accents removed, each run of anything other than a letter or digit becomes one hyphen. So `Pepper, black: Tellicherry` is `pepper-black-tellicherry.txt` and `Za'atar` is `zaatar.txt`.

---

## 5. Categories and targets

| Category | Target | What goes in it |
|---|---|---|
| Peppercorns and pepper-likes | 22 | Black (umbrella, Malabar, Tellicherry, Lampong, Sarawak, Kampot), white (umbrella, Muntok, Sarawak, Kampot), green, pink, Sichuan (red, green), Timut, long pepper, cubeb, grains of paradise, andaliman, voatsiperifery |
| Chiles | 40 | Ancho, pasilla, guajillo, mulato, chipotle, cascabel, árbol, cayenne, Kashmiri, Byadgi, Guntur, Aleppo, Urfa, Marash, gochugaru, Espelette, New Mexico, Thai, habanero, scotch bonnet, ghost, crushed red pepper, and the family umbrellas. Whole pods and powders share one entry. |
| Paprika and pimentón | 10 | Sweet, hot and smoked in Hungarian and Spanish styles |
| Seeds and pods | 34 | Cumin, nigella, coriander, fennel, caraway, anise, celery, dill, mustard (yellow, brown, black), fenugreek, ajwain, sesame (white, black), poppy, annatto |
| Warm and sweet spices | 28 | Cinnamon (cassia, Ceylon, Saigon, Korintje), clove, nutmeg, mace, allspice, star anise, cardamom (green, black, white), vanilla, mahleb, mastic |
| Roots and rhizomes | 12 | Ginger, turmeric, galangal, fingerroot, dried horseradish, wasabi powder, filé |
| Dried herbs | 40 | Oregano (Mediterranean, Mexican), thyme, rosemary, sage, marjoram, basil, tarragon, bay (Turkish, California, Indian), dill, parsley, chives, mint, savory, epazote, curry leaf, makrut lime leaf, fenugreek leaf, lovage |
| Alliums and aromatics | 14 | Garlic (powder, granules, flakes), onion (powder, flakes, toasted), shallot, black garlic, asafoetida |
| Salts and sugars | 18 | Salt (umbrella, table, kosher, sea, flaky, black salt, smoked), sugar (umbrella, white, brown, jaggery, palm, piloncillo) |
| Tangy, fruity and floral | 24 | Sumac, amchur, anardana, tamarind, dried lime, citrus peels, barberries, juniper, saffron, rose, hibiscus, lavender, kokum |
| Other blend ingredients | 12 | Things real blends contain that are not spices: dukkah's hazelnuts, dried coconut, chana and urad dal, nori flakes, toasted rice powder, cocoa |
| **Total** | **254** | |

That is slightly above the bottom of your 250 to 300 range. I would rather land at 245 entries I trust than 300 padded ones.

**The "Other" category is a judgment call.** Several real blends (dukkah, sambar powder, furikake, shichimi) contain nuts, dal or seaweed. Without those entries I could not list the blends honestly. They carry allergen tags (tree nut, peanut, sesame) but have no Power rating.

---

## 6. Families

A **family** is a group of spices that a typical home cook would happily swap mid-recipe, such as any black pepper. The rule that decides whether to make one: *would a cook shrug and use whichever is in the cupboard?*

- The family is a **real spice entry** (the "umbrella"), because the person who owns "black pepper" and does not know the variety needs somewhere to tick.
- Any spice naming the umbrella as its `Family:` is a member. An entry is an umbrella automatically if other entries name it. There is no extra flag.
- **A blend that names the umbrella is satisfied by the umbrella or any member. A blend that names a variety needs exactly that variety.** There is no special syntax: the blend simply writes the name it means.
- If you are missing a specific variety but own another member, the page shows a gentle "close substitute you have" hint. It never changes the Ready now count.

**Your draft's `Family: Ground chile` would not pass that rule.** An ancho and a cayenne are not interchangeable, and a blend written as "any ground chile" would be ready for someone who owns only ancho, then taste nothing like intended. So chiles are split by what a cook would actually swap: **Chile, mild red** (ancho, guajillo, New Mexico, Kashmiri, pasilla), **Chile, hot red** (cayenne, árbol, piquín, Thai) and **Chile flakes** (crushed red pepper, Aleppo, Urfa, Marash, gochugaru).

Starting list, about 20, to be confirmed against the data in Phase 3: Pepper, black / white / Sichuan; Chile, mild red / hot red / flakes; Paprika; Cinnamon; Cardamom; Mustard seed; Sesame seed; Oregano; Thyme; Bay leaf; Vanilla; Salt; Sugar; Garlic, dried; Onion, dried.

---

## 7. The Power and Heat scales

### Power: how easily it overwhelms a dish

It is a judgment, so I made it checkable. Each level is anchored to a **typical amount in a dish for four people**.

| Power | Label shown | Typical amount for four | Examples |
|---|---|---|---|
| 1 | Mild and forgiving | a tablespoon or more | sweet paprika, parsley, sesame |
| 2 | Gentle | two teaspoons to a tablespoon | ancho, coriander, thyme |
| 3 | Moderate | about a teaspoon | cumin, black pepper, oregano, turmeric |
| 4 | Use sparingly | a quarter to a half teaspoon | white pepper, nutmeg, cardamom, star anise, fenugreek, cayenne |
| 5 | A pinch goes a long way | a pinch to an eighth of a teaspoon | clove, asafoetida |

The visible meter is five segments plus the words ("Power 4 of 5: use sparingly"), never color alone.

**These are my own ratings, not taken from a source.** There is no published standard for this. I am least sure of: saffron (4 or 5), allspice (3 or 4), Ceylon against cassia cinnamon (2 against 3), mace, ajwain, cubeb, grains of paradise, long pepper, dried lime, kokum and mahleb. Each of those will carry `Confidence: low` with a `Doubt:` note, so you can overrule any of them.

### Heat: capsaicin, shown only on chiles

Banded by Scoville range, so each rating can be checked against a published figure.

| Heat | Label | Scoville range | Examples |
|---|---|---|---|
| 0 | No heat | none | most spices (not shown) |
| 1 | Mild | up to 2,500 | ancho (about 1,000 to 1,500), Kashmiri |
| 2 | Medium | 2,500 to 15,000 | guajillo, Aleppo |
| 3 | Hot | 15,000 to 50,000 | árbol, cayenne |
| 4 | Very hot | 50,000 to 100,000 | Thai bird |
| 5 | Extremely hot | above 100,000 | habanero, scotch bonnet, ghost |

The examples above are from memory, and each will be checked against a source before it goes in a file. Sweet paprika has essentially no heat, so it is Heat 0 and the meter is not shown. For non-chile pungency (black pepper, ginger, mustard, horseradish) I would leave Heat blank rather than invent a number. Sichuan's numbing tingle is not heat, so it goes in the flavor notes.

---

## 8. The pairing vocabulary

Full lists are in `src/data/`. I checked them with a throwaway script and no word is used twice anywhere. In Phase 2 that becomes a permanent build check.

### Foods (`foods.json`)

**21 groups, 117 items, 487 aliases.** Your 19 groups are all there. Choosing a group matches every item inside it, and a typed word such as "ribeye" resolves to its item (Steak).

- **A group-level pairing covers every item in the group.** A blend pairing "Beef" suits steak, brisket and ground beef. A blend pairing only "Steak" does not suit brisket.
- **Selecting an item matches blends that pair that item or its group. Selecting a group matches any item inside it.** If a blend lists the same food as both classic and also-works, classic wins.
- **"Lamb" resolves to the whole "Lamb and goat" group.** I made that a group alias rather than give lamb and goat separate groups, since you listed them together. The cost is that "Lamb" also matches goat.

**Two additions for you to accept or strike** (marked `proposed` in the file). Spice blends are used in a lot that your list does not cover:

- **Drinks** (tea and chai, coffee and hot chocolate, mulled wine and cider, syrups). Chai masala and mulling spice have nowhere to go without it.
- **Sauces and dressings** (dressings, tomato sauces, barbecue and hot sauces, gravy, creamy sauces).

### Cooking methods and uses

Your lists are used as written, with three additions marked `proposed`:

- Method: **Simmer or boil**. Soups, rice and poaching have no home in your nine.
- Use: **Pickling or brining**, and **Drink or infusion**. Pickling spice, chai masala and mulling spice are real blends that fit none of your six uses honestly.

### Cuisines and allergens

**67 cuisines**, grouped by region for the filter, plus a reserved `Global` for a spice used everywhere. **7 allergen tags:** sesame, mustard, celery, peanut, tree nut, soy and wheat. Wheat is on the list because asafoetida can be sold cut with wheat flour.

---

## 9. Matching and ranking, in plain words

1. **What counts as owned.** A spice is owned if you ticked it. A pantry staple also counts as owned while the staples switch is on.
2. **What an ingredient needs.** If it names a family (an umbrella), the umbrella or any member of the family satisfies it. If it names a specific spice, only that spice does.
3. **Status of a blend.** Only required ingredients count. **Ready now** is none missing. **Missing one**, **Missing two**, and **Missing three or more** follow. Optional ingredients never block anything and show as "nice to have".
4. **Close substitute.** For a missing specific spice you do not own, if you own another member of its family you see a gentle hint. It is only a hint and never changes the status.
5. **Fit for a food.** A classic pairing is a **strong fit**. An also-works pairing is a **good fit**. A blend that does not list the food is hidden, unless you choose **Show all**.
6. **Filters.** Different filters combine (all must match). Several choices within one filter match any of them. Cuisine mood, method and use work this way.
7. **Default order, "Best match":** fit first, then cabinet status, then alphabetical. **"Ready first"** puts cabinet status first and fit second. If no food is chosen, the fit part is skipped. If your cabinet is empty, the cabinet part is skipped.
8. **"Go easy" note.** Any blend that contains a Power 4 or 5 spice gets a note naming it, such as "Go easy: contains clove (Power 5)".

---

## 10. Pantry staples

`src/config/pantry.ts` lists the ingredients assumed to be in everyone's kitchen: **Salt, Pepper, black and Sugar**. Each name must match a spice file, and naming a family counts every member of it. The page shows a visible note ("We assume you have salt, black pepper and sugar") with a switch, and the choice is saved in the browser. Default: on.

## 11. Saving

The cabinet, the shopping list and the staples switch are saved in the visitor's own browser with `localStorage`, wrapped in `try/catch` so everything still works if storage is blocked. No cookies, no accounts, nothing sent anywhere. One sentence on the page says so. Saved identifiers are the spice filenames, so **renaming a spice file orphans anyone's saved copy**. The app will list unknown saved items as "no longer in the library" rather than silently dropping them.

---

## 12. What I could and could not verify

This is the section to read if you only read one.

### The sample entries

I read the pages behind each sample. These were readable: Wikipedia (garam masala, za'atar, chili powder, black pepper, clove, poblano, mole, enchilada, Thalassery), America's Test Kitchen (za'atar, and the Cook's Country garam masala), Veena Azmanov and Tasting Table (garam masala), Inspired Taste and Minimalist Baker (chili powder).

These **blocked me** (error 403 or 429): Amazing Ribs, Pizza Today, Britannica (two pages), Chili Pepper Madness and The Chef's Shop. I did not cite them.

My page reader returns a summary, not the raw page, so I treat figures as read once and recheck anything that looks wrong.

### What I found when I checked

- **Garam masala has no standard ratio.** The recipes I read differ widely. One is mostly black pepper and cardamom with no clove, another is mostly coriander and cumin. The sample is one documented ground-spice version, labeled as such.
- **Ancho is not named as the required base of chili powder.** Wikipedia says the first commercial powder (1894) was ground ancho, and the recipes I read let you choose ancho, guajillo or New Mexico. So the sample asks for the "Chile, mild red" family.
- **I could not source Tellicherry's grade or flavor.** Only sellers and importers describe it. That entry is `Confidence: low`, and its flavor line is provisional.
- **Your ancho draft had claims I could not confirm.** I dropped "smoky" (ancho is a dried poblano, not a smoked pepper, so smoky belongs to chipotle), and enchilada sauce, corn and sweet potato. Mole poblano is confirmed, with turkey, chicken or pork.

### Rules I will follow in later phases

- **Every blend needs at least one source I actually read.** If I cannot find one, the blend is left out or marked low, not guessed.
- **Pairings are the most editorial part.** They reflect widely documented traditional use. Where I am unsure of a pairing I leave it out, and an entry resting on weak sources is marked low.
- **Descriptions are in my own words.** I copy no text. Ingredient lists and ratios are facts.
- **Tips are standard technique in my own words**, not quotations.

### The blend count

**I cannot promise 200.** My honest guess is that there are somewhere between 150 and 220 distinct, documented blends once near-duplicates are excluded. **Before I write the first batch of 25, I will send you the full roster of candidate names, grouped by region and with no details**, so you can strike anything you doubt. The final count is whatever survives its sources, and I will tell you the number rather than pad it.

---

## 13. Decisions I need from you

Each has my default. **Saying "approved" accepts all of them.**

| | Decision | My default |
|---|---|---|
| A | One entry per spice whether whole or ground (so ancho is one entry for pods and powder). A blend assumes ground, and you can grind at home. | Yes |
| B | A second row of sub-links on `/spices` pages rather than a hover dropdown. | Row |
| C | Splitting your single "ground chile" family into mild red, hot red and flakes. | Split |
| D | The two extra food groups (Drinks, Sauces and dressings). | Add both |
| E | The three extra method and use entries (Simmer or boil, Pickling or brining, Drink or infusion). | Add all three |
| F | A controlled cuisine list of 67 names, instead of free text. | Controlled |
| G | An "Other blend ingredients" category (nuts, dal, nori, coconut), with no Power rating. | Include |
| H | The Power anchors (section 7). I will mark any I doubt `low`. | Accept |
| I | Extending the region lookup in Phase 2: a real Levant group, Palestine, and the extra countries spices need. | Extend |

---

## 14. The sample files, and what each one shows

**Spices** (`spices/`)

| File | Shows |
|---|---|
| `pepper-black-tellicherry.txt` | A family member (named `Family: Variety`) and a `Confidence: low` entry with a `Doubt:` note |
| `chile-mild-red-ancho.txt` | A family member, `Heat` banded by Scoville, and what I corrected from your draft |
| `clove.txt` | The top of the Power scale (5), with no family and no heat |

**Blends** (`blends/`)

| File | Shows |
|---|---|
| `garam-masala.txt` | Family ingredients (Pepper, black; Cardamom; Cinnamon), optional ingredients, and a "Go easy" case (clove, Power 5) |
| `zaatar.txt` | A derived allergen (sesame), a `pinch`, a `Careful:` line, and an optional herb |
| `chili-powder-american.txt` | A family-based ingredient ("Chile, mild red"), and optional fractions |

**These samples cannot pass the full build yet.** They name 16 spices that do not exist until Phase 3: Cardamom; Chile, hot red: Cayenne; Chile, mild red; Cinnamon; Coriander; Cumin; Garlic powder; Ginger; Nutmeg; Oregano; Paprika; Pepper, black; Salt; Sesame seed; Sumac; Thyme. Nothing reads these folders yet, so the current site is unaffected. **The first spice batch will start with exactly these**, plus the family umbrellas they depend on.

I checked the six files with a throwaway script (not kept): every food, method, use and cuisine they name is in the vocabulary, every filename matches its Name, every Power and Heat is in range, and no word is defined twice anywhere in the vocabulary.

---

## 15. The phases ahead

| Phase | What I will show you |
|---|---|
| 2 | Both parsers and their errors (unknown spice or food, Power outside 1 to 5, duplicate names, missing fields), with a deliberately broken file and its exact error. Regions extended. |
| 3 | The first batch of spices (about 40), the sources, and a low-confidence report. Stop. |
| 4 | The blend roster for you to strike from, then the first 25 blends. Stop. |
| 5 | The library page: tick boxes, search, A to Z, filters, select and deselect all shown, clear everything with undo, spice pages with the Power meter. |
| 6 | Blends browsing and blend pages. |
| 7 | The finder, with passing tests for: eggs, a family match, a specific-spice miss, an optional ingredient, classic against also-works order, and "select all shown" with a filter on. |
| 8 | Top picks, Buy next and the shopping list, with tests for the counts. |
| 9 | Mobile, dark mode, accessibility, page titles, nav, and the README section on adding a spice or blend. |

---

## 16. Phase 2: what was built

**The parsers and validators**, in `src/lib/spices/`. Nothing imports them yet, so none of it ships to visitors.

| File | Job |
|---|---|
| `parse-spice.ts` | Checks everything one spice file can say about itself |
| `parse-blend.ts` | The same for a blend, and reads the Ingredients list |
| `build-library.ts` | The checks that need every file (names, families, ingredients), and works out allergens and the "go easy" list |
| `vocab.ts` | Looks a typed word up in the foods, methods, uses, cuisines and allergens lists, with suggestions |
| `fields.ts`, `text.ts`, `constants.ts`, `types.ts` | Shared pieces |
| `load-spices.ts` | Reads the real `/spices` and `/blends` folders. **Not called by any page yet.** |

**The rules, as they now stand** (each one has a test that asserts its exact error message):

- Every problem across every file is collected and reported together, as `spices/file.txt: problem`, ordered by file. One mistake never hides another.
- **Required and missing fields**, unknown fields (with "did you mean"), repeated fields (except Source), empty values, text where none is allowed.
- **Power** must be a whole number from 1 to 5 and is not allowed on salts, sugars or other ingredients. **Heat** must be 0 to 5 and is required on chiles.
- **Unknown foods, cuisines, methods, uses, allergens, categories, forms and origins** are errors with the closest match suggested.
- **Names:** a duplicate Name, two names landing on one address, and a filename that does not match the Name are all errors. When two files claim one name, the correctly named file is treated as the owner and the other one is blamed.
- **Aka:** a word that is another spice's Name, or used by two spices, is an error.
- **Families:** the family must be a real spice, one level only, and a member's Name must start with `Family: `. A Name with a colon and no Family line is an error too.
- **Ingredients:** an unknown spice is an error with a suggestion; the same spice twice (even by two names) is an error; zero amounts and zero denominators are errors; amounts in teaspoons get a specific message; fewer than two ingredients, or all of them optional, is an error.
- **Classic and Also** may not list the same food.
- **Confidence below high needs a Doubt line.**
- **Pantry staples** must be real spices.

**Two friendlier messages for the old draft's layout.** A renamed field (`Use`, `Cuisine`, `Sources`) says what it is now called instead of suggesting the wrong field. A blend with no blank line before `Ingredients:` gets one clear message instead of a pile.

**Region lookup (decision I):** a real Levant group of five, and 17 new countries (Palestine among them); Bangladesh, Cambodia, Laos, Myanmar, Eritrea, Tanzania, Grenada, Trinidad and Tobago and Guatemala joined the groups they belong in. No existing recipe uses any of them, so the map page is unchanged.

**Tests:** 180 now pass across the project (44 before this phase). The 136 new ones cover the rules above, and I broke three rules on purpose to confirm the tests catch them.

---

## 17. Phase 5: the library page

**What exists now.** `/spices` (a small hub), `/spices/library` (the list) and one page per spice at `/spices/library/<slug>` (79 pages). "Spices" is in the main navigation and in the sitemap.

| Piece | Where |
|---|---|
| The saved cabinet rules (add, remove, clear, read safely) | `src/lib/spices/cabinet.ts`, tested |
| Search, filters, letter groups, pantry staples | `src/lib/spices/library-filter.ts`, tested |
| Power and Heat words | `src/lib/spices/scales.ts`, tested |
| The one place that touches localStorage | `src/islands/spices/cabinet-store.ts` |
| The library island | `src/islands/spices/SpiceLibrary.tsx` |
| Power and Heat meters (five segments plus words) | `src/islands/spices/Meter.tsx` |
| "I have this" on a spice page | `src/islands/spices/OwnToggle.tsx` |
| Styles for the whole section | `src/styles/spices.css`, loaded by `src/layouts/SpicesLayout.astro` so no page can miss them |

**Behaviour.** Tick boxes save to this browser only. Search matches the name and every Aka. Filters: kind of spice (any of several), one cuisine (a Global spice matches every cuisine), "Go easy" (Power 4 and 5), and All, In my cabinet, Not in my cabinet. Select all shown and Deselect all shown act only on what the filters show. Clear my cabinet shows an Undo until the next change. Spices saved earlier that no longer exist are listed under "No longer in the library" with a button to forget them. If the browser refuses to save, the page says so.

**Things to know.**
- The server renders an empty cabinet, so a saved tick appears a moment after the page loads. This is what stops the server and browser disagreeing on first paint.
- Used-in lists on a spice page show blend names as plain text. They become links in Phase 6, when blend pages exist.
- Blend suggestions based on the cabinet arrive in Phase 7. The staples switch is saved now and does nothing visible yet except mark the pantry staples.

---

## 18. Phase 6: browsing blends

**What exists now.** `/spices/blends` (browse) and one page per blend at `/spices/blends/<slug>` (72 pages). The Spices hub, the section's sub-navigation, the sitemap and each spice page ("Used in these blends") now link to them. The whole site builds 160 pages.

**Browse filters.** Search (name, aka and every ingredient), Goes with (a whole food group or one item), Cuisine (a Global blend matches every cuisine), How it is used and How it is cooked (several choices match any of them). Different filters must all match. With a food chosen, blends that list it show as **Strong fit** (classic) or **Good fit** (also works) and come first, then A to Z; blends that do not mention it are hidden unless "Show blends that do not mention it" is on. A blend naming a whole group suits every item in it, and a blend naming one item suits only that item. The rules live in `src/lib/spices/blend-filter.ts`, with 16 tests.

**A blend page** shows the ingredients with their parts (and "any kind works" where a family is named, and "nice to have" for optional ones), a "Go easy" note for Power 4 and 5 spices, the allergens worked out from the ingredients with the line "Check labels, this is not a complete allergen guide", the typical version, confidence, doubt and sources.

**Not yet.** Nothing here looks at the cabinet. Ready now, Missing one and the finder come in Phase 7. A note for anyone writing blend files: a food whose name has a comma ("Sandwiches, tacos and wraps") must be written by an alias such as "taco", because the list is split at commas. That is in `docs/spice-formats.txt`.

---

## 19. Phase 7: the finder

**What exists now.** `/spices/finder` ("What can I make?"), linked from the Spices hub and the section's sub-navigation and listed in the sitemap. It reuses the blend browser (search, Goes with, Cuisine, use and method chips) and adds the cabinet on top. The whole site builds 161 pages.

**What it does with your cabinet.** Each blend card says **Ready now**, **Missing one**, **Missing two** or **Missing three or more**, names what is missing, and lists optional spices as "Nice to have". The rules are plan section 9: a line naming a family is met by the umbrella or any variety; a line naming one variety is met only by that variety; optional lines never block anything; salt, black pepper and sugar count as owned while the staples switch (on this page too) is on. If you own another variety of a missing one, the card adds a gentle "close, but not the same" line, and the status does not change.

**Order.** *Best match* puts fit to the chosen food first, then status, then A to Z. *Ready first* puts status first, then fit. With no food chosen the fit part is skipped, and with no spices ticked the status part is skipped, so an empty cabinet gives A to Z. "What I can make" hides blends missing more than one, two, or any.

**Tests.** `src/lib/spices/finder.test.ts` (19 tests) covers eggs, a family match, a specific-spice miss with its hint, an optional ingredient, classic against also-works order in both sort modes, the staples switch, and the empty-cabinet and no-food cases. "Select all shown with a filter on" was already covered in `library.test.ts` in Phase 5.

**Not yet.** Top picks, Buy next and the shopping list are Phase 8.

---

## 20. Phase 8: Top picks, Buy next and the shopping list

**What exists now.** The Spices home has two live panels under the cards, a new page at `/spices/list`, an "Add to shopping list" button on every spice page, and an "Add missing spices" button on every blend page. The sub-navigation and the sitemap include the list. The whole site builds 162 pages.

**Top picks.** Worked out in the browser from the saved cabinet, from the blends that are Ready now. Each food scores 2 for a classic pairing and 1 for an also-works one (a food named both ways in one blend counts once, as classic). The top 8 foods and top 5 cuisines show with counts such as "3 ready blends". `Global` is not a cuisine here. Each one links to the finder already filtered (`/spices/finder?food=g:eggs` or `?cuisine=Indian`). With an empty cabinet the panel says how to start, and with nothing ready it points to Buy next.

**Buy next.** Among blends missing one or two required spices, it counts for each missing spice how many blends that spice would complete on its own ("would unlock 3 blends") and, separately, how many blends missing exactly two it would bring one spice away. I split these because one spice does not finish a blend that is missing two, and saying it "unlocks" them would be untrue. Staples are always treated as owned here, so salt is never suggested, and optional spices are never counted. Top 10, each with an Add to list button.

**The shopping list.** Add from Buy next, a spice page, or a blend page. Tick items off in the shop, "Bought it" moves one into the cabinet, "Move ticked to my cabinet" moves all the ticked ones, Copy list gives plain text (`[ ] Cumin`), and Print hides the buttons. Saved in the browser as spice filenames (key `spices.shopping`), with the same try/catch handling as the cabinet. Saved items that no longer exist in the library are listed rather than dropped.

**Tests.** `src/lib/spices/shopping.test.ts` (16 tests) covers the list rules and the counts: foods 2 and 1, cuisines, the 8 / 5 / 10 limits, staples and optional spices never suggested, and the unlock against closer split.

**Not yet.** "Copy my cabinet" and "Paste a list", the count badge in the main nav, and the phone summary bar are left for Phase 9 with the rest of the polish. The finder reads `?food=` and `?cuisine=` on load but does not write the URL back as you change filters, so sharing a view you built by hand is not possible yet.
