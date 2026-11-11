"use client";

import { useState } from "react";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { RefusedSpan } from "@/lib/document/refused";

/**
 * What the reader checked, under the figures it produced (IPD 32).
 *
 * The product's strongest engineering is that it does not trust the model: the
 * tool schema has no numeric field, prose containing money is refused, and any
 * span that is not found character for character in the reader's own text is
 * discarded. Until now all of that ended in a sentence with a number in it —
 * *"1 sentence the model offered could not be found in your text and was
 * discarded"* — which is the product catching its own model, presented as
 * arithmetic for a reader who came here to escape arithmetic.
 *
 * This is a closed line of ordinary words, replaced nothing else on the screen:
 * the figures are unchanged and the provenance line is unchanged. Opening it is
 * the whole mechanism for anyone who wants it, including the moment the model
 * was wrong.
 *
 * **This is the only component that renders a refused span** (ITD 29). It shows
 * it as plain text, with no quotation marks around it, no mark inside it, and no
 * arithmetic parsed out of it — because the one thing a refused span is
 * guaranteed not to be is a sentence from the document, and a screen whose
 * promise is that every quotation is in your text cannot afford an invented
 * sentence that looks like one.
 */
export function ReadingCheck({
  quotationCount,
  figures,
  refused,
}: {
  /** How many spans the server accepted. Not a figure, and never money. */
  quotationCount: number;
  /** The figures, for the sentences that were taken. */
  figures: RenderedFigure[];
  /** What the model offered and the check refused. Absent on an older reading. */
  refused?: RefusedSpan[];
}) {
  // The body is not built until the line has been opened once. Closed is the
  // state almost every reader sees, and it has to stay one line — not a panel
  // whose contents are merely hidden, repeating every quotation on the card
  // above it into the page twice over.
  const [opened, setOpened] = useState(false);
  // The sentences that were taken are the figures' own sources — the same spans
  // shown under each figure, listed here so the opened panel answers "what was
  // checked" in one place rather than making the reader scroll the card.
  const taken = figures.flatMap((figure) =>
    figure.source ? [{ figure: figure.label, span: figure.source.span }] : [],
  );
  const refusedCount = refused?.length ?? 0;

  return (
    <div className="reading-check" role="status">
      <details
        onToggle={(event) => {
          // Kept, once opened: closing the line again does not un-build what the
          // reader has already been shown.
          if (event.currentTarget.open) setOpened(true);
        }}
      >
        {/* Two sentences, and the second is the one that matters: the check is
            the claim. It does not change shape when the model was wrong — the
            mistake lives inside, where a reader goes, not where they land
            (IPD 32, option 2 rejected). */}
        <summary>
          Read {quotationCount} sentence{quotationCount === 1 ? "" : "s"} from your document.
          Checked against it word for word.
        </summary>

        {opened ? (
          <div className="reading-check-body">
            <p>
              Every figure was worked out here, not by the model. The model only pointed at
              sentences in your text, and each one it pointed at was compared with what you pasted
              before anything was read out of it.
            </p>

            {taken.length > 0 ? (
              <>
                {/* Named for what it is, not counted: the line above says how
                    many sentences the check passed, and that is a different set
                    from the sentences a figure was read out of — one sentence
                    can produce two figures, and terms that produce no figure
                    still passed. A list headed by the same number would promise
                    five and show three. */}
                <h3 className="reading-check-heading">The sentence behind each figure</h3>
                <ul className="reading-check-taken">
                  {taken.map((item) => (
                    <li key={`${item.figure}:${item.span}`}>
                      <span className="reading-check-taken-figure">{item.figure}</span>
                      <span className="reading-check-taken-span">{item.span}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {refusedCount > 0 ? (
              <section
                className="reading-check-missed"
                aria-labelledby="reading-check-missed-heading"
              >
                <h3 id="reading-check-missed-heading" className="reading-check-heading">
                  What the model offered that is not in your document
                </h3>
                {/* The failure is stated before the text, so the text is never
                    read as a quotation of the reader's own document — not even
                    once, and not even by a reader who skimmed the heading. */}
                <p>
                  The model suggested the following. None of it was found in what you pasted, so
                  nothing was read from it, and no figure on this page depends on it.
                </p>
                <ul className="reading-check-refused">
                  {refused?.map((span) => (
                    // Plain text on purpose: no `<q>`, no `<mark>`, no emphasis.
                    // The refusal is the whole label, and the label is the entire
                    // guarantee (ITD 29).
                    <li key={`${span.field}:${span.text}`}>{span.text}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </details>
    </div>
  );
}
