/* ---------------------------------------------------------------------------
   Reading a spice or blend file: the header lines, and what follows them.

   The convention is the one recipe files already use. Header lines come first,
   then ONE blank line, then (in a blend file only) the Ingredients list.

   Nothing in here throws. It collects every problem it finds so one build
   reports everything wrong with a file at once.
   --------------------------------------------------------------------------- */

import { RENAMED_FIELDS } from "./constants";
import { suggest, truncate } from "./text";

export interface ParsedFile {
  fields: Map<string, string[]>;
  /** Non-empty lines after the blank line, trimmed. */
  body: string[];
  problems: string[];
  empty: boolean;
}

export function splitFile(
  text: string,
  known: readonly string[],
  repeatable: readonly string[],
  /**
   * The heading that starts the body ("Ingredients" for a blend). If it turns
   * up inside the header there is no blank line before it, which is one clear
   * mistake rather than a pile of confusing ones.
   */
  bodyMarker?: string,
): ParsedFile {
  const problems: string[] = [];
  const fields = new Map<string, string[]>();

  const clean = text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    // A separator line that picked up a space or a tab is still a blank line.
    .replace(/^[ \t]+$/gm, "")
    .replace(/^\n+/, "");

  if (clean.trim().length === 0) {
    return { fields, body: [], problems: ["file is empty"], empty: true };
  }

  const lines = clean.split("\n");
  let index = 0;
  let startOfBody: number | null = null;

  for (; index < lines.length && lines[index].trim() !== ""; index++) {
    const line = lines[index];

    if (bodyMarker !== undefined && line.trim() === `${bodyMarker}:`) {
      problems.push(
        `there is no blank line before "${bodyMarker}:". Leave one blank line after the header, ` +
          `then write "${bodyMarker}:" below it.`,
      );
      startOfBody = index;
      break;
    }

    const colon = line.indexOf(":");

    if (colon === -1) {
      problems.push(`line ${index + 1} is not a "Field: value" pair: "${truncate(line)}"`);
      continue;
    }

    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (!known.includes(key)) {
      problems.push(unknownField(key, known));
      continue;
    }

    const existing = fields.get(key);
    if (existing && !repeatable.includes(key)) {
      problems.push(`field "${key}" appears more than once`);
      continue;
    }

    fields.set(key, [...(existing ?? []), value]);
  }

  const body = lines
    .slice(startOfBody ?? index + 1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return { fields, body, problems, empty: false };
}

function unknownField(key: string, known: readonly string[]): string {
  const renamed = RENAMED_FIELDS[key];
  if (renamed && known.includes(renamed)) {
    return `unknown field "${key}". That field is now called "${renamed}".`;
  }

  const sameButCase = known.find((name) => name.toLowerCase() === key.toLowerCase());

  if (sameButCase) {
    return `unknown field "${key}". Did you mean "${sameButCase}"? Field names are case-sensitive.`;
  }

  const close = suggest(key, known, 1);
  return close.length > 0
    ? `unknown field "${key}". Did you mean "${close[0]}"? Allowed: ${known.join(", ")}`
    : `unknown field "${key}". Allowed: ${known.join(", ")}`;
}

/**
 * Reads values out of a parsed file and records a problem when one is missing
 * or empty. Reading never fails: a missing value comes back undefined.
 */
export class Reader {
  constructor(
    private readonly parsed: ParsedFile,
    readonly problems: string[],
  ) {}

  has(key: string): boolean {
    return this.parsed.fields.has(key);
  }

  /** The single value of a field. Undefined when it is left out or empty. */
  text(key: string, required: boolean): string | undefined {
    const values = this.parsed.fields.get(key);

    if (values === undefined) {
      if (required) this.problems.push(`missing required field "${key}"`);
      return undefined;
    }

    const value = values[0];
    if (value === "") {
      this.problems.push(
        required
          ? `field "${key}" is empty`
          : `field "${key}" is empty. Leave an optional field out completely instead of writing it empty.`,
      );
      return undefined;
    }

    return value;
  }

  /** A comma-separated field as a list of trimmed, non-empty values. */
  list(key: string, required: boolean): string[] | undefined {
    const value = this.text(key, required);
    if (value === undefined) return undefined;

    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (items.length === 0) {
      this.problems.push(`field "${key}" has no values`);
      return undefined;
    }

    return items;
  }

  /** Every line of a repeatable field. */
  all(key: string): string[] {
    return this.parsed.fields.get(key) ?? [];
  }
}

/**
 * A message for a word that is not in a controlled list, with the closest
 * matches when there are any.
 */
export function unknownValue(
  field: string,
  value: string,
  what: string,
  suggestions: readonly string[],
  where: string,
): string {
  const hint =
    suggestions.length > 0
      ? ` Did you mean ${suggestions.map((name) => `"${name}"`).join(" or ")}?`
      : "";

  return `${field}: "${value}" is not ${what}.${hint} (the list is ${where})`;
}
