import type { ExtractedTerms } from "./types";

/**
 * The whole amount, not just its first digit: reporting "$1" for "$12.00"
 * would tell a reader nothing about what went wrong.
 */
const MONEY_PATTERN = /\$\s?[\d,]+(?:\.\d{2})?|USD\s?[\d,]+(?:\.\d{2})?|\d+\.\d{2}/i;

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
