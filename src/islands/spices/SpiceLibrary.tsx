/* ---------------------------------------------------------------------------
   The spice library: tick what you have, search, filter, jump by letter.

   Server-rendered with an empty cabinet, then hydrated, so the full list is
   readable before any JavaScript. The saved cabinet arrives a moment after.

   Nothing here fetches anything. The cabinet lives in this browser only.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";

import {
  addMany,
  clearOwned,
  removeMany,
  setOwned,
  setStaples,
  unknownOwned,
  type Cabinet,
} from "../../lib/spices/cabinet";
import {
  filterSpices,
  groupByLetter,
  isFiltering,
  noFilters,
  type Filters,
  type LibrarySpice,
  type View,
} from "../../lib/spices/library-filter";
import { getCabinet, setCabinet, useCabinet } from "./cabinet-store";
import Meter from "./Meter";

interface Props {
  spices: LibrarySpice[];
  categories: string[];
  cuisines: string[];
  /** Slugs the staples switch stands for. */
  stapleSlugs: string[];
  /** The names to say in the staples note: "salt, black pepper and sugar". */
  stapleNote: string;
}

const VIEWS: Array<{ value: View; label: string }> = [
  { value: "all", label: "All spices" },
  { value: "owned", label: "In my cabinet" },
  { value: "missing", label: "Not in my cabinet" },
];

