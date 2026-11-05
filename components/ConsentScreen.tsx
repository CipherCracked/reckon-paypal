"use client";

import { useCallback, useEffect, useState } from "react";
import { CommitmentView } from "@/components/CommitmentView";
import { RecognitionCheck } from "@/components/RecognitionCheck";
import { formatMoney } from "@/lib/money";
import type { CommitmentShape, CommitmentTranslation } from "@/lib/commitment/types";

export type CommitmentPayload = {
  shape: CommitmentShape;
  translation: CommitmentTranslation;
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
  | { status: "approve"; url: string }
  | { status: "paid"; note: string }
  | { status: "failed"; message: string };

export function ConsentScreen({ orderId, slug }: { orderId: string; slug: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [payment, setPayment] = useState<PaymentState>({ status: "idle" });

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

        setPayment({ status: "approve", url: body.approveUrl });
        return;
      }

      const response = await fetch(
        `/api/paypal/orders/${encodeURIComponent(orderId)}/capture`,
        { method: "POST" },
      );
      const body = (await response.json()) as { status?: string; amount?: unknown; error?: string };

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
        <>
          <p className="notice">
            We could not read the terms for this purchase. Here is the amount PayPal will charge.
          </p>
          <p className="consent-amount">{formatMoney(payload.translation.today)}</p>
        </>
      ) : (
        <>
          <CommitmentView
            translation={payload.translation}
            labels={payload.labels}
            summary={payload.summary}
          />
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
        </>
      )}

      <div className="consent-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => void pay()}
          disabled={
            payment.status === "paying" || payment.status === "paid" || payment.status === "approve"
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
          PayPal needs you to approve this repeating payment.{" "}
          <a className="button-secondary" href={payment.url} rel="noopener noreferrer">
            Approve the subscription with PayPal
          </a>
        </p>
      ) : null}

      {payment.status === "paid" ? (
        <p className="notice-success" role="status">
          {payment.note}
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
