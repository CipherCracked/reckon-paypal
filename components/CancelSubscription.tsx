"use client";

import { useEffect, useRef, useState } from "react";

/**
 * What PayPal said about the cancel, and nothing beyond it (ITD 21).
 *
 * Three outcomes, not two. `unconfirmed` is the one that keeps this honest: a
 * request that failed after PayPal had already committed is not evidence that
 * nothing happened, so it is never reported as a refusal.
 */
type CancelOutcome =
  | { outcome: "cancelled" }
  | { outcome: "not-running"; issue?: string | null }
  | { outcome: "unconfirmed" };

type Step = "idle" | "confirm" | "cancelling";

export type CancelSubscriptionProps = {
  subscriptionId: string;
  /** Named in the confirmation, so the person knows which agreement ends. */
  productName: string;
  reference: string;
  /** Where to check when we cannot tell. Never used to ask them to do the work. */
  manageUrl: string;
};

/**
 * Ends a subscription from the record it appears on (IPD 23).
 *
 * Two presses, deliberately: the first opens a sentence saying what will happen
 * and that it cannot be undone here, the second sends it. Cancelling at PayPal
 * is irreversible and this product keeps no state to undo it with, so a stray
 * click must not be able to end an arrangement.
 *
 * Only PayPal's own answer is reported. A success says the subscription is
 * cancelled because PayPal said so; anything else says what PayPal said, or that
 * we could not tell.
 */
export function CancelSubscription({
  subscriptionId,
  productName,
  reference,
  manageUrl,
}: CancelSubscriptionProps) {
  const [step, setStep] = useState<Step>("idle");
  const [outcome, setOutcome] = useState<CancelOutcome | null>(null);
  const warningRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);

  // The warning replaces a button the person was on. Focus goes to the warning
  // itself, so it is read out rather than skipped — and not to the button that
  // would send the request.
  useEffect(() => {
    if (step === "confirm") warningRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (outcome) resultRef.current?.focus();
  }, [outcome]);

  async function cancel() {
    setStep("cancelling");
    setOutcome(null);

    try {
      const response = await fetch(
        `/api/paypal/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
        { method: "POST" },
      );
      const body = (await response.json()) as Partial<CancelOutcome> & { error?: string };

      if (!response.ok || !body.outcome) {
        // No answer about the cancel is not a refusal of it.
        setOutcome({ outcome: "unconfirmed" });
        return;
      }

      setOutcome(body as CancelOutcome);
    } catch {
      setOutcome({ outcome: "unconfirmed" });
    } finally {
      setStep("idle");
    }
  }

  if (outcome) {
    return (
      <p ref={resultRef} tabIndex={-1} role="status" className="cancel-outcome">
        {outcomeSentence(outcome, manageUrl)}
      </p>
    );
  }

  if (step === "confirm" || step === "cancelling") {
    return (
      <div
        ref={warningRef}
        tabIndex={-1}
        className="cancel-warning"
        role="group"
        aria-label="Confirm cancelling this subscription"
      >
        <p>
          Cancel {productName} ({reference})? PayPal will stop taking payments for it. It cannot be
          undone here — if you change your mind you would have to subscribe again.
        </p>
        <div className="cancel-buttons">
          <button
            type="button"
            className="button-primary"
            onClick={cancel}
            disabled={step === "cancelling"}
          >
            {step === "cancelling" ? "Cancelling…" : "Yes, cancel it at PayPal"}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setStep("idle")}
            disabled={step === "cancelling"}
          >
            Keep it running
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="button-secondary cancel-open" onClick={() => setStep("confirm")}>
      Cancel this subscription
    </button>
  );
}

function outcomeSentence(outcome: CancelOutcome, manageUrl: string) {
  switch (outcome.outcome) {
    case "cancelled":
      // PayPal said it, so this product may say it. Nothing further is claimed
      // about money than "PayPal will take no more".
      return "PayPal says this subscription is cancelled. It will take no further payments for it.";
    case "not-running":
      return (
        <>
          PayPal says this subscription is not running, so there was nothing to cancel.
          {outcome.issue ? ` (PayPal's words: ${outcome.issue}.)` : ""}
        </>
      );
    case "unconfirmed":
      return (
        <>
          We cannot tell whether that went through. Check this subscription at PayPal before
          assuming it is cancelled — <a href={manageUrl}>open PayPal&apos;s payment settings</a>.
        </>
      );
  }
}
