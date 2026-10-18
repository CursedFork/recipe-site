/* ---------------------------------------------------------------------------
   Tests for the fraction and unit maths.

   The first block is every case from the spec, written out in the spec's own
   words so the two can be read side by side. The blocks after it cover the
   edges those cases imply.

   Run with:  npm test
   --------------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";

import type { Ingredient } from "./parse-recipe";
import {
  convertAmount,
  convertTemperatures,
  fahrenheitToCelsius,
  formatAmount,
  isWeighedNotScooped,
  renderIngredient,
  roundMetric,
} from "./units";

/** Build an ingredient the way the parser would. */
function ingredient(
  amount: number | null,
  unit: string | null,
  item: string,
  raw?: string,
): Ingredient {
  return {
    raw: raw ?? [amount, unit, item].filter(Boolean).join(" "),
    isHeading: false,
    amount,
    amountText: amount === null ? null : String(amount),
    unit,
    item,
  };
}

/** Servings multiplier, the way the page computes it. */
const scale = (from: number, to: number) => to / from;

describe("the cases in the spec", () => {
  it("1 1/2 cups scaled from 4 servings to 6 is 2 1/4 cups, as a fraction", () => {
    const line = ingredient(1.5, "cup", "tomato puree");
    const result = renderIngredient(line, scale(4, 6), "us");
    expect(result.text).toBe("2 1/4 cups tomato puree");
  });

  it("1/3 cup doubled is 2/3 cup", () => {
    const line = ingredient(1 / 3, "cup", "water");
    expect(renderIngredient(line, 2, "us").text).toBe("2/3 cup water");
  });

  it("1/3 cup scaled by 1.5 is 1/2 cup", () => {
    const line = ingredient(1 / 3, "cup", "water");
    expect(renderIngredient(line, 1.5, "us").text).toBe("1/2 cup water");
  });

  it("2 tbsp in metric is about 30 ml", () => {
    const line = ingredient(2, "tbsp", "butter");
    // Butter is on the weighed-not-scooped list, so use a liquid here: the
    // point of this case is the volume maths. 2 tbsp is 29.57 ml.
    const oil = ingredient(2, "tbsp", "olive oil");
    expect(renderIngredient(oil, 1, "metric").text).toBe("30 ml olive oil");
    // And butter deliberately does not convert, which is the next case along.
    expect(renderIngredient(line, 1, "metric").keptOriginalUnit).toBe(true);
  });

  it("1 1/2 cups in metric is about 355 ml, rounded to something a cook would use", () => {
    const line = ingredient(1.5, "cup", "tomato puree");
    const result = renderIngredient(line, 1, "metric");
    // 1.5 x 236.588 = 354.88, which rounds to 355 rather than showing 354.88.
    expect(result.text).toBe("355 ml tomato puree");
  });

  it("350°F becomes 175°C, not 176.67", () => {
    expect(fahrenheitToCelsius(350)).toBe(175);
    expect(convertTemperatures("Heat the oven to 350°F.", "metric")).toBe(
      "Heat the oven to 175°C.",
    );
  });

  it("salt to taste is unchanged at every scale and in both systems", () => {
    const line = ingredient(null, null, "salt to taste", "salt to taste");

    for (const factor of [0.5, 1, 1.5, 2, 3]) {
      for (const system of ["us", "metric"] as const) {
        expect(renderIngredient(line, factor, system).text).toBe("salt to taste");
      }
    }
  });

  it("a flour line in cups stays in cups in metric mode, and raises the note", () => {
    const line = ingredient(2, "cup", "flour");
    const result = renderIngredient(line, 1, "metric");

    expect(result.text).toBe("2 cups flour");
    expect(result.keptOriginalUnit).toBe(true);
  });

  it("a bare 350 in an instruction is left completely alone", () => {
    const text = "Cover the pan and leave it for about 350 of your favourite units.";
    expect(convertTemperatures(text, "metric")).toBe(text);
  });

  it("scaling to an awkward servings count still reads sensibly", () => {
    const line = ingredient(1.5, "cup", "tomato puree");

    // 4 servings to 5 is 1.875 cups, which lands exactly on an eighth.
    expect(renderIngredient(line, scale(4, 5), "us").text).toBe("1 7/8 cups tomato puree");

    // 4 to 3 is 1.125, likewise.
    expect(renderIngredient(line, scale(4, 3), "us").text).toBe("1 1/8 cups tomato puree");

    // A third of a cup scaled by 1.25 is 0.4167, which has no exact match.
    // It snaps to the nearest eighth rather than printing 0.42.
    const third = ingredient(1 / 3, "cup", "water");
    expect(renderIngredient(third, scale(4, 5), "us").text).toBe("3/8 cup water");
  });
});

