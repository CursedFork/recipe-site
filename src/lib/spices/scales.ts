/* ---------------------------------------------------------------------------
   The words that go with the Power and Heat numbers.

   See docs/spices-plan.md section 7. The numbers are only half of the message:
   the meter is always shown with these words, so it never depends on colour or
   on counting boxes.
   --------------------------------------------------------------------------- */

export const POWER_LABELS: Record<number, string> = {
  1: "mild and forgiving",
  2: "gentle",
  3: "moderate",
  4: "use sparingly",
  5: "a pinch goes a long way",
};

export const HEAT_LABELS: Record<number, string> = {
  0: "no heat",
  1: "mild",
  2: "medium",
  3: "hot",
  4: "very hot",
  5: "extremely hot",
};

/** "Power 4 of 5: use sparingly" */
export function powerText(power: number): string {
  return `Power ${power} of 5: ${POWER_LABELS[power] ?? ""}`.replace(/: $/, "");
}

/** "Heat 3 of 5: hot" */
export function heatText(heat: number): string {
  return `Heat ${heat} of 5: ${HEAT_LABELS[heat] ?? ""}`.replace(/: $/, "");
}
