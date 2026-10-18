/* ---------------------------------------------------------------------------
   What the map page hands to its island. Flat and small: the projection and
   the recipe grouping both happen at build time.
   --------------------------------------------------------------------------- */

export interface MapShape {
  name: string;
  alpha3: string | null;
  d: string;
}

export interface PlaceRecipe {
  slug: string;
  title: string;
}

/**
 * Somewhere with at least one recipe: either a single country or one of the
 * grouped regions, like "Middle East".
 */
export interface Place {
  /** ISO alpha-3 for a country, or the group's key. Unique across both. */
  key: string;
  kind: "country" | "group";
  name: string;
  /** For a group, the alpha-3 codes it covers, so the map can highlight them. */
  codes: string[];
  recipes: PlaceRecipe[];
}
