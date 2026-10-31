/* ---------------------------------------------------------------------------
   Browsing blends: search, cuisine, how it is used, how it is cooked, and what
   it goes with.

   Server-rendered with everything showing, then hydrated. Nothing here uses
   the saved cabinet yet: matching blends to what you own is the finder, which
   comes later.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";

import {
  decodePick,
  encodePick,
  filterBlends,
  isFilteringBlends,
  noBlendFilters,
  type BlendFilters,
  type Fit,
  type LibraryBlend,
} from "../../lib/spices/blend-filter";

export interface FoodGroup {
  id: string;
  name: string;
  items: Array<{ id: string; name: string }>;
}

interface Props {
  blends: LibraryBlend[];
  cuisines: string[];
  uses: string[];
  methods: string[];
  foodGroups: FoodGroup[];
}

const FIT_WORDS: Record<Fit, string> = {
  classic: "Strong fit",
  also: "Good fit",
};

export default function BlendBrowser({ blends, cuisines, uses, methods, foodGroups }: Props) {
  const [filters, setFilters] = useState<BlendFilters>(noBlendFilters);

  const results = useMemo(() => filterBlends(blends, filters), [blends, filters]);
  const change = (patch: Partial<BlendFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const toggle = (key: "uses" | "methods", value: string) =>
    change({
      [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value],
    });

  return (
    <div className="lib">
      <div className="browser__controls">
        <div className="browser__search">
          <label className="browser__label" htmlFor="blend-search">
            Search blends
          </label>
          <input
            id="blend-search"
            className="browser__input"
            type="search"
            value={filters.query}
            onChange={(event) => change({ query: event.target.value })}
            autoComplete="off"
            placeholder="Try garam masala, or clove"
          />
        </div>

        <div className="lib__row-controls">
          <div className="browser__search">
            <label className="browser__label" htmlFor="blend-food">
              Goes with
            </label>
            <select
              id="blend-food"
              className="browser__input"
              value={encodePick(filters.food)}
              onChange={(event) => change({ food: decodePick(event.target.value), showAll: false })}
            >
              <option value="">Any food</option>
              {foodGroups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  <option value={`g:${group.id}`}>All {group.name.toLowerCase()}</option>
                  {group.items.map((item) => (
                    <option key={item.id} value={`i:${group.id}:${item.id}`}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="browser__search">
            <label className="browser__label" htmlFor="blend-cuisine">
              Cuisine
            </label>
            <select
              id="blend-cuisine"
              className="browser__input"
              value={filters.cuisine}
              onChange={(event) => change({ cuisine: event.target.value })}
            >
              <option value="">Any cuisine</option>
              {cuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
          </div>

          {filters.food && (
            <button
              type="button"
              className={`chip${filters.showAll ? " is-active" : ""}`}
              aria-pressed={filters.showAll}
              onClick={() => change({ showAll: !filters.showAll })}
            >
              Show blends that do not mention it
            </button>
          )}
        </div>

        <fieldset className="browser__group">
          <legend className="browser__legend">How it is used</legend>
          <div className="browser__chips">
            {uses.map((use) => (
              <button
                key={use}
                type="button"
                className={`chip${filters.uses.includes(use) ? " is-active" : ""}`}
                aria-pressed={filters.uses.includes(use)}
                onClick={() => toggle("uses", use)}
              >
                {use}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="browser__group">
          <legend className="browser__legend">How it is cooked</legend>
          <div className="browser__chips">
            {methods.map((method) => (
              <button
                key={method}
                type="button"
                className={`chip${filters.methods.includes(method) ? " is-active" : ""}`}
                aria-pressed={filters.methods.includes(method)}
                onClick={() => toggle("methods", method)}
              >
                {method}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="lib__status">
        <p className="browser__count" aria-live="polite">
          Showing {results.length} of {blends.length} blends.
        </p>
        {isFilteringBlends(filters) && (
          <div className="lib__actions">
            <button type="button" className="browser__clear" onClick={() => setFilters(noBlendFilters)}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="browser__empty">
          <p className="browser__empty-title">No blends match.</p>
          <p className="browser__empty-text">Try fewer filters, or a different word.</p>
          <button type="button" className="button" onClick={() => setFilters(noBlendFilters)}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="lib__list blend-grid" role="list">
          {results.map(({ blend, fit }) => (
            <li key={blend.slug} className="blend-card">
              <a className="lib__name" href={`/spices/blends/${blend.slug}`}>
                {blend.name}
              </a>
              <p className="lib__meta">
                {fit && <span className="lib__tag">{FIT_WORDS[fit]}</span>}
                <span>{blend.cuisines.slice(0, 3).join(", ")}</span>
              </p>
              <p className="lib__flavor">
                {blend.uses.join(", ")}. {blend.ingredientCount} spices.
              </p>
              {blend.goEasy.length > 0 && (
                <p className="blend-card__easy">
                  Go easy: contains {blend.goEasy.map((s) => `${s.name.toLowerCase()} (Power ${s.power})`).join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
