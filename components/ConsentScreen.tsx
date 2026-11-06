"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommitmentView } from "@/components/CommitmentView";
import { RecognitionCheck } from "@/components/RecognitionCheck";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { CommitmentShape, CommitmentTranslation } from "@/lib/commitment/types";

export type CommitmentPayload = {
  shape: CommitmentShape;
  translation: CommitmentTranslation;
  figures: RenderedFigure[];
  labels: { item: string; shipping: string; tax: string };
  summary: string;
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
  const [payment, setPayment] = useState<PaymentState>(
    cancelled
      ? { status: "cancelled", message: "You left PayPal before approving. Nothing has been charged." }
      : { status: "idle" },
  );
  const captured = useRef(false);

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

      setPayment({
        status: "paid",
        note:
          body.status === "ALREADY_CAPTURED"
            ? "This payment had already been completed. You have been charged once."
            : "Payment complete. PayPal has charged the amount shown above.",
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
      // A repeating commitment is approved at PayPal, not captured: capturing
      // it as an order would charge one period and call it the whole term.
      if (shape === "recurring") {
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
          message: "PayPal needs you to approve this repeating payment.",
          linkLabel: "Approve the subscription with PayPal",
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

  return (
    <section className="consent">
      {payload.degraded ? (
        // Only the wording failed. The figures are calculated from the order
        // itself, so they are still the ones to show.
        <p className="notice">
          We could not write a plain-language summary for this purchase. The figures below are
          still calculated from the order, but the item labels are the seller&apos;s own.
        </p>
      ) : null}

      <CommitmentView
        figures={payload.figures}
        breakdown={payload.translation.breakdown}
        labels={payload.labels}
        summary={payload.summary}
      />

      {payload.degraded ? null : (
        <RecognitionCheck
          amount={payload.translation.today}
          onResult={(matched) => {
            if (matched) return;
            // Saying "no" must take the shopper somewhere, not leave them
            // where they were: focus moves to the itemisation right above.
            const heading = document.getElementById("commitment-breakdown-heading");
            heading?.scrollIntoView?.({ block: "start" });
            heading?.focus();
          }}
        />
      )}

      <p className="commitment-source">
        This is a demonstration store. The check needs only the amount being charged and the terms
        the seller publishes, so it fits any checkout, not just this one.
      </p>

      <div className="consent-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => void pay()}
          disabled={
            returning ||
            payment.status === "paying" ||
            payment.status === "paid" ||
            payment.status === "approve"
          }
        >
          {payment.status === "paying"
            ? "Paying…"
            : payload.shape === "recurring"
              ? "Approve subscription with PayPal"
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
          {payment.note}
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
