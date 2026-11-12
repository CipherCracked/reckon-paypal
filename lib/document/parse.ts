import { fromDecimalString, type Money } from "../money";

const AMOUNT = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)|(?:USD)\s?(\d[\d,]*(?:\.\d{1,2})?)/;
const AMOUNT_GLOBAL = new RegExp(AMOUNT.source, "g");

/** "$1,234.5" is a price; "1,234.5" on its own is not, so the marker is required. */
function toMinor(raw: string): Money | null {
  const cleaned = raw.replace(/,/g, "");
  if (!cleaned) return null;
  // "$35.5" means 35.50; the processor grammar needs both places.
  const padded = /\.\d$/.test(cleaned) ? `${cleaned}0` : cleaned;
  try {
    return fromDecimalString(padded);
  } catch {
    return null;
  }
}

/**
 * Every amount written in a span. Quotations are checked against the document,
 * but a span containing two different amounts still cannot say which one a
 * field meant, so callers that need one amount use `parseAmount`.
 */
export function parseAmounts(quote: string): Money[] {
  const found = quote.match(AMOUNT_GLOBAL) ?? [];
  return found.flatMap((match) => {
    const inner = AMOUNT.exec(match);
    const raw = inner ? (inner[1] ?? inner[2] ?? "") : "";
    const amount = toMinor(raw);
    return amount ? [amount] : [];
  });
}

/**
 * Exactly one amount, or nothing. Two amounts in one span is an ambiguity, not a
 * choice — and two *equal* amounts are still two: "cancel for $25.00 within
 * three months and $25.00 after" is a conditional fee, and reading it as one
 * unconditional $25.00 would drop the condition that made it a term.
 */
export function parseAmount(quote: string): Money | null {
  const amounts = parseAmounts(quote);
  return amounts.length === 1 ? amounts[0] : null;
}

/**
 * A whole number of payments. Money is stripped first, so "$35.00 for 12
 * months" yields 12 — and a span with two different counts ("1 of 12") yields
 * nothing rather than a guess.
 */
export function parseCount(quote: string): number | null {
  const withoutMoney = quote
    .replace(AMOUNT_GLOBAL, " ")
    .replace(/\d[\d,]*\.\d+/g, " ");
  const found = withoutMoney.match(/\b\d+\b/g) ?? [];
  const distinct = [...new Set(found.map(Number))];
  return distinct.length === 1 && distinct[0] > 0 ? distinct[0] : null;
}

const MONTH_WORDS = /\b(?:month|months|monthly|pcm)\b/i;
const YEAR_WORDS = /\b(?:year|years|yearly|annual|annually|per annum)\b/i;

export function parsePeriod(quote: string): "month" | "year" | null {
  const month = MONTH_WORDS.test(quote);
  const year = YEAR_WORDS.test(quote);
  // Both or neither is not a cadence anyone can act on.
  if (month === year) return null;
  return month ? "month" : "year";
}

/**
 * The length of an agreement, read out of a span that states one (IPD 38).
 *
 * Separate from `parsePeriod`, which answers "how often" for a document and must
 * stay as it is. A listing states "how long", and the two can appear in the same
 * sentence — "12-month subscription, billed monthly".
 *
 * Only the parts of the vocabulary the catalogue actually publishes are read:
 * digits and the spelled numbers a merchant writes by hand ("Six Month"). A
 * count that could be either half of a range is refused, because "1 of 12" says
 * twelve payments but not twelve of anything a span can be multiplied by.
 */
const NUMBER_WORDS: Record<string, number> = {
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
  "twenty-one": 21,
  "twenty one": 21,
  "twenty-two": 22,
  "twenty two": 22,
  "twenty-three": 23,
  "twenty three": 23,
  "twenty-four": 24,
  "twenty four": 24,
};

/** Longest first, so "twenty-four" is not read as "twenty" and a leftover. */
const NUMBER_PATTERN = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|");

const LENGTH_UNITS: Record<string, StatedUnit> = {
  month: "month",
  months: "month",
  year: "year",
  years: "year",
  week: "week",
  weeks: "week",
  day: "day",
  days: "day",
};

