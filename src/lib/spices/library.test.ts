/* ---------------------------------------------------------------------------
   Tests for the cabinet, the library filters and the Power and Heat words.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import {
  addMany,
  clearOwned,
  emptyCabinet,
  parseCabinet,
  removeMany,
  serializeCabinet,
  setOwned,
  setStaples,
  unknownOwned,
} from "./cabinet";
import {
  filterSpices,
  groupByLetter,
  isFiltering,
  matchesQuery,
  noFilters,
  stapleSlugs,
  type LibrarySpice,
} from "./library-filter";
import { heatText, powerText } from "./scales";

function spice(name: string, extra: Partial<LibrarySpice> = {}): LibrarySpice {
  const label = name.includes(": ") ? name.slice(name.lastIndexOf(": ") + 2) : name;
  return {
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    label,
    aka: [],
    category: "Warm spices",
    familySlug: null,
    power: 3,
    heat: null,
    cuisines: ["Indian"],
    forms: ["ground"],
    flavor: [],
    ...extra,
  };
}

const clove = spice("Clove", { power: 5, aka: ["cloves", "ground cloves"] });
const cumin = spice("Cumin", { category: "Seeds and pods", cuisines: ["Mexican", "Indian"] });
const ancho = spice("Chile, mild red: Ancho", {
  category: "Chiles",
  power: 2,
  heat: 1,
  cuisines: ["Mexican"],
  aka: ["dried poblano"],
});
const pepper = spice("Pepper, black", { category: "Peppercorns", cuisines: ["Global"] });
const arbol = spice("Chile, hot red: Árbol", { category: "Chiles", power: 4, heat: 3, cuisines: ["Mexican"] });
const all = [arbol, ancho, clove, cumin, pepper];

describe("the cabinet", () => {
  it("starts empty with the staples switch on", () => {
    expect(emptyCabinet).toEqual({ owned: [], staples: true });
  });

  it("adds and removes one spice, keeping the list sorted and without repeats", () => {
    let cabinet = setOwned(emptyCabinet, "cumin", true);
    cabinet = setOwned(cabinet, "clove", true);
    cabinet = setOwned(cabinet, "cumin", true);
    expect(cabinet.owned).toEqual(["clove", "cumin"]);

    cabinet = setOwned(cabinet, "clove", false);
    expect(cabinet.owned).toEqual(["cumin"]);
  });

  it("adds and removes many at once", () => {
    const cabinet = addMany(setOwned(emptyCabinet, "salt", true), ["clove", "cumin", "salt"]);
    expect(cabinet.owned).toEqual(["clove", "cumin", "salt"]);
    expect(removeMany(cabinet, ["clove", "salt"]).owned).toEqual(["cumin"]);
  });

  it("clears the spices but leaves the staples switch alone", () => {
    const cabinet = setStaples(addMany(emptyCabinet, ["clove"]), false);
    expect(clearOwned(cabinet)).toEqual({ owned: [], staples: false });
  });

  it("survives a round trip through text", () => {
    const cabinet = setStaples(addMany(emptyCabinet, ["cumin", "clove"]), false);
    expect(parseCabinet(serializeCabinet(cabinet))).toEqual(cabinet);
  });

  it("gives an empty cabinet for anything it cannot read", () => {
    expect(parseCabinet(null)).toEqual(emptyCabinet);
    expect(parseCabinet("not json")).toEqual(emptyCabinet);
    expect(parseCabinet("42")).toEqual(emptyCabinet);
    expect(parseCabinet("null")).toEqual(emptyCabinet);
  });

  it("drops entries that are not text and keeps the rest", () => {
    const cabinet = parseCabinet('{"owned":["clove",7,"",null,"cumin","clove"],"staples":"yes"}');
    expect(cabinet).toEqual({ owned: ["clove", "cumin"], staples: true });
  });

  it("lists saved spices that are no longer in the library", () => {
    const cabinet = addMany(emptyCabinet, ["clove", "retired-spice"]);
    expect(unknownOwned(cabinet, new Set(["clove", "cumin"]))).toEqual(["retired-spice"]);
  });
});

describe("searching", () => {
  it("finds a spice by an alias", () => {
    expect(matchesQuery(clove, "ground cloves")).toBe(true);
    expect(matchesQuery(ancho, "poblano")).toBe(true);
  });

  it("needs every word, in any order", () => {
    expect(matchesQuery(ancho, "ancho mild")).toBe(true);
    expect(matchesQuery(ancho, "ancho hot")).toBe(false);
  });

  it("ignores case and accents, both ways", () => {
    expect(matchesQuery(arbol, "arbol")).toBe(true);
    expect(matchesQuery(spice("Arbol"), "ÁRBOL")).toBe(true);
  });

  it("matches everything for an empty search", () => {
    expect(matchesQuery(clove, "   ")).toBe(true);
  });
});

describe("filtering", () => {
  const none = new Set<string>();

  it("keeps the library order when nothing is filtered", () => {
    expect(filterSpices(all, noFilters, none)).toEqual(all);
  });

  it("matches any of several categories", () => {
    const hit = filterSpices(all, { ...noFilters, categories: ["Chiles", "Peppercorns"] }, none);
    expect(hit.map((s) => s.name)).toEqual([arbol.name, ancho.name, pepper.name]);
  });

  it("makes different filters all match", () => {
    const hit = filterSpices(all, { ...noFilters, categories: ["Chiles"], goEasy: true }, none);
    expect(hit.map((s) => s.name)).toEqual([arbol.name]);
  });

  it("counts a Global spice as every cuisine", () => {
    const hit = filterSpices(all, { ...noFilters, cuisine: "Mexican" }, none);
    expect(hit.map((s) => s.name)).toEqual([arbol.name, ancho.name, cumin.name, pepper.name]);
  });

  it("goEasy keeps Power 4 and 5 only", () => {
    const hit = filterSpices(all, { ...noFilters, goEasy: true }, none);
    expect(hit.map((s) => s.name)).toEqual([arbol.name, clove.name]);
  });

  it("splits the library by what is in the cabinet", () => {
    const owned = new Set([clove.slug]);
    expect(filterSpices(all, { ...noFilters, view: "owned" }, owned)).toEqual([clove]);
    expect(filterSpices(all, { ...noFilters, view: "missing" }, owned)).toHaveLength(4);
  });

  it("knows when anything is being filtered", () => {
    expect(isFiltering(noFilters)).toBe(false);
    expect(isFiltering({ ...noFilters, query: "x" })).toBe(true);
    expect(isFiltering({ ...noFilters, view: "owned" })).toBe(true);
  });
});

describe("select all shown, with a filter on", () => {
  it("ticks only what is shown, and leaves the rest alone", () => {
    const start = addMany(emptyCabinet, [cumin.slug]);
    const shown = filterSpices(all, { ...noFilters, categories: ["Chiles"] }, new Set(start.owned));
    const next = addMany(start, shown.map((s) => s.slug));

    expect(next.owned).toEqual([ancho.slug, arbol.slug, cumin.slug].sort());
    expect(next.owned).not.toContain(clove.slug);
  });

  it("deselecting what is shown keeps spices that are hidden", () => {
    const start = addMany(emptyCabinet, [cumin.slug, ancho.slug, arbol.slug]);
    const shown = filterSpices(all, { ...noFilters, categories: ["Chiles"] }, new Set(start.owned));
    const next = removeMany(start, shown.map((s) => s.slug));

    expect(next.owned).toEqual([cumin.slug]);
  });
});

describe("grouping by letter", () => {
  it("groups in the given order and puts accented names under their plain letter", () => {
    const groups = groupByLetter([spice("Árbol"), spice("Allspice"), spice("Basil")]);
    expect(groups.map((g) => g.letter)).toEqual(["A", "B"]);
    expect(groups[0].spices).toHaveLength(2);
  });
});

describe("pantry staples", () => {
  const library = [
    { slug: "salt", name: "Salt", family: null },
    { slug: "pepper-black", name: "Pepper, black", family: null },
    { slug: "pepper-black-tellicherry", name: "Pepper, black: Tellicherry", family: "Pepper, black" },
    { slug: "pepper-white", name: "Pepper, white", family: null },
  ];

  it("counts a whole family when the umbrella is named", () => {
    expect(stapleSlugs(library, ["Salt", "Pepper, black"])).toEqual([
      "salt",
      "pepper-black",
      "pepper-black-tellicherry",
    ]);
  });

  it("does not count a different umbrella", () => {
    expect(stapleSlugs(library, ["Pepper, black"])).not.toContain("pepper-white");
  });
});

describe("Power and Heat words", () => {
  it("pairs each number with its words", () => {
    expect(powerText(4)).toBe("Power 4 of 5: use sparingly");
    expect(powerText(5)).toBe("Power 5 of 5: a pinch goes a long way");
    expect(heatText(3)).toBe("Heat 3 of 5: hot");
  });
});
