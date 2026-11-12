import type { ExtractedTerms } from "./types";

/**
 * The whole figure, not just its first digit: reporting "$1" for "$12.00"
 * would tell a reader nothing about what went wrong.
 *
 * A bare count counts. "*for 3 months*" is as much a claim about the schedule as
 * "*$12.00*" is a claim about the money, and the model was given neither — every
 * figure on a screen is computed. The pattern used to know only currency shapes,
 * so a wrong count in a summary crossed the gate untouched.
 */
const MONEY_PATTERN = /\$\s?[\d,]+(?:\.\d{2})?|USD\s?[\d,]+(?:\.\d{2})?|\b\d[\d,]*(?:\.\d+)?\b/i;

export function findMoneyLike(text: string): string | null {
  const match = MONEY_PATTERN.exec(text);
  return match ? match[0] : null;
}

export class MoneyInModelOutputError extends Error {
  constructor(
    readonly field: string,
    readonly fragment: string,
  ) {
    super(`Model output contains a monetary value in ${field}: ${fragment}`);
    this.name = "MoneyInModelOutputError";
  }
}

/**
 * Every string the model returns crosses this gate before it can reach a
 * screen. A figure that appears in model output was invented — the model is
 * never given one — so the whole response is refused rather than trimmed.
 */
export function assertNoMoney(terms: ExtractedTerms): void {
  const fields: Array<[string, string]> = [
    ["summary", terms.summary],
    ["labels.item", terms.labels.item],
    ["labels.shipping", terms.labels.shipping],
    ["labels.tax", terms.labels.tax],
  ];

  for (const [field, value] of fields) {
    const fragment = findMoneyLike(value);
    if (fragment) {
      throw new MoneyInModelOutputError(field, fragment);
    }
  }
}

/**
 * The other half of the rule, for the one call where the model *is* given
 * figures (ITD 38).
 *
 * `assertNoMoney` refuses any figure in output where the model was given none.
 * A model writing a sentence over PayPal's record is given figures, so the rule
 * inverts: every numeral it writes must be one of them. Anything else is a
 * figure PayPal did not state, on a screen a shopper prints and keeps.
 *
 * Both digits and words are checked, because "five payments" is as invented as
 * "5 payments". The check is deliberately conservative: in a state where 1 is
 * not a supplied figure, the truthful phrase "one of them" is refused. The
 * fallback is a sentence the server wrote from the facts, so the cost of a
 * false refusal is an explanation, not a fact.
 */

/** A numeral as it appears, with or without a currency marker. */
const NUMERAL_PATTERN = /(?:\$|USD\s*)?\s?\d[\d,]*(?:\.\d+)?/gi;

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

const UNIT_WORDS = Object.keys(NUMBER_WORDS).filter((word) => NUMBER_WORDS[word] < 20);
const WORD_PATTERN = new RegExp(
  `\\b(?:${Object.keys(NUMBER_WORDS).join("|")})(?:-(?:${UNIT_WORDS.slice(1).join("|")}))?\\b`,
  "gi",
);

type Numeral = { text: string; value: number; at: number };

/** "twenty-four" is 24, not 20 and 4. */
function wordValue(token: string): number {
  return token
    .toLowerCase()
    .split("-")
    .reduce((sum, part) => sum + (NUMBER_WORDS[part] ?? 0), 0);
}

function numeralsIn(text: string): Numeral[] {
  const found: Numeral[] = [];

  for (const match of text.matchAll(NUMERAL_PATTERN)) {
    const raw = match[0].trim();
    const value = Number(raw.replace(/usd/gi, "").replace(/[$\s,]/g, ""));
    if (Number.isFinite(value)) found.push({ text: raw, value, at: match.index ?? 0 });
  }

  for (const match of text.matchAll(WORD_PATTERN)) {
    found.push({ text: match[0], value: wordValue(match[0]), at: match.index ?? 0 });
  }

  return found.sort((a, b) => a.at - b.at);
}

export class UnknownNumeralError extends Error {
  constructor(readonly fragment: string) {
    super(`Model output contains a figure it was not given: ${fragment}`);
    this.name = "UnknownNumeralError";
  }
}

/** The first numeral in the text that is not one of `allowed`, or `null`. */
export function findUnknownNumeral(text: string, allowed: number[]): string | null {
  const known = new Set(allowed);
  return numeralsIn(text).find((numeral) => !known.has(numeral.value))?.text ?? null;
}

/** Refuses the whole sentence, because a sentence with one unknown figure is not half right. */
export function assertOnlyKnownNumerals(text: string, allowed: number[]): void {
  const fragment = findUnknownNumeral(text, allowed);
  if (fragment !== null) throw new UnknownNumeralError(fragment);
}
