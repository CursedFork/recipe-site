/* ---------------------------------------------------------------------------
   The map page: a world map, a list of every place with recipes, and the
   recipes for whatever is selected.

   On accessibility, which the spec singles out because maps routinely fail it.

   The list beside the map is not a fallback. It is the primary control, and it
   is where the keyboard and a screen reader live. Every place with recipes is
   a real button in it, with its count in the text.

   The map itself is the pointer shortcut. Its 176 country shapes are
   deliberately NOT in the tab order: tabbing through 176 mostly-empty
   countries to reach India would be worse than useless, and the list already
   offers every one of them in two keystrokes. So the map carries a role and a
   label describing what it shows, and the list does the work.

   Colour is never the only signal. A country with recipes is filled in the
   accent AND drawn with a heavier outline, and the count is written in the
   list as text.
   --------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MapShape, Place } from "./map-types";

interface Props {
  shapes: MapShape[];
  places: Place[];
  width: number;
  height: number;
  /** Countries in the lookup with no shape at this map scale. */
  missingShapes: Array<{ alpha3: string; name: string }>;
}

export default function WorldMap({
  shapes,
  places,
  width,
  height,
  missingShapes,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const byKey = useMemo(
    () => new Map(places.map((place) => [place.key, place])),
    [places],
  );

  /** Every alpha-3 that has at least one recipe, for colouring the map. */
  const codesWithRecipes = useMemo(() => {
    const set = new Set<string>();
    for (const place of places) for (const code of place.codes) set.add(code);
    return set;
  }, [places]);

  /** The alpha-3 codes covered by the current selection. */
  const selectedCodes = useMemo(() => {
    if (selectedKey === null) return new Set<string>();
    const place = byKey.get(selectedKey);
    return new Set(place ? place.codes : []);
  }, [selectedKey, byKey]);

  /** Which country a shape belongs to, as a place, if any. */
  const placeForCode = useMemo(() => {
    const map = new Map<string, Place>();
    // A country's own entry wins over a group that merely contains it, so
    // clicking India shows India rather than all of South Asia.
    for (const place of places) {
      if (place.kind === "group") {
        for (const code of place.codes) if (!map.has(code)) map.set(code, place);
      }
    }
    for (const place of places) {
      if (place.kind === "country") map.set(place.codes[0], place);
    }
    return map;
  }, [places]);

  /* ---- Selection lives in the URL, so a view can be shared ------------- */

  const readUrl = useCallback(() => {
    const key = new URLSearchParams(window.location.search).get("region");
    return key !== null && byKey.has(key) ? key : null;
  }, [byKey]);

  useEffect(() => {
    setSelectedKey(readUrl());
    const onPopState = () => setSelectedKey(readUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readUrl]);

  const select = (key: string | null) => {
    setSelectedKey(key);
    const url =
      key === null
        ? window.location.pathname
        : `${window.location.pathname}?region=${encodeURIComponent(key)}`;
    window.history.pushState(null, "", url);
  };

  const selected = selectedKey === null ? null : byKey.get(selectedKey) ?? null;

  const countries = places.filter((place) => place.kind === "country");
  const groups = places.filter((place) => place.kind === "group");

  const totalPlaces = places.length;

  return (
    <div className="map">
      {/*
        role="img" with a label, because as a whole this is a picture of where
        the recipes come from. Its individual shapes are a pointer convenience;
        the list below is the equivalent that works with a keyboard.
      */}
      <div className="map__figure">
        <svg
          className="map__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`World map. ${totalPlaces} place${
            totalPlaces === 1 ? "" : "s"
          } have recipes, highlighted. The list below the map gives the same places as buttons.`}
        >
          {shapes.map((shape, index) => {
            const has = shape.alpha3 !== null && codesWithRecipes.has(shape.alpha3);
            const isSelected =
              shape.alpha3 !== null && selectedCodes.has(shape.alpha3);
            const place = shape.alpha3 ? placeForCode.get(shape.alpha3) : undefined;

            const className = [
              "map__country",
              has ? "has-recipes" : "",
              isSelected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <path
                key={`${shape.alpha3 ?? shape.name}-${index}`}
                className={className}
                d={shape.d}
                onClick={place ? () => select(place.key) : undefined}
              />
            );
          })}
        </svg>

        {selected !== null && (
          <button type="button" className="map__clear" onClick={() => select(null)}>
            Clear selection
          </button>
        )}
      </div>

      <div className="map__panel">
        <section aria-labelledby="places-heading">
          <h2 id="places-heading">Where these recipes come from</h2>
          <p className="map__intro">
            {totalPlaces === 0 ? (
              // Every recipe needs a Regions line, so this only happens on an
              // empty collection. Still worth saying something true.
              <>
                No recipes yet. Once there are some, the places they come from
                show up here and on the map.
              </>
            ) : (
              <>
                {totalPlaces} place{totalPlaces === 1 ? "" : "s"} so far. Choose
                one to see its recipes, on the map or in this list.
              </>
            )}
          </p>

          {countries.length > 0 && (
            <>
              <h3 className="map__list-heading">Countries</h3>
              <ul className="map__list">
                {countries.map((place) => (
                  <PlaceButton
                    key={place.key}
                    place={place}
                    selected={place.key === selectedKey}
                    onSelect={select}
                  />
                ))}
              </ul>
            </>
          )}

          {groups.length > 0 && (
            <>
              <h3 className="map__list-heading">Regions</h3>
              <ul className="map__list">
                {groups.map((place) => (
                  <PlaceButton
                    key={place.key}
                    place={place}
                    selected={place.key === selectedKey}
                    onSelect={select}
                  />
                ))}
              </ul>
            </>
          )}

          {missingShapes.length > 0 && (
            <p className="map__note text-small text-muted">
              {missingShapes.map((c) => c.name).join(", ")}{" "}
              {missingShapes.length === 1 ? "is" : "are"} too small to draw at this
              map&rsquo;s scale, so {missingShapes.length === 1 ? "it has" : "they have"}{" "}
              no shape to click. {missingShapes.length === 1 ? "It is" : "They are"}{" "}
              still in the list above.
            </p>
          )}
        </section>

        {/* The selected place's recipes. A live region, because on a phone the
            map is above this and the change would otherwise go unannounced. */}
        <section className="map__results" aria-live="polite" aria-labelledby="results-heading">
          {selected === null ? (
            <>
              <h2 id="results-heading" className="visually-hidden">
                Selected place
              </h2>
              <p className="map__empty">
                Nothing selected yet. Pick a country or a region to see what has
                been cooked from there.
              </p>
            </>
          ) : (
            <>
              <h2 id="results-heading">
                {selected.name}
                <span className="map__count">
                  {" "}
                  {selected.recipes.length} recipe
                  {selected.recipes.length === 1 ? "" : "s"}
                </span>
              </h2>
              <ul className="map__recipes">
                {selected.recipes.map((recipe) => (
                  <li key={recipe.slug}>
                    <a href={`/recipes/${recipe.slug}`}>{recipe.title}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---- One place in the list ----------------------------------------------- */

function PlaceButton({
  place,
  selected,
  onSelect,
}: {
  place: Place;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`map__place${selected ? " is-selected" : ""}`}
        // A toggle-style control whose state must be readable, not inferred
        // from colour.
        aria-pressed={selected}
        onClick={() => onSelect(place.key)}
      >
        <span className="map__place-name">{place.name}</span>
        {/* The count is text, so it never depends on the map's colours. */}
        <span className="map__place-count">
          {place.recipes.length}
          <span className="visually-hidden">
            {" "}
            recipe{place.recipes.length === 1 ? "" : "s"}
          </span>
        </span>
      </button>
    </li>
  );
}
