/* ---------------------------------------------------------------------------
   Top picks and Buy next, on the Spices home page.

   Both are worked out in the browser from the saved cabinet, so they change
   as the cabinet does. With an empty cabinet they say how to start instead.
   --------------------------------------------------------------------------- */

import { useMemo } from "react";

import { encodePick } from "../../lib/spices/blend-filter";
import { ownedSet, type FinderBlend } from "../../lib/spices/finder";
import { buyNext, topPicks } from "../../lib/spices/picks";
import { addToList, isOnList, removeFromList } from "../../lib/spices/shopping";
import { useCabinet } from "./cabinet-store";
import { getShopping, setShopping, useShopping } from "./shopping-store";

interface Props {
  blends: FinderBlend[];
  stapleSlugs: string[];
}

const readyWord = (count: number) => `${count} ready ${count === 1 ? "blend" : "blends"}`;

export default function PicksPanel({ blends, stapleSlugs }: Props) {
  const cabinet = useCabinet();
  const shopping = useShopping();

  const owned = useMemo(
    () => ownedSet(cabinet.owned, cabinet.staples, stapleSlugs),
    [cabinet.owned, cabinet.staples, stapleSlugs],
  );
  const empty = cabinet.owned.length === 0;

  const picks = useMemo(() => topPicks(blends, owned), [blends, owned]);
  const buy = useMemo(() => buyNext(blends, owned, stapleSlugs), [blends, owned, stapleSlugs]);

  const toggleList = (slug: string) => {
    const list = getShopping();
    setShopping(isOnList(list, slug) ? removeFromList(list, slug) : addToList(list, [slug]));
  };

  return (
    <div className="picks">
      <section className="picks__section" aria-labelledby="top-picks">
        <h2 id="top-picks">Top picks for your cabinet</h2>

        {empty ? (
          <p>
            Your cabinet is empty. <a href="/spices/library">Tick the spices you have</a> and
            your best matches show up here.
          </p>
        ) : picks.readyCount === 0 ? (
          <p>
            None of the blends are ready yet. See Buy next below for the spices that would
            get you there.
          </p>
        ) : (
          <>
            <p className="lib__hint">
              From the {picks.readyCount} {picks.readyCount === 1 ? "blend" : "blends"} you can
              make now. Each one opens the finder.
            </p>
            <h3>Foods</h3>
            <ul className="picks__list" role="list">
              {picks.foods.map((food) => (
                <li key={`${food.groupId}:${food.itemId ?? ""}`}>
                  <a
                    href={`/spices/finder?food=${encodeURIComponent(encodePick({ groupId: food.groupId, itemId: food.itemId }))}`}
                  >
                    {food.name}
                  </a>{" "}
                  <span className="lib__hint">{readyWord(food.readyBlends)}</span>
                </li>
              ))}
            </ul>
            {picks.cuisines.length > 0 && (
              <>
                <h3>Cuisines</h3>
                <ul className="picks__list" role="list">
                  {picks.cuisines.map((cuisine) => (
                    <li key={cuisine.cuisine}>
                      <a href={`/spices/finder?cuisine=${encodeURIComponent(cuisine.cuisine)}`}>
                        {cuisine.cuisine}
                      </a>{" "}
                      <span className="lib__hint">{readyWord(cuisine.readyBlends)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <section className="picks__section" aria-labelledby="buy-next">
        <h2 id="buy-next">Buy next</h2>

        {empty ? (
          <p>Once you have ticked some spices, this lists what to buy to make the most blends.</p>
        ) : buy.length === 0 ? (
          <p>Nothing to suggest. Every blend is either ready or needs three or more spices.</p>
        ) : (
          <>
            <p className="lib__hint">
              Salt, black pepper and sugar are never suggested. Optional spices are not counted.
            </p>
            <ul className="picks__list" role="list">
              {buy.map((item) => {
                const onList = isOnList(shopping, item.slug);
                return (
                  <li key={item.slug} className="picks__buy">
                    <span>
                      <a href={`/spices/library/${item.slug}`}>{item.name}</a>{" "}
                      <span className="lib__hint">
                        {item.unlocks > 0 && `would unlock ${item.unlocks} ${item.unlocks === 1 ? "blend" : "blends"}`}
                        {item.unlocks > 0 && item.closer > 0 && " and "}
                        {item.closer > 0 &&
                          `${item.unlocks > 0 ? "bring" : "would bring"} ${item.closer} ${item.unlocks > 0 ? "more " : ""}${item.closer === 1 ? "blend" : "blends"} one spice away`}
                        .
                      </span>
                    </span>
                    <button
                      type="button"
                      className="button"
                      aria-pressed={onList}
                      onClick={() => toggleList(item.slug)}
                    >
                      {onList ? "On my list" : "Add to list"}
                      <span className="visually-hidden"> {item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
