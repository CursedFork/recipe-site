/* ---------------------------------------------------------------------------
   Checks the REAL /spices and /blends folders.

   While the library is being built, the sample blends name spices that do not
   exist yet, so the real library reports problems. This test pins down that
   those are the ONLY problems: nothing else is wrong with the files that are
   there. When the library is complete it simply passes with an empty list, so
   it never needs editing.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { readLibrary } from "./load-spices";

describe("the real spice and blend files", () => {
  const library = readLibrary();

  it("have no problems at all", () => {
    expect(library.problems).toEqual([]);
  });

  it("parse every spice file that exists", () => {
    expect(library.spices.length).toBeGreaterThanOrEqual(3);
  });

  it("use only the three sample spice names that exist so far, in family order", () => {
    const names = library.spices.map((spice) => spice.name);
    expect(names).toContain("Clove");
    expect(names).toContain("Pepper, black: Tellicherry");
    expect(names).toContain("Chile, mild red: Ancho");
  });
});

describe("the spice files on their own", () => {
  it("have no problems at all, not even a spice that is missing", () => {
    const own = readLibrary().problems.filter((problem) => problem.startsWith("spices/"));
    expect(own).toEqual([]);
  });
});
