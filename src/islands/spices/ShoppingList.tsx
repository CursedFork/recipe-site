/* ---------------------------------------------------------------------------
   The shopping list page: tick items off in the shop, move what you bought
   into the cabinet, copy the list as text, or print it.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";

import {
  listAsText,
  markAllCheckedBought,
  markBought,
  removeFromList,
  setChecked,
  unknownOnList,
} from "../../lib/spices/shopping";
import { getCabinet, setCabinet, useCabinet } from "./cabinet-store";
import { getShopping, setShopping, useShopping } from "./shopping-store";

interface Props {
  spices: Array<{ slug: string; name: string }>;
}

export default function ShoppingList({ spices }: Props) {
  const shopping = useShopping();
  const cabinet = useCabinet();
  const [message, setMessage] = useState("");

  const names = useMemo(() => new Map(spices.map((spice) => [spice.slug, spice.name])), [spices]);
  const known = useMemo(() => new Set(names.keys()), [names]);
  const nameOf = (slug: string) => names.get(slug) ?? slug;

  const orphans = unknownOnList(shopping, known);
  const checkedCount = shopping.items.filter((item) => item.checked).length;

  // Each change reads the live store, so two quick clicks never use a stale copy.
  const bought = (slug: string) => {
    const result = markBought(getShopping(), getCabinet(), slug);
    setCabinet(result.cabinet);
    setShopping(result.list);
    setMessage(`${nameOf(slug)} moved to your cabinet.`);
  };

  const boughtAll = () => {
    const result = markAllCheckedBought(getShopping(), getCabinet());
    setCabinet(result.cabinet);
    setShopping(result.list);
    setMessage(`${checkedCount} ${checkedCount === 1 ? "spice" : "spices"} moved to your cabinet.`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(shopping, nameOf));
      setMessage("Copied. Paste it into a note or a message.");
    } catch {
      setMessage("Your browser would not let this page copy. Select the list and copy it by hand.");
    }
  };

  return (
    <div className="lib">
      {shopping.saveFailed && (
        <p className="lib__hint" role="status">
          Your browser is not letting this page save, so this list will be forgotten when you leave.
        </p>
      )}

      {shopping.items.length === 0 ? (
        <div className="browser__empty">
          <p className="browser__empty-title">Your list is empty.</p>
          <p className="browser__empty-text">
            Add spices from Buy next on the <a href="/spices">Spices home</a>, from any spice
            page, or from a blend page with &quot;Add missing spices&quot;.
          </p>
        </div>
      ) : (
        <>
          <div className="lib__actions shopping__actions">
            <button type="button" className="button" onClick={copy}>
              Copy list
            </button>
            <button type="button" className="button" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className="button" onClick={boughtAll} disabled={checkedCount === 0}>
              Move ticked to my cabinet{checkedCount > 0 ? ` (${checkedCount})` : ""}
            </button>
          </div>

          <ul className="lib__list" role="list">
            {shopping.items.map((item) => (
              <li key={item.slug} className="lib__item shopping__item">
                <label className="lib__check">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) => setShopping(setChecked(getShopping(), item.slug, event.target.checked))}
                  />
                  <span className="visually-hidden">Got {nameOf(item.slug)}</span>
                </label>
                <div className="lib__body">
                  <a className={`lib__name${item.checked ? " is-checked" : ""}`} href={`/spices/library/${item.slug}`}>
                    {nameOf(item.slug)}
                  </a>
                  {item.checked && <p className="lib__meta">Ticked off</p>}
                  {cabinet.owned.includes(item.slug) && <p className="lib__meta">Already in your cabinet</p>}
                </div>
                <div className="lib__actions shopping__row-actions">
                  <button type="button" className="button" onClick={() => bought(item.slug)}>
                    Bought it<span className="visually-hidden">: {nameOf(item.slug)}</span>
                  </button>
                  <button
                    type="button"
                    className="browser__clear"
                    onClick={() => setShopping(removeFromList(getShopping(), item.slug))}
                  >
                    Remove<span className="visually-hidden"> {nameOf(item.slug)}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {orphans.length > 0 && (
        <div className="lib__orphans">
          <p>
            No longer in the library: {orphans.join(", ")}. They stay on your list until you remove
            them.
          </p>
        </div>
      )}

      <p className="lib__hint" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
