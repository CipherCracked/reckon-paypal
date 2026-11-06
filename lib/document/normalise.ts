/**
 * One definition of "the same text" for the whole reading path. A quotation is
 * checked against the document the shopper pasted, so a line break, a
 * non-breaking space or a curly apostrophe must not reject a span a human would
 * say was copied exactly (ITD 10).
 */
export function normaliseText(text: string): string {
  return text
    .replace(/[  -   　]/g, " ")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a quotation really occurs in the document. `normalisedDocument` must
 * already have been through `normaliseText` — the caller normalises once and
 * checks many quotes, and naming the parameter this way keeps the cost visible.
 */
export function containsQuote(normalisedDocument: string, quote: string): boolean {
  const needle = normaliseText(quote);
  return needle.length > 0 && normalisedDocument.includes(needle);
}
