/**
 * Somebody else's text, with the spans a figure was read out of marked (IPD 30).
 *
 * The product's claim is that a number can be checked against a sentence. Until
 * now the sentence was quoted under the figure and the seller's paragraph was
 * printed whole beside it, which leaves the reader to find the overlap by eye —
 * the one job a page arguing "you can check this" should not hand back.
 *
 * A span is marked only where it is found character for character. A span that
 * has been re-wrapped, hyphenated or half-quoted gets no mark, because a mark on
 * the wrong words is worse than no mark: it would falsify the only promise the
 * screen makes. Nothing here rewrites the text — the paragraph is always printed
 * whole, in the seller's order.
 */
export function QuotedText({
  text,
  spans,
}: {
  text: string;
  /** Verified spans, most specific first; `null` and empty strings are ignored. */
  spans: (string | null | undefined)[];
}) {
  const wanted = spans.filter((span): span is string => Boolean(span && span.length > 0));

  if (wanted.length === 0) return <>{text}</>;

  const pieces: React.ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length > 0) {
    // The earliest match wins, so two spans never produce overlapping marks and
    // the paragraph's own order decides where each one sits.
    let next: { span: string; at: number } | null = null;
    for (const span of wanted) {
      const at = rest.indexOf(span);
      if (at !== -1 && (next === null || at < next.at)) next = { span, at };
    }

    if (!next) {
      pieces.push(rest);
      break;
    }

    if (next.at > 0) pieces.push(rest.slice(0, next.at));
    pieces.push(
      <mark className="quote-mark" key={`mark-${key++}`}>
        {next.span}
      </mark>,
    );
    rest = rest.slice(next.at + next.span.length);
  }

  return <>{pieces}</>;
}
