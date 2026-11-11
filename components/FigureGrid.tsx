import { formatMoney } from "@/lib/money";
import type { RenderedFigure } from "@/lib/commitment/present";

/**
 * The three figures, in one place (ITD 25).
 *
 * Across the term, cost to leave and charged today were rendered three different
 * ways: as `.commitment-figure` on the screens that decide, as a hand-rolled
 * grid on the receipt, and as `.account-figure` in a list. The data was the same
 * every time; only the layout was decided three times, so the product's central
 * object looked like three different objects.
 *
 * `full` is the version the product exists for: every figure with the arithmetic
 * that produced it and, where it was read out of a sentence, that sentence. The
 * ordering is the caller's — it is already the server's (ITD 17) — because the
 * order is an argument about what matters, not a rendering choice.
 *
 * `compact` is the list version: no quotation, because a row that carried the
 * seller's paragraphs would be a page. It keeps the arithmetic, which is what
 * makes a summary checkable rather than a claim.
 */
export function FigureGrid({
  figures,
  variant = "full",
  figureNotes,
  figureExtras,
  heldFrom,
}: {
  figures: RenderedFigure[];
  variant?: "full" | "compact";
  /** What to say instead of "Not stated", per figure — the caller knows which absence this is. */
  figureNotes?: Partial<Record<RenderedFigure["id"], string>>;
  /**
   * Anything the figure carries beyond itself: the record's cancel button under
   * the cost to leave, and the note that the term total is what the agreement
   * was rather than what it will cost. The caller owns them because they are
   * statements about this commitment, not about how figures are drawn.
   */
  figureExtras?: Partial<Record<RenderedFigure["id"], React.ReactNode>>;
  /** From this index on, hold the figure back visually (never remove it). */
  heldFrom?: number;
}) {
  const compact = variant === "compact";

  return (
    <dl className={compact ? "account-figures" : "commitment-figures"}>
      {figures.map((figure, index) => (
        <div
          className={compact ? "account-figure" : "commitment-figure"}
          key={figure.id}
          data-figure={figure.id}
          // A figure that carries the seller's sentence is marked, so the quote
          // and its figure can wear the same rule (IPD 29) without the layout
          // having to know which figure was the quoted one.
          data-quoted={!compact && figure.source ? "true" : undefined}
          data-held={heldFrom !== undefined && index >= heldFrom ? "true" : undefined}
        >
          <dt>{figure.label}</dt>
          <dd>
            {figure.amount === null ? (
              <>
                Not stated
                {figureNotes?.[figure.id] ? (
                  <span className="commitment-hint">{figureNotes[figure.id]}</span>
                ) : null}
              </>
            ) : (
              // A floor, not a total: the source stated these parts and no
              // others, so "At least" is the only honest word for it. It is a
              // word, not a figure, so it is set as one — at display size it
              // read as a second number.
              <>
                {figure.floor ? <span className="commitment-floor">At least </span> : null}
                {formatMoney(figure.amount)}
              </>
            )}
            {figure.arithmetic ? (
              <span className="commitment-arithmetic">{figure.arithmetic}</span>
            ) : null}
            {!compact && figure.source ? (
              // The seller's sentence, in their words, under the figure it
              // produced — the trace the whole product exists to show (ITD 19).
              // Not clamped: a quoted sentence that has been shortened is no
              // longer the span that was checked.
              <span className="commitment-quote">
                <q>{figure.source.span}</q>{" "}
                <span className="commitment-quote-source">— {figure.source.label}</span>
              </span>
            ) : null}
            {figureExtras?.[figure.id] ?? null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
