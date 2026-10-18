# Notes for anyone working on this codebase

This replaces the boilerplate the Astro scaffold wrote here, which described a
generic Astro project rather than this one and pointed at guides for Tailwind,
content collections and i18n that this site deliberately does not use.

## What this is

A personal recipe website. Andrew adds a recipe by dropping a `.txt` file into
`/recipes` and pushing. Vercel rebuilds.

No database, no login, no admin page, no API, and no server at runtime.
Everything is prerendered to static HTML. If a change seems to need any of
those, it is a misreading of the project. Ask first.

`README.md` is the file format and how to add a recipe. `DECISIONS.md` is why
things are the way they are, including the places where a tool's advice was
overruled and why.

## Commands

```bash
npm run dev      # dev server on http://localhost:4321
npm run build    # exactly what Vercel runs
npm test         # 40 tests over the fraction and unit maths
```

`npm run build` is the real check. A malformed recipe file must fail the build
with every problem listed at once, rather than deploying a broken site.

## Things that will catch you out

- **Do not read project files with `fs` plus `import.meta.url`.** Astro bundles
  the module first, so the path resolves inside `dist/`. Use `import.meta.glob`,
  which Vite resolves relative to the source file. `src/lib/load-recipes.ts` and
  `src/lib/photos.ts` both rely on this.
- **Do not put a long list in a thrown `Error` message.** Astro echoes a thrown
  message several times, so the list repeats in the build log. Print it once
  with `console.error` and keep the message short.
- **Styles used by more than one page belong in `global.css`.** A per-page
  stylesheet silently does nothing on the other pages. This has bitten once.
- **`src/config/site.ts` is the one file to edit** for the site name, the
  navigation and the URL. `astro.config.ts` reads the URL from it.
- On Windows, a build error exits 127 with a libuv assertion. That is an Astro
  quirk, not this code. It is still non-zero, so Vercel fails correctly.

## House rules this code follows

- Every icon-only button has **both** a visible tooltip on hover and focus
  **and** an `aria-label`. Neither replaces the other.
- Colour is never the only signal for a state.
- No stock photography, ever. Only photos Andrew supplies. The no-photo recipe
  card is the primary design, not a fallback.
- Skeleton loaders, client caching and optimistic rendering do not apply here,
  because the site is prerendered and has no mutations. Do not add fake loading
  states to satisfy a rule that has nothing to bite on.
