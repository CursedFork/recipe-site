/* ---------------------------------------------------------------------------
   Pantry staples for the Spices section.

   These are the ingredients assumed to be in everyone's kitchen. A blend that
   needs one of them is not held up by it, so "Ready now" is not blocked by
   salt. The visitor sees a visible note saying so, with a switch to turn the
   assumption off, and their choice is remembered in their own browser.

   Each name must match the Name of a file in /spices exactly. A name that
   does not is a build error. Naming a family counts any member of it, so
   "Pepper, black" covers Tellicherry, Malabar and plain black pepper alike.

   Nothing reads this file yet. The Spices section is still in its planning
   phase.
   --------------------------------------------------------------------------- */

export const staples = ["Salt", "Pepper, black", "Sugar"] as const;