describe("formatAmount", () => {
  it("writes whole numbers plainly", () => {
    expect(formatAmount(1)).toBe("1");
    expect(formatAmount(3)).toBe("3");
    expect(formatAmount(12)).toBe("12");
  });

  it("writes the fractions a cook can measure", () => {
    expect(formatAmount(0.5)).toBe("1/2");
    expect(formatAmount(0.25)).toBe("1/4");
    expect(formatAmount(0.75)).toBe("3/4");
    expect(formatAmount(1 / 3)).toBe("1/3");
    expect(formatAmount(2 / 3)).toBe("2/3");
    expect(formatAmount(0.125)).toBe("1/8");
    expect(formatAmount(0.875)).toBe("7/8");
  });

  it("prefers the simpler denominator when two are equally close", () => {
    // 0.5 is both 1/2 and 4/8. It should say 1/2.
    expect(formatAmount(0.5)).toBe("1/2");
    expect(formatAmount(2.5)).toBe("2 1/2");
  });

  it("combines a whole part with a fraction", () => {
    expect(formatAmount(1.5)).toBe("1 1/2");
    expect(formatAmount(2.25)).toBe("2 1/4");
    expect(formatAmount(4 + 2 / 3)).toBe("4 2/3");
  });

  it("snaps to the nearest whole number when very close", () => {
    expect(formatAmount(2.999)).toBe("3");
    expect(formatAmount(3.001)).toBe("3");
  });

  it("never loses most of an amount it cannot express as a fraction", () => {
    // The smallest fraction these denominators can write is 1/8, so a value
    // sitting between the last eighth and the next whole number matches no
    // candidate at all. It must round to the nearest whole number rather than
    // fall back to flooring, which silently dropped nearly a whole cup.
    //
    // 3/4 cup scaled from 4 servings to 5 is exactly 0.9375, which is the
    // most ordinary way to reach this.
    expect(formatAmount(0.9375)).toBe("1");
    expect(formatAmount(2.95)).toBe("3");
    expect(formatAmount(1.96)).toBe("2");
  });

  it("still shows a genuinely tiny amount rather than rounding it to nothing", () => {
    expect(formatAmount(0.05)).toBe("0.05");
  });

  it("never returns a negative or zero amount as a fraction", () => {
    expect(formatAmount(0)).toBe("0");
    expect(formatAmount(-1)).toBe("0");
  });
});

describe("roundMetric", () => {
  it("keeps small amounts to the nearest whole unit so they do not vanish", () => {
    // A quarter teaspoon is 1.23 ml. Rounding to the nearest 5 would erase it.
    expect(roundMetric(1.23)).toBe(1);
    expect(roundMetric(4.93)).toBe(5);
    expect(roundMetric(9.86)).toBe(10);
  });

  it("rounds larger amounts to the nearest 5, like a measuring jug", () => {
    expect(roundMetric(29.57)).toBe(30);
    expect(roundMetric(354.88)).toBe(355);
    expect(roundMetric(236.59)).toBe(235);
  });
});

describe("volume conversion", () => {
  it("converts the common volume units", () => {
    expect(convertAmount(1, "tsp", "vanilla", 1, "metric").amountText).toBe("5");
    expect(convertAmount(1, "cup", "stock", 1, "metric").amountText).toBe("235");
    expect(convertAmount(1, "fl oz", "stock", 1, "metric").amountText).toBe("30");
  });

  it("moves up to litres past 1000 ml", () => {
    const result = convertAmount(2, "quart", "stock", 1, "metric");
    expect(result.unit).toBe("l");
    expect(result.amountText).toBe("1.9");
  });

  it("leaves units that are already metric alone", () => {
    const result = convertAmount(250, "ml", "milk", 1, "metric");
    expect(result.amountText).toBe("250");
    expect(result.unit).toBe("ml");
    expect(result.keptOriginalUnit).toBe(false);
  });
});

describe("weight conversion", () => {
  it("converts ounces and pounds to grams", () => {
    expect(convertAmount(1, "oz", "chocolate", 1, "metric").amountText).toBe("30");
    expect(convertAmount(8, "oz", "beef", 1, "metric").amountText).toBe("225");
  });

  it("moves up to kilograms past 1000 g", () => {
    const result = convertAmount(3, "lb", "beef", 1, "metric");
    expect(result.unit).toBe("kg");
    expect(result.amountText).toBe("1.36");
  });

  it("converts weight even for things on the weighed-not-scooped list", () => {
    // The list is about VOLUME measurements of these. A weight is already
    // unambiguous, so 8 oz of chocolate converts happily.
    const result = convertAmount(8, "oz", "chocolate", 1, "metric");
    expect(result.keptOriginalUnit).toBe(false);
    expect(result.unit).toBe("g");
  });
});

describe("never converting volume to weight", () => {
  it("recognises the things a metric cook weighs", () => {
    expect(isWeighedNotScooped("flour")).toBe(true);
    expect(isWeighedNotScooped("all-purpose flour")).toBe(true);
    expect(isWeighedNotScooped("granulated sugar")).toBe(true);
    expect(isWeighedNotScooped("grated cheese")).toBe(true);
    expect(isWeighedNotScooped("chopped walnuts")).toBe(true);
  });

  it("does not catch ordinary liquids", () => {
    expect(isWeighedNotScooped("water")).toBe(false);
    expect(isWeighedNotScooped("olive oil")).toBe(false);
    expect(isWeighedNotScooped("tomato puree")).toBe(false);
    expect(isWeighedNotScooped("chicken stock")).toBe(false);
  });

  it("still scales a kept line, it just does not convert it", () => {
    const line = ingredient(2, "cup", "flour");
    const result = renderIngredient(line, 2, "metric");
    expect(result.text).toBe("4 cups flour");
    expect(result.keptOriginalUnit).toBe(true);
  });
});