export type StatedUnit = "month" | "year" | "week" | "day";

export type StatedLength = { count: number; unit: StatedUnit };

function numberValue(raw: string): number | null {
  const digits = Number(raw);
  if (Number.isInteger(digits) && digits > 0) return digits;
  return NUMBER_WORDS[raw.toLowerCase()] ?? null;
}

/**
 * The length a span states, or nothing when it states one ambiguously.
 *
 * `null` is the safe answer: a span the parser cannot read with certainty is a
 * span the term layer treats as absent, and an absent term is a price rather
 * than a schedule with the wrong number in it.
 */
export function parseStatedLength(quote: string): StatedLength | null {
  // "1 of 12 months" states a position, not a length.
  if (/\b\d+\s+of\s+\d+\b/i.test(quote)) return null;

  const pattern = new RegExp(
    `\\b(${NUMBER_PATTERN}|\\d{1,3})\\s*[- ]?\\s*(months?|years?|weeks?|days?)\\b`,
    "gi",
  );

  const counts = new Set<number>();
  const units = new Set<StatedUnit>();
  for (const match of quote.matchAll(pattern)) {
    const count = numberValue(match[1]);
    const unit = LENGTH_UNITS[match[2].toLowerCase()];
    if (count === null || !unit) continue;
    counts.add(count);
    units.add(unit);
  }

  // Two different counts, or two different units, is not one length.
  if (counts.size !== 1 || units.size !== 1) return null;

  return { count: [...counts][0], unit: [...units][0] };
}

const EVERY_PERIOD = new RegExp(
  `\\bevery\\s+(${NUMBER_PATTERN}|\\d{1,3})\\s+(months?|weeks?|days?|years?)\\b`,
  "i",
);

const NON_MONTHLY =
  /\b(quarterly|quarter|annual|annually|yearly|per\s+year|each\s+year|every\s+year|per\s+annum|weekly|biweekly|bi-weekly|fortnightly|daily|per\s+week|per\s+day|every\s+week|every\s+day)\b/i;

const MONTHLY = /\b(monthly|per\s+month|each\s+month|every\s+month|month[- ]to[- ]month|a\s+month)\b/i;

/**
 * Whether a span says the charges fall due monthly, on some other schedule, or
 * not at all (IPD 38).
 *
 * The answer is deliberately coarse. A monthly schedule is the only one this
 * product can build, so every other period — quarterly, annually, every 90 days,
 * every two weeks — is the same answer to the caller: stated, and not monthly.
 * "Every three months" is not read as "quarterly", because that is arithmetic
 * the merchant did not write.
 */
export function parseCadence(quote: string): "month" | "other" | null {
  const every = EVERY_PERIOD.exec(quote);
  if (every) {
    const count = numberValue(every[1]);
    const unit = LENGTH_UNITS[every[2].toLowerCase()];
    return count === 1 && unit === "month" ? "month" : "other";
  }

  if (NON_MONTHLY.test(quote)) return "other";
  if (MONTHLY.test(quote)) return "month";
  return null;
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthIndex(word: string, long: boolean): number {
  const lower = word.toLowerCase();
  return MONTH_NAMES.findIndex((name) =>
    long ? name === lower : name.slice(0, 3) === lower.slice(0, 3) && lower.length >= 3,
  );
}

/**
 * A date written one of the three ways a document writes one without ambiguity.
 * Day/month/year numbers (`03/04/2026`) are refused: which number is the month
 * cannot be recovered from the text, and a wrong due date is worse than none.
 */
export function parseDate(quote: string): string | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(quote);
  if (iso) {
    return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dayFirst = /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/.exec(quote);
  if (dayFirst) {
    const month = monthIndex(dayFirst[2], dayFirst[2].length > 3);
    return month === -1 ? null : toIso(Number(dayFirst[3]), month + 1, Number(dayFirst[1]));
  }

  const monthFirst = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/.exec(quote);
  if (monthFirst) {
    const month = monthIndex(monthFirst[1], monthFirst[1].length > 3);
    return month === -1 ? null : toIso(Number(monthFirst[3]), month + 1, Number(monthFirst[2]));
  }

  return null;
}
