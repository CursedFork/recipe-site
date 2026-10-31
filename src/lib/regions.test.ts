/* ---------------------------------------------------------------------------
   Tests for the region lookup.

   The Spices section leans on this for every Origin line, and Phase 2 changed
   it: the Levant became a real group of its own and a dozen countries were
   added. These tests pin the behavior that matters so a later edit cannot undo
   it without a failing test saying why.
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import { resolveRegion, suggestRegions } from "./regions";

describe("the Levant", () => {
  it("is its own group of five, not the nine-country Middle East", () => {
    const levant = resolveRegion("Levant");
    expect(levant?.kind).toBe("group");
    expect(levant?.name).toBe("Levant");
    expect(levant?.codes).toEqual(["ISR", "JOR", "LBN", "PSE", "SYR"]);
  });

  it("does not include the countries it used to wrongly include", () => {
    const codes = resolveRegion("Levant")?.codes ?? [];
    for (const wrong of ["EGY", "IRN", "IRQ", "SAU", "TUR"]) {
      expect(codes).not.toContain(wrong);
    }
  });

  it("leaves the Middle East group exactly as it was", () => {
    expect(resolveRegion("Middle East")?.codes).toEqual([
      "EGY", "IRN", "IRQ", "ISR", "JOR", "LBN", "SAU", "SYR", "TUR",
    ]);
  });

  it("accepts Levantine as a spelling", () => {
    expect(resolveRegion("Levantine")?.name).toBe("Levant");
  });
});

describe("Palestine and the other new countries", () => {
  it("resolves Palestine and its alternative names", () => {
    expect(resolveRegion("Palestine")?.codes).toEqual(["PSE"]);
    expect(resolveRegion("State of Palestine")?.codes).toEqual(["PSE"]);
  });

  it("resolves the places spices actually come from", () => {
    expect(resolveRegion("Zanzibar")?.codes).toEqual(["TZA"]);
    expect(resolveRegion("Madagascar")?.codes).toEqual(["MDG"]);
    expect(resolveRegion("Grenada")?.codes).toEqual(["GRD"]);
    expect(resolveRegion("Burma")?.codes).toEqual(["MMR"]);
    expect(resolveRegion("Bangladesh")?.codes).toEqual(["BGD"]);
  });
});

describe("groups that gained members", () => {
  it("South Asia now includes Bangladesh, so Indian Subcontinent does too", () => {
    expect(resolveRegion("Indian Subcontinent")?.codes).toContain("BGD");
    expect(resolveRegion("South Asia")?.codes).toEqual(["BGD", "IND", "LKA", "NPL", "PAK"]);
  });

  it("the Caribbean, Southeast Asia, East Africa and Latin America gained their missing members", () => {
    expect(resolveRegion("Caribbean")?.codes).toEqual(["CUB", "GRD", "JAM", "TTO"]);
    expect(resolveRegion("Southeast Asia")?.codes).toContain("MMR");
    expect(resolveRegion("East Africa")?.codes).toContain("TZA");
    expect(resolveRegion("Latin America")?.codes).toContain("GTM");
  });
});

describe("what already worked still works", () => {
  it("resolves the United States by any of its spellings", () => {
    for (const spelling of ["United States", "USA", "US", "America", "United States of America"]) {
      expect(resolveRegion(spelling)?.codes).toEqual(["USA"]);
    }
  });

  it("is case-insensitive and ignores surrounding spaces", () => {
    expect(resolveRegion("  india ")?.codes).toEqual(["IND"]);
  });

  it("returns null for somewhere that is not in the lookup", () => {
    expect(resolveRegion("Narnia")).toBeNull();
  });

  it("suggests the close match for a typo", () => {
    expect(suggestRegions("Midle East")).toContain("Middle East");
  });
});
