/* ---------------------------------------------------------------------------
   The Power and Heat meters.

   Five segments plus the words, never colour alone: a filled segment and an
   empty one differ in shape (solid against outlined), and the sentence beside
   them says the same thing in text. Rendered at build time on the spice pages,
   with no JavaScript, and again inside the library island.
   --------------------------------------------------------------------------- */

import { heatText, powerText } from "../../lib/spices/scales";

interface Props {
  kind: "power" | "heat";
  value: number;
  /** In a list row: "Power 4" instead of the full sentence. */
  compact?: boolean;
}

export default function Meter({ kind, value, compact = false }: Props) {
  const full = kind === "power" ? powerText(value) : heatText(value);
  const short = `${kind === "power" ? "Power" : "Heat"} ${value}`;

  return (
    <span className={`meter meter--${kind}`}>
      <span className="meter__segments" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`meter__segment${n <= value ? " is-on" : ""}`} />
        ))}
      </span>
      {/* In a row the short form is visible and the full sentence is what a
          screen reader gets, so the meaning is the same either way. */}
      {compact ? (
        <>
          <span aria-hidden="true" className="meter__text">
            {short}
          </span>
          <span className="visually-hidden">{full}</span>
        </>
      ) : (
        <span className="meter__text">{full}</span>
      )}
    </span>
  );
}
