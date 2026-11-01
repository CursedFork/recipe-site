/* ---------------------------------------------------------------------------
   Browsing blends: search, cuisine, how it is used, how it is cooked, and what
   it goes with.

   Server-rendered with everything showing, then hydrated. On the plain blends
   page nothing here looks at the cabinet. On the finder page (the "finder"
   prop) each blend also says whether the saved cabinet can make it.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useState } from "react";

import { setStaples } from "../../lib/spices/cabinet";
import {
  ownedSet,
  rankForCabinet,
  statusOf,
  statusLabel,
  type BlendStatus,
  type FinderBlend,
  type SortMode,
} from "../../lib/spices/finder";
import { getCabinet, setCabinet, useCabinet } from "./cabinet-store";

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
  /** Present on the finder page only. */
  finder?: {
    /** Slugs the staples switch stands for. */
    stapleSlugs: string[];
    /** The names to say in the staples note: "salt, black pepper and sugar". */
    stapleNote: string;
  };
}

/** The most missing spices a blend may have and still be listed. */
const MISSING_CHOICES: Array<{ value: string; label: string }> = [
  { value: "", label: "Any" },
  { value: "0", label: "Ready now only" },
  { value: "1", label: "Missing one or fewer" },
  { value: "2", label: "Missing two or fewer" },
];

const FIT_WORDS: Record<Fit, string> = {
  classic: "Strong fit",
  also: "Good fit",
};

interface Card {
  blend: LibraryBlend;
  fit: Fit | null;
  status: BlendStatus | null;
}

export default function BlendBrowser({ blends, cuisines, uses, methods, foodGroups, finder }: Props) {
  const cabinet = useCabinet();
  const [filters, setFilters] = useState<BlendFilters>(noBlendFilters);
  const [sort, setSort] = useState<SortMode>("best");
  const [maxMissing, setMaxMissing] = useState("");

  // A link from Top picks arrives as ?food=g:eggs or ?cuisine=Indian. It is read
  // once after hydration, so the server and first client render still match.
  useEffect(() => {
    if (!finder) return;
    const params = new URLSearchParams(window.location.search);
    const food = decodePick(params.get("food") ?? "");
    const cuisine = params.get("cuisine") ?? "";
    if (food || cuisines.includes(cuisine)) {
      setFilters((current) => ({
        ...current,
        food: food ?? current.food,
        cuisine: cuisines.includes(cuisine) ? cuisine : current.cuisine,
      }));
    }
  }, [finder, cuisines]);

  const owned = useMemo(
    () => ownedSet(cabinet.owned, cabinet.staples, finder?.stapleSlugs ?? []),
    [cabinet.owned, cabinet.staples, finder],
  );
  const cabinetEmpty = cabinet.owned.length === 0;

  /** Blends the whole library can make now, whatever the filters say. */
  const readyCount = useMemo(
    () => (finder ? blends.filter((blend) => statusOf(blend as FinderBlend, owned).missing.length === 0).length : 0),
    [blends, finder, owned],
  );

  const results: Card[] = useMemo(() => {
    const matched = filterBlends(blends, filters);
    if (!finder) return matched.map((r) => ({ ...r, status: null }));
    return rankForCabinet(matched, owned, cabinetEmpty, sort, maxMissing === "" ? null : Number(maxMissing));
  }, [blends, filters, finder, owned, cabinetEmpty, sort, maxMissing]);
  const change = (patch: Partial<BlendFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const toggle = (key: "uses" | "methods", value: string) =>
    change({
      [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value],
    });

  return (
    <div className="lib">
      {finder && (
        <div className="lib__staples">
          <label className="lib__switch">
            <input
              type="checkbox"
              checked={cabinet.staples}
              onChange={(event) => setCabinet(setStaples(getCabinet(), event.target.checked))}
            />
            <span>
              Assume I have {finder.stapleNote}
              <span className="lib__hint"> Most kitchens do. Your choice is saved in this browser.</span>
            </span>
          </label>
          <p className="lib__hint">
            {cabinetEmpty
              ? "Your cabinet is empty, so every blend is listed A to Z."
              : `You have ticked ${cabinet.owned.length} ${cabinet.owned.length === 1 ? "spice" : "spices"}.`}{" "}
            <a href="/spices/library">Tick spices in the library</a>
          </p>
        </div>
      )}

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

        {finder && (
          <div className="lib__row-controls">
            <div className="browser__search">
              <label className="browser__label" htmlFor="blend-sort">
                Order
              </label>
              <select
                id="blend-sort"
                className="browser__input"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
              >
                <option value="best">Best match</option>
                <option value="ready">Ready first</option>
              </select>
            </div>
            <div className="browser__search">
              <label className="browser__label" htmlFor="blend-missing">
                What I can make
              </label>
              <select
                id="blend-missing"
                className="browser__input"
                value={maxMissing}
                onChange={(event) => setMaxMissing(event.target.value)}
              >
                {MISSING_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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

      {finder && !cabinetEmpty && (
        <a className="finder__summary" href="#finder-results">
          {cabinet.owned.length} {cabinet.owned.length === 1 ? "spice" : "spices"}, {readyCount}{" "}
          {readyCount === 1 ? "blend" : "blends"} ready. Jump to results
        </a>
      )}

      <div className="lib__status" id="finder-results">
        <p className="browser__count" aria-live="polite">
          Showing {results.length} of {blends.length} blends.
        </p>
        {(isFilteringBlends(filters) || maxMissing !== "") && (
          <div className="lib__actions">
            <button
              type="button"
              className="browser__clear"
              onClick={() => {
                setFilters(noBlendFilters);
                setMaxMissing("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="browser__empty">
          <p className="browser__empty-title">No blends match.</p>
          <p className="browser__empty-text">Try fewer filters, or a different word.</p>
          <button
            type="button"
            className="button"
            onClick={() => {
              setFilters(noBlendFilters);
              setMaxMissing("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="lib__list blend-grid" role="list">
          {results.map(({ blend, fit, status }) => (
            <li key={blend.slug} className="blend-card">
              <a className="lib__name" href={`/spices/blends/${blend.slug}`}>
                {blend.name}
              </a>
              <p className="lib__meta">
                {status && !cabinetEmpty && (
                  <span className="lib__tag">{statusLabel(status.missing.length)}</span>
                )}
                {fit && <span className="lib__tag">{FIT_WORDS[fit]}</span>}
                <span>{blend.cuisines.slice(0, 3).join(", ")}</span>
              </p>
              <p className="lib__flavor">
                {blend.uses.join(", ")}. {blend.ingredientCount} spices.
              </p>
              {status && !cabinetEmpty && status.missing.length > 0 && (
                <p className="lib__flavor">Missing: {status.missing.map((i) => i.name).join("; ")}</p>
              )}
              {status && !cabinetEmpty && status.hints.map((hint) => (
                <p key={hint.missing} className="lib__flavor">
                  You have {hint.have}, which is close to {hint.missing}, but not the same.
                </p>
              ))}
              {status && !cabinetEmpty && status.niceToHave.length > 0 && (
                <p className="lib__flavor">Nice to have: {status.niceToHave.map((i) => i.name).join("; ")}</p>
              )}
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
