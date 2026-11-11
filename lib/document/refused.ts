import type { Span } from "./verify";

/**
 * The spans the server refused, carried so the screen can show the model being
 * caught (ITD 29).
 *
 * Everything else the product renders is either the document's own words
 * (quoted, verified, marked in the paragraph) or the product's own labels. A
 * refused span is the only text that is **neither**: it is a sentence the model
 * offered and the document does not contain, which is exactly why it was
 * refused. So it may be shown — that is the most convincing thing in the build —
 * and it may never be treated as text (ITD 29).
 *
 * What that means at this level:
 *
 * - It travels in its own field, never mixed into the accepted spans, so no
 *   caller can mistake one for the other by position or by type.
 * - It is capped here, once, rather than at every render site: three spans of
 *   three hundred characters. The count of refusals is the honest total and
 *   stays on the reading; the cap is a fact about what we carry.
 * - It is never given to `parseAmount`, `readQuotations` or `QuotedText`, and
 *   nothing downstream imports it except the one component that shows it.
 *
 * The cap is a judgement, not a fact. A reading with four refused spans shows
 * three and says nothing about the fourth, because "and one more" is a sentence
 * about our limit rather than about the reader's document.
 */
export const REFUSED_SPAN_LIMIT = 3;

/** Long enough for a sentence, short enough that a screen cannot be buried by one. */
export const REFUSED_TEXT_LIMIT = 300;

export type RefusedSpan = {
  /**
   * The field the model claimed the span answered. Kept because it is part of
   * what was refused, and never rendered: `amountPerPeriod` is our vocabulary,
   * and the screen this appears on is for people who came to escape it.
   */
  field: string;
  /** The model's own text, as it sent it. Not the document's, and not shortened silently. */
  text: string;
};

/**
 * Partitions the model's answer by the check that has just run.
 *
 * `verifyQuotations` keeps its shape — it is shared with the seller's published
 * text (ITD 18), and a reader there has nothing to show — so the refused spans
 * are the offered ones the checker did not accept. Identity, not equality: two
 * identical spans offered twice are one accepted and one refused if only one
 * occurred once in the text, and comparing strings would lose that.
 */
export function refusedSpans<T extends Span>(
  offered: readonly T[],
  accepted: readonly T[],
): RefusedSpan[] {
  const taken = new Set<T>(accepted);
  const refused: RefusedSpan[] = [];

  for (const span of offered) {
    if (taken.has(span)) continue;
    if (refused.length === REFUSED_SPAN_LIMIT) break;
    refused.push({ field: span.field, text: clip(span.quote) });
  }

  return refused;
}

/**
 * A cut span ends in an ellipsis, so a reader is never shown a sentence the
 * model did not finish as though it had. Unlike the accepted spans, nothing here
 * is evidence, so shortening it changes no claim — but the cut still has to look
 * like one.
 */
function clip(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= REFUSED_TEXT_LIMIT) return trimmed;
  return `${trimmed.slice(0, REFUSED_TEXT_LIMIT).trimEnd()}…`;
}
