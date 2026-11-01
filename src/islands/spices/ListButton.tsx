/* ---------------------------------------------------------------------------
   "Add to shopping list" on a spice page, and "Add missing spices" on a blend
   page. One small island for both: it is given the spices to add.

   A spice already in the cabinet is never added. On a blend page, what counts
   as missing is worked out from the saved cabinet in the browser, with the same
   rules as the finder.
   --------------------------------------------------------------------------- */

import { useMemo } from "react";

import { isCovered, ownedSet, type FinderIngredient } from "../../lib/spices/finder";
import { addToList, isOnList, removeFromList } from "../../lib/spices/shopping";
import { useCabinet } from "./cabinet-store";
import { getShopping, setShopping, useShopping } from "./shopping-store";

interface SpiceProps {
  kind: "spice";
  slug: string;
  name: string;
}

interface BlendProps {
  kind: "blend";
  ingredients: FinderIngredient[];
  stapleSlugs: string[];
}

export default function ListButton(props: SpiceProps | BlendProps) {
  const cabinet = useCabinet();
  const shopping = useShopping();

  const missing = useMemo(() => {
    if (props.kind !== "blend") return [];
    const owned = ownedSet(cabinet.owned, cabinet.staples, props.stapleSlugs);
    return props.ingredients.filter((i) => !i.optional && !isCovered(i, owned));
  }, [props, cabinet.owned, cabinet.staples]);

  if (props.kind === "spice") {
    const onList = isOnList(shopping, props.slug);
    const has = cabinet.owned.includes(props.slug);
    return (
      <div>
        <button
          type="button"
          className="button"
          aria-pressed={onList}
          disabled={has && !onList}
          onClick={() =>
            setShopping(onList ? removeFromList(getShopping(), props.slug) : addToList(getShopping(), [props.slug]))
          }
        >
          {onList ? "On my shopping list (remove)" : "Add to shopping list"}
        </button>
        {has && !onList && <p className="lib__hint">It is already in your cabinet.</p>}
        {onList && (
          <p className="lib__hint">
            <a href="/spices/list">Open my shopping list</a>
          </p>
        )}
      </div>
    );
  }

  const toAdd = missing.filter((i) => !isOnList(shopping, i.slug));
  const allOnList = missing.length > 0 && toAdd.length === 0;

  return (
    <div className="blend__list-action">
      {cabinet.owned.length === 0 ? (
        <p className="lib__hint">
          <a href="/spices/library">Tick the spices you have</a> and this page can add the ones
          you are missing to your shopping list.
        </p>
      ) : missing.length === 0 ? (
        <p>You have everything this blend needs.</p>
      ) : (
        <>
          <p>
            You are missing {missing.length} {missing.length === 1 ? "spice" : "spices"}:{" "}
            {missing.map((i) => i.name).join("; ")}.
          </p>
          <button
            type="button"
            className="button"
            disabled={allOnList}
            onClick={() => setShopping(addToList(getShopping(), missing.map((i) => i.slug)))}
          >
            {allOnList ? "Already on my list" : `Add missing spices (${toAdd.length})`}
          </button>
          {allOnList && (
            <p className="lib__hint">
              <a href="/spices/list">Open my shopping list</a>
            </p>
          )}
        </>
      )}
    </div>
  );
}
