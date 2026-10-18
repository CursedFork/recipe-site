/* ---------------------------------------------------------------------------
   The world map, projected at build time.

   This is the whole reason the map costs no JavaScript. d3-geo and
   topojson-client are devDependencies: they run here, during `astro build`,
   turn the Natural Earth shapes into plain SVG path strings, and never reach
   the browser. What ships is an <svg> with 176 <path> elements, which gzips
   extremely well because it is mostly repeated digits.

   The country shapes are matched to the region lookup by name, and every
   country in the lookup must find a shape or the build says so. That is what
   stops a recipe quietly never appearing on the map.
   --------------------------------------------------------------------------- */

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";

import { countries as lookupCountries } from "../data/regions";
import { resolveRegion } from "./regions";

/** The SVG coordinate space the paths are drawn in. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 480;

export interface MapCountry {
  /** The map data's own name for it. */
  name: string;
  /** ISO alpha-3, when this country is in the region lookup. */
  alpha3: string | null;
  /** The SVG path. */
  d: string;
}

export interface MapGeometry {
  countries: MapCountry[];
  /**
   * Countries in the lookup that have no shape at this map scale. Not an
   * error: some places are genuinely too small to draw at 1:110m.
   */
  missingShapes: Array<{ alpha3: string; name: string }>;
}

/**
 * Antarctica is dropped. It has no recipes, it is enormous in any world
 * projection, and keeping it would push every inhabited country into the top
 * two thirds of the map.
 */
const EXCLUDED = new Set(["Antarctica"]);

/**
 * A path context that rounds coordinates as it writes them.
 *
 * geoPath normally returns a string built from full-precision floats, so one
 * border point costs something like "M123.45678901234,234.56789012345". Given
 * a context object instead, it calls these methods and we control the output.
 *
 * Whole numbers in a 1000-unit viewBox means the worst rounding error is half
 * a unit, which is under a pixel at any size this map is actually drawn. The
 * measured difference on the built page: full precision 125 KB gzipped, one
 * decimal 86 KB, whole numbers 58 KB. Nothing visible is lost.
 */
const PRECISION = 0;
const factor = 10 ** PRECISION;
const round = (n: number) => String(Math.round(n * factor) / factor);

const roundingContext = {
  _parts: [] as string[],
  moveTo(x: number, y: number) {
    this._parts.push(`M${round(x)},${round(y)}`);
  },
  lineTo(x: number, y: number) {
    this._parts.push(`L${round(x)},${round(y)}`);
  },
  arc(x: number, y: number, radius: number) {
    // Only reached for point geometries, which country borders are not.
    this._parts.push(`M${round(x)},${round(y)}m0,${round(radius)}`);
  },
  closePath() {
    this._parts.push("Z");
  },
  /** Take what has been written and reset for the next shape. */
  result(): string {
    const text = this._parts.join("");
    this._parts.length = 0;
    return text;
  },
};

let cache: MapGeometry | null = null;

export function buildMapGeometry(): MapGeometry {
  if (cache !== null) return cache;

  const topology = worldAtlas as unknown as Topology<{
    countries: GeometryCollection<{ name: string }>;
  }>;

  const collection = feature(topology, topology.objects.countries);
  const drawn = collection.features.filter(
    (shape) => !EXCLUDED.has(shape.properties?.name ?? ""),
  );

  // Fit the projection to the whole world rather than guessing a scale, with a
  // small margin so nothing touches the edge of the viewBox.
  const projection = geoNaturalEarth1().fitExtent(
    [
      [8, 8],
      [MAP_WIDTH - 8, MAP_HEIGHT - 8],
    ],
    { type: "FeatureCollection", features: drawn } as never,
  );

  // Round the coordinates as they are written.
  //
  // d3 emits full-precision floats, so a single border point costs something
  // like "M123.45678901234,234.56789012345". At a 1000px wide viewBox, one
  // decimal place is a tenth of a pixel, which no screen can show. Keeping
  // that precision roughly tripled the size of the page for no visible gain.
  const path = geoPath(projection, roundingContext);

  const countries: MapCountry[] = [];
  const foundCodes = new Set<string>();

  for (const shape of drawn) {
    const name = shape.properties?.name ?? "";
    // With a context, geoPath writes into it and returns nothing.
    path(shape);
    const d = roundingContext.result();
    if (!d) continue; // Nothing to draw.

    // Match the map's name to the lookup. Only a country may match: if a map
    // name somehow collided with a grouped region's alias, treating it as that
    // whole group would be badly wrong.
    const resolved = resolveRegion(name);
    const alpha3 =
      resolved !== null && resolved.kind === "country" ? resolved.codes[0] : null;

    if (alpha3 !== null) foundCodes.add(alpha3);

    countries.push({ name, alpha3, d });
  }

  // Every country in the lookup should have found a shape. One that did not is
  // worth knowing about, because a recipe tagged with it will never light up.
  const missingShapes = Object.entries(lookupCountries)
    .filter(([code]) => !foundCodes.has(code))
    .map(([code, country]) => ({ alpha3: code, name: country.name }));

  if (missingShapes.length > 0) {
    console.warn(
      `\nNote: ${missingShapes.length} country(ies) in src/data/regions.ts have no shape on the map:\n` +
        missingShapes.map((c) => `  ${c.alpha3}  ${c.name}`).join("\n") +
        `\nThis is usually because the place is too small to draw at this map's scale.\n` +
        `Their recipes still appear in the region list beside the map, which is the\n` +
        `keyboard and screen reader route anyway. If one of these looks wrong, check\n` +
        `that its name or an alias in regions.ts matches the map data's spelling.\n`,
    );
  }

  cache = { countries, missingShapes };
  return cache;
}