describe("unit pluralisation", () => {
  it("writes cups, not cup, when there is more than one", () => {
    const line = ingredient(2, "cup", "stock");
    expect(renderIngredient(line, 1, "us").text).toBe("2 cups stock");
  });

  it("keeps the singular for exactly one", () => {
    const line = ingredient(1, "cup", "stock");
    expect(renderIngredient(line, 1, "us").text).toBe("1 cup stock");
  });

  it("treats a mixed number as more than one", () => {
    const line = ingredient(1.5, "cup", "stock");
    expect(renderIngredient(line, 1, "us").text).toBe("1 1/2 cups stock");
  });

  it("keeps fractions under one singular", () => {
    const line = ingredient(0.5, "cup", "stock");
    expect(renderIngredient(line, 1, "us").text).toBe("1/2 cup stock");
  });

  it("says 1 cup even when the value is a hair over one", () => {
    // 1.02 displays as "1", so the unit must agree with the text shown and
    // not with the raw number behind it.
    const line = ingredient(1.02, "cup", "stock");
    expect(renderIngredient(line, 1, "us").text).toBe("1 cup stock");
  });

  it("never pluralises an abbreviation", () => {
    expect(renderIngredient(ingredient(2, "tbsp", "olive oil"), 1, "us").text)
      .toBe("2 tbsp olive oil");
    expect(renderIngredient(ingredient(3, "tsp", "vanilla"), 1, "us").text)
      .toBe("3 tsp vanilla");
    // and the metric units it produces
    expect(renderIngredient(ingredient(2, "tbsp", "olive oil"), 1, "metric").text)
      .toBe("30 ml olive oil");
  });
});

describe("temperatures", () => {
  it("reads every explicit way of writing Fahrenheit", () => {
    expect(convertTemperatures("Heat to 350°F.", "metric")).toBe("Heat to 175°C.");
    expect(convertTemperatures("Heat to 350 °F.", "metric")).toBe("Heat to 175°C.");
    expect(convertTemperatures("Heat to 350F.", "metric")).toBe("Heat to 175°C.");
    expect(convertTemperatures("Heat to 350 F.", "metric")).toBe("Heat to 175°C.");
    expect(convertTemperatures("Heat to 350 degrees F.", "metric")).toBe("Heat to 175°C.");
    expect(convertTemperatures("Heat to 350 degrees Fahrenheit.", "metric")).toBe(
      "Heat to 175°C.",
    );
  });

  it("rounds to settings an oven dial actually has", () => {
    expect(fahrenheitToCelsius(350)).toBe(175);
    expect(fahrenheitToCelsius(400)).toBe(205);
    expect(fahrenheitToCelsius(425)).toBe(220);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(32)).toBe(0);
  });

  it("leaves anything ambiguous completely alone", () => {
    const cases = [
      "Bake for 350 of your favourite units.",
      "Add 350 g of flour.",
      "Use 2 cups of flour.",
      "Roast 350 Florentine biscuits.",
      "Step 350 is the last one.",
    ];

    for (const text of cases) {
      expect(convertTemperatures(text, "metric")).toBe(text);
    }
  });

  it("reads Fahrenheit written out with no degree sign", () => {
    expect(convertTemperatures("Heat to 350 Fahrenheit.", "metric")).toBe(
      "Heat to 175°C.",
    );
  });

  it("does nothing at all in US mode", () => {
    const text = "Heat the oven to 350°F.";
    expect(convertTemperatures(text, "us")).toBe(text);
  });

  it("handles more than one temperature in a line", () => {
    expect(
      convertTemperatures("Start at 450°F, then drop to 350°F.", "metric"),
    ).toBe("Start at 230°C, then drop to 175°C.");
  });
});

describe("headings and unmeasured lines", () => {
  it("leaves a group heading exactly as written", () => {
    const heading: Ingredient = {
      raw: "For the sauce:",
      isHeading: true,
      amount: null,
      amountText: null,
      unit: null,
      item: "For the sauce",
    };

    expect(renderIngredient(heading, 2, "metric").text).toBe("For the sauce:");
  });

  it("scales a line that has an amount but no unit", () => {
    const line = ingredient(3, null, "eggs");
    expect(renderIngredient(line, 2, "us").text).toBe("6 eggs");
    expect(renderIngredient(line, 2, "metric").text).toBe("6 eggs");
  });

  it("leaves an unrecognised unit alone rather than guessing", () => {
    const line = ingredient(2, "handful", "spinach");
    const result = renderIngredient(line, 2, "metric");
    expect(result.text).toBe("4 handful spinach");
  });
});
