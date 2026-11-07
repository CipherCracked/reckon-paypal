"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { CommitmentBreakdown } from "@/lib/commitment/types";

export type CommitmentViewProps = {
  /** Already ordered by the server: the screen renders what it is given. */
  figures: RenderedFigure[];
  breakdown: CommitmentBreakdown;
  labels: { item: string; shipping: string; tax: string };
  summary: string;
  /** When the money leaves, in one sentence — a fact, not a fourth figure. */
  schedule?: string | null;
  /** What to say instead of the default sentence when a figure is absent. */
  figureNotes?: Partial<Record<RenderedFigure["id"], string>>;
  /**
   * Where the figures came from, built with `describeSources` (IPD 18). Required:
   * a default here was once right for two callers and false for three, and the
   * callers that were wrong were never told.
   */
  sourceNote: string;
  /** Reveal the figures one at a time, at the reader's pace. */
  progressive?: boolean;
};

export function CommitmentView({
  figures,
  breakdown,
  labels,
  summary,
  schedule = null,
  figureNotes,
  sourceNote,
  progressive = false,
}: CommitmentViewProps) {
  const [revealed, setRevealed] = useState(figures.length);

  useEffect(() => {
    setRevealed(progressive ? 1 : figures.length);
  }, [progressive, figures.length]);

  const more = progressive && revealed < figures.length;

  return (
    <section className="commitment" aria-labelledby="commitment-heading">
      <h2 id="commitment-heading">What this commitment asks of you</h2>

      {summary ? <p className="commitment-summary">{summary}</p> : null}

      {schedule ? (
        <p className="commitment-schedule" data-schedule="terms">
          {schedule}
        </p>
      ) : null}

      <dl className="commitment-figures">
        {figures.map((figure, index) => (
          <div
            className="commitment-figure"
            key={figure.id}
            data-figure={figure.id}
            // Visually held back, but never removed: a reader who navigates by
            // list still gets every figure.
            data-held={index >= revealed ? "true" : undefined}
          >
            <dt>{figure.label}</dt>
            <dd>
              {figure.amount === null ? (
                <>
                  Not stated
                  {/* No default: a generic sentence here once said "the seller
                      published nothing" for a read that had failed, and for any
                      figure, not just the exit one. The caller knows which
                      absence this is; a component cannot guess it. */}
                  {figureNotes?.[figure.id] ? (
                    <span className="commitment-hint">{figureNotes[figure.id]}</span>
                  ) : null}
                </>
              ) : (
                formatMoney(figure.amount)
              )}
              {figure.arithmetic ? (
                <span className="commitment-arithmetic">{figure.arithmetic}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {more ? (
        <button
          type="button"
          className="button-secondary"
          onClick={() => setRevealed((current) => Math.min(current + 1, figures.length))}
        >
          Show the next figure
        </button>
      ) : null}

      <h3 id="commitment-breakdown-heading" tabIndex={-1}>
        Where these figures come from
      </h3>
      <dl className="commitment-breakdown">
        <div>
          <dt>{labels.item}</dt>
          <dd>{formatMoney(breakdown.item)}</dd>
        </div>
        <div>
          <dt>{labels.shipping}</dt>
          <dd>{formatMoney(breakdown.shipping)}</dd>
        </div>
        <div>
          <dt>{labels.tax}</dt>
          <dd>{formatMoney(breakdown.tax)}</dd>
        </div>
      </dl>

      <p className="commitment-source">
        {sourceNote}
      </p>
    </section>
  );
}
