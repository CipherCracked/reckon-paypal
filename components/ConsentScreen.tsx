"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommitmentView } from "@/components/CommitmentView";
import { PaceControl } from "@/components/PaceControl";
import { RecognitionCheck } from "@/components/RecognitionCheck";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { CommitmentShape, CommitmentTranslation } from "@/lib/commitment/types";
import { describeSources } from "@/lib/commitment/sources";
import { DEFAULT_PREFERENCES, readPreferences, savePreference } from "@/lib/preferences";
import { formatMoney } from "@/lib/money";

export type CommitmentPayload = {
  shape: CommitmentShape;
  translation: CommitmentTranslation;
  figures: RenderedFigure[];
  schedule: string;
  labels: { item: string; shipping: string; tax: string };
  summary: string;
  /** Where the route read the terms from, decided server-side (ITD 17). */
  sources: { paypal: string | null; published: string | null };
  /** Why the exit figure has no amount, when it has none (IPD 19). */
  exitNote: string | null;
  /** True when that absence is a failed read rather than the seller's silence. */
  exitUnreadable: boolean;
  degraded: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; payload: CommitmentPayload }
  | { status: "unavailable"; message: string };

type PaymentState =
  | { status: "idle" }
  | { status: "paying" }
  | { status: "cancelled"; message: string }
  | { status: "approve"; url: string; message: string; linkLabel: string }
  | { status: "paid"; note: string }
  /** PayPal accepted the capture but has not completed it. Not a payment yet. */
  | { status: "pending"; message: string }
  | { status: "failed"; message: string };

