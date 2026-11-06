const MONEY_SPAN = /\$\s?\d[\d,]*(?:\.\d{1,2})?|(?:USD)\s?\d[\d,]*(?:\.\d{1,2})?/g;
const DATE_SPAN =
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{4}\b|\b[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}\b/g;

/** Enough to show the reader their own document, not enough to be a summary of it. */
const LIMIT = 12;

function distinct(spans: string[]): string[] {
  return [...new Set(spans.map((span) => span.trim()))].slice(0, LIMIT);
}

export type Candidates = {
  amounts: string[];
  dates: string[];
};

/**
 * What can be found without understanding anything (ITD 12). These are spans of
 * the shopper's text, in their own words — never figures the product computed,
 * and never labelled as what the document costs.
 */
export function findCandidates(text: string): Candidates {
  return {
    amounts: distinct(text.match(MONEY_SPAN) ?? []),
    dates: distinct(text.match(DATE_SPAN) ?? []),
  };
}