export default function SpiceLibrary({ spices, categories, cuisines, stapleSlugs, stapleNote }: Props) {
  const cabinet = useCabinet();
  const [filters, setFilters] = useState<Filters>(noFilters);
  /** The cabinet as it was just before "Clear my cabinet", for Undo. */
  const [undo, setUndo] = useState<Cabinet | null>(null);

  const owned = useMemo(() => new Set(cabinet.owned), [cabinet.owned]);
  const known = useMemo(() => new Set(spices.map((spice) => spice.slug)), [spices]);
  const staples = useMemo(() => new Set(stapleSlugs), [stapleSlugs]);

  const shown = useMemo(() => filterSpices(spices, filters, owned), [spices, filters, owned]);
  const groups = useMemo(() => groupByLetter(shown), [shown]);
  const orphans = useMemo(() => unknownOwned(cabinet, known), [cabinet, known]);
  const ownedCount = cabinet.owned.length - orphans.length;

  const change = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  const toggleCategory = (category: string) =>
    change({
      categories: filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    });

  /* Every change to the cabinet goes through the live store, read fresh, so
     two quick clicks never act on a stale copy. Any new change also retires
     the Undo, which only ever means "undo the clear". */
  const edit = (update: (current: Cabinet) => Cabinet) => {
    setUndo(null);
    setCabinet(update(getCabinet()));
  };

  const shownSlugs = shown.map((spice) => spice.slug);
  const allShownOwned = shown.length > 0 && shown.every((spice) => owned.has(spice.slug));
  const noneShownOwned = shown.every((spice) => !owned.has(spice.slug));

  const clearCabinet = () => {
    const before = getCabinet();
    setCabinet(clearOwned(before));
    setUndo(before);
  };

  const undoClear = () => {
    if (undo) setCabinet(undo);
    setUndo(null);
  };

  return (
    <div className="lib">
      {/* ---- Staples ----------------------------------------------------- */}
      <div className="lib__staples">
        <label className="lib__switch">
          <input
            type="checkbox"
            checked={cabinet.staples}
            onChange={(event) => edit((current) => setStaples(current, event.target.checked))}
          />
          <span>
            Assume I have {stapleNote}
            <span className="lib__hint">
              {" "}
              Most kitchens do. This only affects what the blend pages tell you later.
            </span>
          </span>
        </label>
      </div>

      {/* ---- Controls ---------------------------------------------------- */}
      <div className="browser__controls">
        <div className="browser__search">
          <label className="browser__label" htmlFor="spice-search">
            Search spices
          </label>
          <input
            id="spice-search"
            className="browser__input"
            type="search"
            value={filters.query}
            onChange={(event) => change({ query: event.target.value })}
            autoComplete="off"
            placeholder="Try cumin, or dried poblano"
          />
        </div>

        <fieldset className="browser__group">
          <legend className="browser__legend">Show</legend>
          <div className="browser__chips">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip${filters.view === option.value ? " is-active" : ""}`}
                aria-pressed={filters.view === option.value}
                onClick={() => change({ view: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="browser__group">
          <legend className="browser__legend">Kind of spice</legend>
          <div className="browser__chips">
            {categories.map((category) => {
              const active = filters.categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  className={`chip${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="lib__row-controls">
          <div className="browser__search">
            <label className="browser__label" htmlFor="spice-cuisine">
              Cuisine
            </label>
            <select
              id="spice-cuisine"
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

          <button
            type="button"
            className={`chip${filters.goEasy ? " is-active" : ""}`}
            aria-pressed={filters.goEasy}
            onClick={() => change({ goEasy: !filters.goEasy })}
          >
            Go easy: Power 4 and 5 only
          </button>
        </div>
      </div>

      {/* ---- Status and bulk actions ------------------------------------- */}
      <div className="lib__status">
        <p className="browser__count" aria-live="polite">
          Showing {shown.length} of {spices.length} spices. {ownedCount} in your cabinet.
        </p>

        <div className="lib__actions">
          <button
            type="button"
            className="button button--quiet"
            disabled={shown.length === 0 || allShownOwned}
            onClick={() => edit((current) => addMany(current, shownSlugs))}
          >
            Select all shown
          </button>
          <button
            type="button"
            className="button button--quiet"
            disabled={shown.length === 0 || noneShownOwned}
            onClick={() => edit((current) => removeMany(current, shownSlugs))}
          >
            Deselect all shown
          </button>
          <button
            type="button"
            className="button button--quiet"
            disabled={cabinet.owned.length === 0}
            onClick={clearCabinet}
          >
            Clear my cabinet
          </button>
          {isFiltering(filters) && (
            <button type="button" className="browser__clear" onClick={() => setFilters(noFilters)}>
              Clear filters
            </button>
          )}
        </div>

        {/* A polite live region, always present so the announcement fires. */}
        <div className="lib__notice" role="status">
          {undo && (
            <p>
              Cabinet cleared.{" "}
              <button type="button" className="browser__clear" onClick={undoClear}>
                Undo
              </button>
            </p>
          )}
          {cabinet.saveFailed && (
            <p>
              Your browser is not letting this page save, so your cabinet will be forgotten when you leave.
            </p>
          )}
        </div>
      </div>

      {/* ---- Jump to a letter -------------------------------------------- */}
      {groups.length > 1 && (
        <nav className="lib__letters" aria-label="Jump to a letter">
          {groups.map((group) => (
            <a key={group.letter} href={`#letter-${group.letter}`} className="lib__letter">
              {group.letter}
            </a>
          ))}
        </nav>
      )}

      {/* ---- The list ---------------------------------------------------- */}
      {shown.length === 0 ? (
        <div className="browser__empty">
          <p className="browser__empty-title">No spices match.</p>
          <p className="browser__empty-text">Try fewer filters, or a different word.</p>
          <button type="button" className="button" onClick={() => setFilters(noFilters)}>
            Clear filters
          </button>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.letter} id={`letter-${group.letter}`} className="lib__group">
            <h2 className="lib__letter-head">{group.letter}</h2>
            <ul className="lib__list" role="list">
              {group.spices.map((spice) => {
                const has = owned.has(spice.slug);
                const isStaple = cabinet.staples && staples.has(spice.slug);
                return (
                  <li key={spice.slug} className={`lib__item${spice.familySlug ? " is-member" : ""}`}>
                    <label className="lib__check">
                      <input
                        type="checkbox"
                        checked={has}
                        onChange={(event) => edit((current) => setOwned(current, spice.slug, event.target.checked))}
                      />
                      <span className="visually-hidden">I have {spice.name}</span>
                    </label>

                    <div className="lib__body">
                      <a className="lib__name" href={`/spices/library/${spice.slug}`}>
                        {spice.label}
                      </a>
                      <p className="lib__meta">
                        <span>{spice.category}</span>
                        {isStaple && <span className="lib__tag">Pantry staple, assumed</span>}
                      </p>
                      {spice.flavor.length > 0 && (
                        <p className="lib__flavor">{spice.flavor.slice(0, 3).join(", ")}</p>
                      )}
                    </div>

                    <div className="lib__meters">
                      {spice.power !== null && <Meter kind="power" value={spice.power} compact />}
                      {spice.heat !== null && spice.heat > 0 && <Meter kind="heat" value={spice.heat} compact />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* ---- Saved spices that no longer exist ---------------------------- */}
      {orphans.length > 0 && (
        <div className="lib__orphans">
          <h2 className="lib__letter-head">No longer in the library</h2>
          <p>
            These were saved in your cabinet, but the spice has been renamed or removed: {orphans.join(", ")}.
          </p>
          <button
            type="button"
            className="button button--quiet"
            onClick={() => edit((current) => removeMany(current, orphans))}
          >
            Forget these
          </button>
        </div>
      )}
    </div>
  );
}
