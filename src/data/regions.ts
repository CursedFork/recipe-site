/* ---------------------------------------------------------------------------
   The region lookup.

   ISO 3166-1 alpha-3 is the canonical key for everything. Display names and
   the words you might actually type live alongside the code, never instead of
   it.

   Why this file exists at all: your recipe files say "India" or "Middle East"
   in human words, while world map data identifies countries by number and uses
   its own spellings. I checked the map data we will use in Phase 5, and it
   calls the United States "United States of America" and Ivory Coast "Côte
   d'Ivoire". Those two will never match what you type. Resolving your words to
   a code here, once, at build time, is what stops a recipe quietly never
   appearing on the map.

   SCOPE: this is a starter set covering the cuisines a home cook reaches for.
   Phase 5 extends it to full ISO coverage and adds the numeric-to-alpha-3
   bridge the map data needs. Adding a country now is a one-line job, and if
   you write a region that is not here the build stops and tells you, which is
   exactly the behaviour you asked for.
   --------------------------------------------------------------------------- */

export interface Country {
  /** The display name shown on the site. */
  name: string;
  /**
   * Other spellings that should resolve to this country. Matching is
   * case-insensitive and ignores surrounding whitespace, so there is no need
   * to list capitalisation variants here.
   */
  aliases?: string[];
}

/** Keyed by ISO 3166-1 alpha-3. This is the canonical identifier. */
export const countries = {
  ARG: { name: "Argentina" },
  AUS: { name: "Australia" },
  AUT: { name: "Austria" },
  BEL: { name: "Belgium" },
  BRA: { name: "Brazil" },
  CAN: { name: "Canada" },
  CHE: { name: "Switzerland" },
  CHN: { name: "China" },
  COL: { name: "Colombia" },
  CUB: { name: "Cuba" },
  CZE: { name: "Czechia", aliases: ["Czech Republic"] },
  DEU: { name: "Germany" },
  DNK: { name: "Denmark" },
  DZA: { name: "Algeria" },
  EGY: { name: "Egypt" },
  ESP: { name: "Spain" },
  ETH: { name: "Ethiopia" },
  FRA: { name: "France" },
  GBR: {
    name: "United Kingdom",
    aliases: ["UK", "Britain", "Great Britain", "England", "Scotland", "Wales"],
  },
  GHA: { name: "Ghana" },
  GRC: { name: "Greece" },
  HUN: { name: "Hungary" },
  IDN: { name: "Indonesia" },
  IND: { name: "India" },
  IRL: { name: "Ireland" },
  IRN: { name: "Iran", aliases: ["Persia"] },
  IRQ: { name: "Iraq" },
  ISR: { name: "Israel" },
  ITA: { name: "Italy" },
  JAM: { name: "Jamaica" },
  JOR: { name: "Jordan" },
  JPN: { name: "Japan" },
  KEN: { name: "Kenya" },
  KOR: { name: "South Korea", aliases: ["Korea", "Republic of Korea"] },
  LBN: { name: "Lebanon" },
  LKA: { name: "Sri Lanka" },
  MAR: { name: "Morocco" },
  MEX: { name: "Mexico" },
  MYS: { name: "Malaysia" },
  NGA: { name: "Nigeria" },
  NLD: { name: "Netherlands", aliases: ["Holland"] },
  NOR: { name: "Norway" },
  NPL: { name: "Nepal" },
  NZL: { name: "New Zealand" },
  PAK: { name: "Pakistan" },
  PER: { name: "Peru" },
  PHL: { name: "Philippines" },
  POL: { name: "Poland" },
  PRT: { name: "Portugal" },
  RUS: { name: "Russia" },
  SAU: { name: "Saudi Arabia" },
  SEN: { name: "Senegal" },
  SGP: { name: "Singapore" },
  SWE: { name: "Sweden" },
  SYR: { name: "Syria" },
  THA: { name: "Thailand" },
  TUN: { name: "Tunisia" },
  TUR: { name: "Turkey", aliases: ["Türkiye"] },
  TWN: { name: "Taiwan" },
  UKR: { name: "Ukraine" },
  USA: {
    name: "United States",
    // The map data calls it "United States of America". Both resolve here.
    aliases: ["USA", "US", "America", "United States of America"],
  },
  VNM: { name: "Vietnam", aliases: ["Viet Nam"] },
  ZAF: { name: "South Africa" },
} as const satisfies Record<string, Country>;

export type Alpha3 = keyof typeof countries;

export interface GroupedRegion {
  /** The display name shown on the site. */
  name: string;
  /** Member countries, by alpha-3. */
  members: Alpha3[];
  /** Other ways you might write this group. */
  aliases?: string[];
}

/**
 * Grouped regions, for dishes that belong to an area rather than one country.
 * A recipe tagged "Middle East" resolves to every member below, so it shows up
 * for each of those countries on the map.
 */
export const groupedRegions = {
  "middle-east": {
    name: "Middle East",
    aliases: ["Middle Eastern", "Levant"],
    members: ["EGY", "IRN", "IRQ", "ISR", "JOR", "LBN", "SAU", "SYR", "TUR"],
  },
  "west-africa": {
    name: "West Africa",
    aliases: ["West African"],
    members: ["GHA", "NGA", "SEN"],
  },
  "east-africa": {
    name: "East Africa",
    aliases: ["East African"],
    members: ["ETH", "KEN"],
  },
  "north-africa": {
    name: "North Africa",
    aliases: ["North African", "Maghreb"],
    members: ["DZA", "EGY", "MAR", "TUN"],
  },
  "east-asia": {
    name: "East Asia",
    aliases: ["East Asian"],
    members: ["CHN", "JPN", "KOR", "TWN"],
  },
  "south-asia": {
    name: "South Asia",
    aliases: ["South Asian", "Indian Subcontinent"],
    members: ["IND", "LKA", "NPL", "PAK"],
  },
  "southeast-asia": {
    name: "Southeast Asia",
    aliases: ["South East Asia", "Southeast Asian", "South-East Asia"],
    members: ["IDN", "MYS", "PHL", "SGP", "THA", "VNM"],
  },
  mediterranean: {
    name: "Mediterranean",
    members: ["ESP", "FRA", "GRC", "ITA", "MAR", "PRT", "TUR"],
  },
  scandinavia: {
    name: "Scandinavia",
    aliases: ["Nordic", "Nordics"],
    members: ["DNK", "NOR", "SWE"],
  },
  caribbean: {
    name: "Caribbean",
    members: ["CUB", "JAM"],
  },
  "latin-america": {
    name: "Latin America",
    aliases: ["Latin American", "South America"],
    members: ["ARG", "BRA", "COL", "MEX", "PER"],
  },
} as const satisfies Record<string, GroupedRegion>;

export type GroupKey = keyof typeof groupedRegions;
