/* ---------------------------------------------------------------------------
   "I have this" on a single spice's page. Shares the saved cabinet with the
   library, so ticking here shows up there.
   --------------------------------------------------------------------------- */

import { setOwned } from "../../lib/spices/cabinet";
import { getCabinet, setCabinet, useCabinet } from "./cabinet-store";

interface Props {
  slug: string;
  name: string;
}

export default function OwnToggle({ slug, name }: Props) {
  const cabinet = useCabinet();
  const has = cabinet.owned.includes(slug);

  return (
    <div>
      <label className="lib__switch">
        <input
          type="checkbox"
          checked={has}
          onChange={(event) => setCabinet(setOwned(getCabinet(), slug, event.target.checked))}
        />
        <span>I have {name} in my cabinet</span>
      </label>
      {cabinet.saveFailed && (
        <p className="lib__hint" role="status">
          Your browser is not letting this page save, so this will be forgotten when you leave.
        </p>
      )}
    </div>
  );
}
