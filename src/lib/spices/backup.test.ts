/* ---------------------------------------------------------------------------
   Tests for copying the cabinet out as text and pasting a list back in.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { cabinetAsText, parseSpiceList, type NamedSpice } from "./backup";

const spices: NamedSpice[] = [
  { slug: "cumin", name: "Cumin", label: "Cumin", aka: ["jeera"] },
  { slug: "clove", name: "Clove", label: "Clove", aka: [] },
  { slug: "chile-arbol", name: "Chile: Árbol", label: "Árbol", aka: ["chile de árbol"] },
  { slug: "chile-ancho", name: "Chile: Ancho", label: "Ancho", aka: [] },
  { slug: "pepper-black-tellicherry", name: "Pepper, black: Tellicherry", label: "Tellicherry", aka: [] },
  { slug: "cardamom-green", name: "Cardamom: Green", label: "Green", aka: [] },
  { slug: "tea-green", name: "Tea: Green", label: "Green", aka: [] },
];

describe("copying the cabinet", () => {
  it("gives one name per line in A to Z order", () => {
    expect(cabinetAsText(["cumin", "chile-arbol", "clove"], spices)).toBe("Chile: Árbol\nClove\nCumin");
  });

  it("leaves out saved spices the library no longer has", () => {
    expect(cabinetAsText(["cumin", "gone"], spices)).toBe("Cumin");
  });

  it("is empty for an empty cabinet", () => {
    expect(cabinetAsText([], spices)).toBe("");
  });
});

describe("pasting a list", () => {
  it("matches names ignoring case and accents", () => {
    expect(parseSpiceList("CUMIN\nchile: arbol", spices)).toEqual({
      slugs: ["chile-arbol", "cumin"],
      unknown: [],
    });
  });

  it("matches an alias and a filename", () => {
    expect(parseSpiceList("jeera\nclove", spices).slugs).toEqual(["clove", "cumin"]);
    expect(parseSpiceList("pepper-black-tellicherry", spices).slugs).toEqual(["pepper-black-tellicherry"]);
  });

  it("matches a variety alone when only one spice has it", () => {
    expect(parseSpiceList("Ancho\nTellicherry", spices).slugs).toEqual(["chile-ancho", "pepper-black-tellicherry"]);
  });

  it("does not guess when a variety name is shared", () => {
    expect(parseSpiceList("Green", spices)).toEqual({ slugs: [], unknown: ["Green"] });
  });

  it("reports names it does not recognise, as typed", () => {
    expect(parseSpiceList("Cumin\nUnobtainium\n\n  Dragon Dust  ", spices)).toEqual({
      slugs: ["cumin"],
      unknown: ["Unobtainium", "Dragon Dust"],
    });
  });

  it("ignores bullets and tick boxes, so a copied shopping list works", () => {
    expect(parseSpiceList("- Cumin\n* Clove\n[x] Chile: Ancho\n[ ] jeera", spices).slugs).toEqual([
      "chile-ancho",
      "clove",
      "cumin",
    ]);
  });

  it("counts a spice named twice once", () => {
    expect(parseSpiceList("Cumin\ncumin\njeera", spices).slugs).toEqual(["cumin"]);
  });

  it("handles Windows line endings", () => {
    expect(parseSpiceList("Cumin\r\nClove\r\n", spices).slugs).toEqual(["clove", "cumin"]);
  });
});
