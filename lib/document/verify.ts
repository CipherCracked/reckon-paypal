import { containsQuote } from "./normalise";

/**
 * The one place a model's span is checked before it can become a figure.
 *
 * The model is asked to copy, so the test of whether it did is literal: a span
 * that does not occur in the source is discarded and counted. Both readers —
 * the one for a document the shopper pasted and the one for the seller's own
 * published text (ITD 18) — go through here, so neither can be the lenient one.
 */
export type Span = { field: string; quote: string };

export function verifyQuotations<T extends Span>(
  quotations: T[],
  /** Must already have been through `normaliseText`. */
  normalisedSource: string,
): { accepted: T[]; rejected: number } {
  const accepted: T[] = [];
  let rejected = 0;

  for (const quotation of quotations) {
    if (containsQuote(normalisedSource, quotation.quote)) {
      accepted.push(quotation);
    } else {
      rejected += 1;
    }
  }

  return { accepted, rejected };
}
