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

/** Exactly one amount, or nothing. Two amounts in one span is an ambiguity, not a choice. */
export function parseAmount(quote: string): Money | null {
  const amounts = parseAmounts(quote);
  const distinct = amounts.filter(
    (amount, index) => amounts.findIndex((other) => other.minor === amount.minor) === index,
  );
  return distinct.length === 1 ? distinct[0] : null;
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