export function ConsentScreen({
  orderId,
  slug,
  returning = false,
  cancelled = false,
}: {
  orderId: string;
  slug: string;
  /** True when the shopper has just come back from approving at PayPal. */
  returning?: boolean;
  /** True when the shopper backed out at PayPal without approving. */
  cancelled?: boolean;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Only the pacing preference is this screen's business: the text size belongs
  // to the frame and is set there (IPD 24), so this screen never writes it.
  const [progressive, setProgressive] = useState(DEFAULT_PREFERENCES.progressive);
  const [payment, setPayment] = useState<PaymentState>(
    cancelled
      ? { status: "cancelled", message: "You left PayPal before approving. Nothing has been charged." }
      : { status: "idle" },
  );
  const captured = useRef(false);
  /** Where "Yes" sends the shopper: the next step, not the place they stood. */
  const payButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/commitment/${encodeURIComponent(orderId)}?slug=${encodeURIComponent(slug)}`,
      );

      if (!response.ok) {
        setState({
          status: "unavailable",
          message: "We could not load this purchase. No payment has been taken.",
        });
        return;
      }

      setState({ status: "ready", payload: (await response.json()) as CommitmentPayload });
    } catch {
      setState({
        status: "unavailable",
        message: "We could not reach the payment service. No payment has been taken.",
      });
    }
  }, [orderId, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  // Read once on mount: the stored preference is the reader's, not ours, and it
  // must not cause a hydration mismatch by being read during render.
  useEffect(() => {
    setProgressive(readPreferences().progressive);
  }, []);

  function updateProgressive(next: boolean) {
    setProgressive(next);
    // Merged with what is stored, so choosing a pacing here cannot overwrite a
    // text size chosen in the frame (IPD 24).
    savePreference("progressive", next);
  }

  const captureApprovedOrder = useCallback(async (id: string) => {
    setPayment({ status: "paying" });

    try {
      const response = await fetch(`/api/paypal/orders/${encodeURIComponent(id)}/capture`, {
        method: "POST",
      });
      const body = (await response.json()) as { status?: string; error?: string };

      if (!response.ok) {
        setPayment({
          status: "failed",
          message: body.error ?? "PayPal could not complete this payment. Nothing was charged twice.",
        });
        return;
      }

      if (body.status === "ALREADY_CAPTURED") {
        setPayment({
          status: "paid",
          note: "This payment had already been completed. You have been charged once.",
        });
        return;
      }

      // Only PayPal's own COMPLETED means the money moved. A capture can come
      // back PENDING — an eCheque, a payment under review — and calling that
      // complete would be a claim about someone's money that PayPal never made.
      if (body.status === "COMPLETED") {
        setPayment({
          status: "paid",
          note: "Payment complete. PayPal has charged the amount shown above.",
        });
        return;
      }

      setPayment({
        status: "pending",
        message:
          "PayPal has accepted this payment but has not completed it yet. It will appear in your PayPal activity when it does.",
      });
    } catch {
      setPayment({
        status: "failed",
        message: "We could not reach PayPal. No payment has been taken.",
      });
    }
  }, []);

  // Coming back from PayPal means the payer approved; the money moves only
  // when the server captures, so that is the first thing this screen does.
  useEffect(() => {
    if (!returning || captured.current) return;
    captured.current = true;
    void captureApprovedOrder(orderId);
  }, [returning, orderId, captureApprovedOrder]);

  async function pay() {
    if (state.status !== "ready") return;
    const { shape } = state.payload;
    setPayment({ status: "paying" });

    try {
      // A commitment paid over time is approved at PayPal, not captured: it is
      // a plan, and capturing it as an order would charge one period and call it
      // the whole term. That covers a repeating term and a financed purchase
      // alike — both are twelve charges the screen promises and PayPal must
      // schedule.
      if (shape === "recurring" || shape === "financed") {
        const response = await fetch("/api/paypal/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const body = (await response.json()) as { approveUrl?: string | null; error?: string };

        if (!response.ok || !body.approveUrl) {
          setPayment({
            status: "failed",
            message: body.error ?? "PayPal could not start this subscription. Nothing was charged.",
          });
          return;
        }

        setPayment({
          status: "approve",
          url: body.approveUrl,
          message:
            shape === "financed"
              ? "PayPal needs you to approve this payment plan."
              : "PayPal needs you to approve this repeating payment.",
          linkLabel:
            shape === "financed"
              ? "Approve the payment plan with PayPal"
              : "Approve the subscription with PayPal",
        });
        return;
      }

      // The order is created here rather than earlier so the shopper goes
      // straight from this screen to PayPal's approval page and back.
      const response = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as { approveUrl?: string | null; error?: string };

      if (!response.ok || !body.approveUrl) {
        setPayment({
          status: "failed",
          message: body.error ?? "PayPal could not set up this payment. Nothing was charged.",
        });
        return;
      }

      setPayment({
        status: "approve",
        url: body.approveUrl,
        message: "PayPal needs you to approve this payment. You will come straight back here.",
        linkLabel: "Approve the payment with PayPal",
      });
    } catch {
      setPayment({
        status: "failed",
        message: "We could not reach PayPal. No payment has been taken.",
      });
    }
  }

  if (state.status === "loading") {
    return (
      <section className="consent" aria-busy="true">
        <p>Reading the terms for this purchase…</p>
        <p className="field-hint">
          This usually takes a second or two. Nothing is charged while the page fetches what the
          seller publishes.
        </p>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section className="consent">
        <p className="notice">{state.message}</p>
        <button type="button" className="button-secondary" onClick={() => void load()}>
          Try again
        </button>
      </section>
    );
  }

  const { payload } = state;

  // The check shows one figure, so it says which one. Without that, a large
  // "$12.00" under a panel whose largest figure is $144.00 reads as a
  // contradiction instead of a different question.
  const acrossTerm = payload.figures.find((figure) => figure.id === "acrossTerm") ?? null;
  const sameMoney =
    acrossTerm?.amount != null && acrossTerm.amount.minor === payload.translation.today.minor;
  const checkNote = sameMoney
    ? "This is also the whole cost — the same figure as “Across the term”, not a second charge."
    : acrossTerm?.amount
      ? `This is today's charge. Across the term the page says ${acrossTerm.floor ? "at least " : ""}${formatMoney(acrossTerm.amount)}.`
      : "This is today's charge, not the total across the term.";

  return (
    <section className="consent">
      {payload.degraded ? (
        // Only the wording failed. The figures are calculated from the order
        // itself, so they are still the ones to show.
        <p className="notice">
          We could not write a plain-language summary for this purchase. The figures below are
          still calculated from the order; only that sentence is missing.
        </p>
      ) : null}

      <CommitmentView
        figures={payload.figures}
        breakdown={payload.translation.breakdown}
        labels={payload.labels}
        summary={payload.summary}
        schedule={payload.schedule}
        progressive={progressive}
        figureNotes={payload.exitNote ? { exit: payload.exitNote } : undefined}
        sourceNote={describeSources({
          paypal: payload.sources.paypal,
          published: payload.sources.published,
          // No `absent` clause: the absent figure already carries the reason
          // under it (`exitNote`), and "Nobody published…" was a claim this
          // screen could not support for a retail listing — the catalogue has
          // no such field, which is not the same as no one publishing it.
          absent: null,
        })}
      />

      <div className="consent-adjust">
        <PaceControl progressive={progressive} onProgressive={updateProgressive} />
      </div>

      {payload.degraded ? null : (
        <RecognitionCheck
          amount={payload.translation.today}
          label="Today's charge"
          note={checkNote}
          onResult={(matched) => {
            if (matched) {
              payButton.current?.focus();
              return;
            }
            // Saying "no" must take the shopper somewhere, not leave them
            // where they were: focus moves to the itemisation right above.
            const heading = document.getElementById("commitment-breakdown-heading");
            heading?.scrollIntoView?.({ block: "start" });
            heading?.focus();
          }}
        />
      )}

      {/* The product states its own status exactly once, here, where money is
          involved (IPD 14). Everything else about what is and is not real
          belongs to the judge brief outside the product (IPD 16). */}
      <p className="commitment-source">
        This shop is an example, and payments run in PayPal&apos;s sandbox, so no real money moves.
        The check needs only the amount being charged and the terms the seller publishes, so it
        fits any checkout, not just this one.
      </p>

      <div className="consent-actions">
        <button
          ref={payButton}
          type="button"
          className="button-primary"
          onClick={() => void pay()}
          disabled={
            returning ||
            payment.status === "paying" ||
            payment.status === "paid" ||
            payment.status === "pending" ||
            payment.status === "approve"
          }
        >
          {payment.status === "paying"
            ? "Paying…"
            : payload.shape === "recurring"
              ? "Approve subscription with PayPal"
              : payload.shape === "financed"
                ? "Approve payment plan with PayPal"
                : "Pay now"}
        </button>
      </div>

      {payment.status === "approve" ? (
        <p className="notice" role="status">
          {payment.message}{" "}
          <a className="button-secondary" href={payment.url} rel="noopener noreferrer">
            {payment.linkLabel}
          </a>
        </p>
      ) : null}

      {payment.status === "paid" ? (
        <p className="notice-success" role="status">
          {payment.note}{" "}
          <a
            className="button-secondary"
            href={`/receipt/${encodeURIComponent(orderId)}?slug=${encodeURIComponent(slug)}`}
          >
            Keep a record of this payment
          </a>
        </p>
      ) : null}

      {payment.status === "pending" ? (
        <p className="notice" role="status">
          {payment.message}
        </p>
      ) : null}

      {payment.status === "cancelled" ? (
        <p className="notice" role="status">
          {payment.message}
        </p>
      ) : null}

      {payment.status === "failed" ? (
        <p className="notice" role="alert">
          {payment.message}
        </p>
      ) : null}
    </section>
  );
}
