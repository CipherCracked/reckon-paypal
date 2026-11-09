"use client";

import { useState } from "react";
import { formatMoney, type Money } from "@/lib/money";

export type RecognitionCheckProps = {
  amount: Money;
  onResult: (matched: boolean) => void;
};

/**
 * An optional check, not a gate. It asks the shopper to recognise a figure
 * already on screen — never to recall or produce one — and skipping it leaves
 * the payment path exactly as it was.
 */
export function RecognitionCheck({ amount, onResult }: RecognitionCheckProps) {
  const [skipped, setSkipped] = useState(false);
  const [matched, setMatched] = useState(false);

  // "Yes" used to call back and change nothing: the shopper answered, got no
  // acknowledgement, and was left staring at the same three buttons. A check
  // that answers silence is worse than no check at all.
  if (matched) {
    return (
      <p className="recognition-skipped" role="status">
        Confirmed: {formatMoney(amount)} is what this screen says you pay today.
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
      <p className="recognition-amount">{formatMoney(amount)}</p>
      <p>Does this match what you expected?</p>
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
