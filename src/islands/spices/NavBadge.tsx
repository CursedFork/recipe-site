/* ---------------------------------------------------------------------------
   A small count next to the Spices link: spices in the cabinet plus items on
   the shopping list. Shows nothing until there is something to count, and
   nothing at all on the server, so the header is the same HTML for everyone.
   --------------------------------------------------------------------------- */

import { useCabinet } from "./cabinet-store";
import { useShopping } from "./shopping-store";

export default function NavBadge() {
  const cabinet = useCabinet();
  const shopping = useShopping();
  const count = cabinet.owned.length + shopping.items.length;

  if (count === 0) return null;

  return (
    <span className="nav-badge">
      <span aria-hidden="true">{count}</span>
      <span className="visually-hidden">
        {cabinet.owned.length} in your spice cabinet, {shopping.items.length} on your shopping list
      </span>
    </span>
  );
}
