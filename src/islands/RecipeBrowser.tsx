/* ---------------------------------------------------------------------------
   The home page browser: search, three filters, the result count, the empty
   state, and the card grid.

   This is one island rather than several because all of it shares one piece of
   state. The grid is inside it for the same reason: a React component cannot
   cleanly show and hide DOM nodes it does not own, and reaching out to toggle
   attributes on Astro-rendered elements would be worse than just owning them.

   That costs nothing, because Astro server-renders this component to real HTML
   at build time and then hydrates it in place. The cards are in the page
   source, they are indexable, and they paint with the rest of the page. There
   is nothing to wait for and so nothing to put a loading skeleton over.

   Filtering is a plain array filter over data that is already in the page. No
   search library, no network, no debounce on the filtering itself.
   --------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import RecipeCard from "./RecipeCard";
import {
  EMPTY_FILTERS,
  MEAL_ORDER,
  hasAnyFilter,
  type Filters,
  type RecipeCardData,
} from "./recipe-types";
import { filtersToSearch, searchToFilters } from "./recipe-url";

interface Props {
  recipes: RecipeCardData[];
}

export default function RecipeBrowser({ recipes }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  /* ---- The filter options come from the recipes themselves --------------
     A new cuisine in a recipe file automatically becomes a new filter option,
     with no list to maintain anywhere. */

  const cuisines = useMemo(
    () =>
      [...new Set(recipes.map((recipe) => recipe.cuisine))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [recipes],
  );

  const meals = useMemo(() => {
    const present = new Set(recipes.flatMap((recipe) => recipe.meals));
    // Canonical order, not alphabetical, so the chips read breakfast to
    // dessert and never reshuffle as the collection grows.
    return MEAL_ORDER.filter((meal) => present.has(meal));
  }, [recipes]);

  const healthyCount = useMemo(
    () => recipes.filter((recipe) => recipe.healthy).length,
    [recipes],
  );

  /* ---- URL <-> state ----------------------------------------------------
     The server has no idea what query string the visitor arrived with, so it
     renders the unfiltered grid and we apply the URL on mount. */

  const mounted = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const readUrl = useCallback(
    () => searchToFilters(window.location.search, cuisines, [...meals]),
    [cuisines, meals],
  );

  useEffect(() => {
    const fromUrl = readUrl();
    if (hasAnyFilter(fromUrl)) setFilters(fromUrl);
    mounted.current = true;

    // The back and forward buttons move between filter states.
    const onPopState = () => {
      // A debounced URL rewrite may still be queued from typing. Left alone it
      // fires after the back press and stamps the old query onto the new
      // entry, so the URL and the visible filters disagree.
      clearTimeout(searchTimer.current);
      setFilters(readUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readUrl]);

  /**
   * Apply a change and record it in the URL.
   *
   * `mode` matters. Toggling a filter pushes a history entry, so the back
   * button undoes that one filter, which is what you expect. Typing in the
   * search box replaces instead, and only after a pause, because pushing an
   * entry per keystroke would turn the back button into forty presses to
   * escape one word.
   */
  const apply = useCallback((next: Filters, mode: "push" | "replace") => {
    setFilters(next);
    if (!mounted.current) return;

    const url = `${window.location.pathname}${filtersToSearch(next)}`;

    clearTimeout(searchTimer.current);

    if (mode === "push") {
      // Do not stack identical entries.
      if (url !== window.location.pathname + window.location.search) {
        window.history.pushState(null, "", url);
      }
      return;
    }

    searchTimer.current = setTimeout(() => {
      window.history.replaceState(null, "", url);
    }, 250);
  }, []);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  /* ---- Handlers --------------------------------------------------------- */

  const setQuery = (query: string) => apply({ ...filters, query }, "replace");

  const toggle = (key: "cuisines" | "meals", value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    apply({ ...filters, [key]: next }, "push");
  };

  const toggleHealthy = () =>
    apply({ ...filters, healthyOnly: !filters.healthyOnly }, "push");

  /**
   * Clearing removes the button that cleared, and a focused element leaving
   * the DOM drops focus to the body, so the next Tab restarts from the top of
   * the page. Land on the count line instead: it is the thing that just
   * changed, and it does not disappear.
   */
  const countRef = useRef<HTMLParagraphElement>(null);

  const clearAll = () => {
    apply(EMPTY_FILTERS, "push");
    countRef.current?.focus();
  };

  /* ---- Filtering --------------------------------------------------------
     All four combine: a recipe has to satisfy every active filter. Within one
     filter, several selections are an OR, so picking Indian and Thai shows
     both rather than nothing. */

  const needle = filters.query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      recipes.filter((recipe) => {
        if (needle.length > 0 && !recipe.searchText.includes(needle)) return false;
        if (filters.cuisines.length > 0 && !filters.cuisines.includes(recipe.cuisine)) {
          return false;
        }
        if (
          filters.meals.length > 0 &&
          !recipe.meals.some((meal) => filters.meals.includes(meal))
        ) {
          return false;
        }
        if (filters.healthyOnly && !recipe.healthy) return false;
        return true;
      }),
    [recipes, needle, filters.cuisines, filters.meals, filters.healthyOnly],
  );

  const filtering = hasAnyFilter(filters);
  const total = recipes.length;

  const countText = filtering
    ? `Showing ${visible.length} of ${total} recipe${total === 1 ? "" : "s"}`
    : `${total} recipe${total === 1 ? "" : "s"}`;

  /**
   * The same sentence, but lagging.
   *
   * Filtering is instant and the visible number updates on the same frame as
   * the keystroke, which is the point. But a live region holding that number
   * announces the whole sentence per character, so typing "tomato" queued six
   * announcements and drowned out the typing echo. The visible count stays
   * immediate; only the announced copy waits for you to stop typing.
   */
  const [announced, setAnnounced] = useState(countText);

  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(countText), 600);
    return () => clearTimeout(timer);
  }, [countText]);

  return (
    <div className="browser">
      <search role="search" className="browser__controls">
        <div className="browser__search">
          <label className="browser__label" htmlFor="recipe-search">
            Search by name or ingredient
          </label>
          <input
            id="recipe-search"
            name="recipe-search"
            className="browser__input"
            type="search"
            value={filters.query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="tomato, chicken, lemon…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {cuisines.length > 1 && (
          <FilterGroup
            legend="Cuisine"
            options={cuisines}
            selected={filters.cuisines}
            onToggle={(value) => toggle("cuisines", value)}
          />
        )}

        {meals.length > 1 && (
          <FilterGroup
            legend="Meal"
            options={[...meals]}
            selected={filters.meals}
            onToggle={(value) => toggle("meals", value)}
          />
        )}

        {healthyCount > 0 && (
          <fieldset className="browser__group">
            <legend className="browser__legend">Healthy</legend>
            <div className="browser__chips">
              <button
                type="button"
                className={`chip${filters.healthyOnly ? " is-active" : ""}`}
                aria-pressed={filters.healthyOnly}
                onClick={toggleHealthy}
              >
                Healthy only
              </button>
            </div>
          </fieldset>
        )}
      </search>

      <div className="browser__status">
        {/* The visible count, which updates on the same frame as the
            keystroke. Focusable so "Clear filters" has somewhere to land. */}
        <p ref={countRef} tabIndex={-1} className="browser__count">
          {countText}
        </p>

        {/* The announced copy. Separate, so a screen reader hears the result
            once you stop typing rather than once per character. Without any
            live region at all, someone filtering by keyboard gets no feedback:
            the list just silently becomes shorter somewhere below them. */}
        <p className="visually-hidden" role="status">
          {announced}
        </p>

        {filtering && (
          <button type="button" className="browser__clear" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <ul className="browser__grid" role="list">
          {visible.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </ul>
      ) : (
        <div className="browser__empty">
          <h2 className="browser__empty-title">Nothing matches that</h2>
          <p className="browser__empty-text">
            {needle.length > 0 ? (
              <>
                No recipe has <strong>{filters.query.trim()}</strong> in its name
                or its ingredients
                {filters.cuisines.length > 0 ||
                filters.meals.length > 0 ||
                filters.healthyOnly
                  ? ", with the other filters you have on."
                  : "."}
              </>
            ) : (
              <>No recipe matches all of the filters you have on at once.</>
            )}
          </p>
          <button type="button" className="button" onClick={clearAll}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

/* ---- A group of filter chips --------------------------------------------- */

interface FilterGroupProps {
  legend: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

function FilterGroup({ legend, options, selected, onToggle }: FilterGroupProps) {
  return (
    <fieldset className="browser__group">
      <legend className="browser__legend">{legend}</legend>
      <div className="browser__chips">
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`chip${isActive ? " is-active" : ""}`}
              // aria-pressed is what tells a screen reader this is a toggle
              // and whether it is currently on. The visual state is weight and
              // a filled background, never colour on its own.
              aria-pressed={isActive}
              onClick={() => onToggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
