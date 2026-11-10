"use client";

import { useState } from "react";
import { formatMoney, type Money } from "@/lib/money";

export type RecognitionCheckProps = {
  amount: Money;
  /** What the figure is, in the same words the figures above use. */
  label: string;
  /** One sentence saying which figure this is, and what the other one is. */
  note: string;
  onResult: (matched: boolean) => void;
};

/**
 * An optional check, not a gate. It asks the shopper to recognise a figure
 * already on screen — never to recall or produce one — and skipping it leaves
 * the payment path exactly as it was.
 *
 * The figure is labelled rather than left bare. A large "$12.00" under a panel
 * headed "Across the term $144.00" asked the shopper to confirm a number the
 * page had never called by that name, so "no, that does not match" was the
 * reasonable answer to a check that was right.
 */
export function RecognitionCheck({ amount, label, note, onResult }: RecognitionCheckProps) {
  const [skipped, setSkipped] = useState(false);
  const [matched, setMatched] = useState(false);

  // "Yes" used to call back and change nothing: the shopper answered, got no
  // acknowledgement, and was left staring at the same three buttons. A check
  // that answers silence is worse than no check at all.
  if (matched) {
    return (
      <p className="recognition-skipped" role="status">
        Confirmed: {formatMoney(amount)} is the figure shown under &ldquo;{label}&rdquo;.
      </p>
    );
  }

  if (skipped) {
    return (
      <p className="recognition-skipped" role="status">
        Check skipped. Your figures have not changed.
      </p>
    );
  }

  return (
    <section className="recognition" aria-labelledby="recognition-heading">
      <h2 id="recognition-heading">Optional check</h2>
      <p className="recognition-label">{label}</p>
      <p className="recognition-amount">{formatMoney(amount)}</p>
      <p className="recognition-note">{note}</p>
      <p>Does that match what you expected?</p>
      <div className="recognition-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            setMatched(true);
            onResult(true);
          }}
        >
          Yes
        </button>
        <button type="button" className="button-secondary" onClick={() => onResult(false)}>
          No, show me the breakdown
        </button>
        <button type="button" className="button-quiet" onClick={() => setSkipped(true)}>
          Skip this check
        </button>
      </div>
    </section>
  );
}
