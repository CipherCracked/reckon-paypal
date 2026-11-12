"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommitmentView } from "@/components/CommitmentView";
import { PaceControl } from "@/components/PaceControl";
import { RecognitionCheck } from "@/components/RecognitionCheck";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { CommitmentShape, CommitmentTranslation } from "@/lib/commitment/types";
import { describeSources } from "@/lib/commitment/sources";
import { describeApproval } from "@/lib/commitment/approval";
import { DEFAULT_PREFERENCES, readPreferences, savePreference } from "@/lib/preferences";
import { formatMoney } from "@/lib/money";

// The SDK is loaded after the figures, never before them: this screen's first
// job is to be read, and PayPal's script is the button's business (IPD 50,
// ITD 40). The boundary is one component, and the suite stubs that one module.
const PayPalButton = dynamic(() => import("@/components/PayPalButton"), {
  ssr: false,
  loading: () => (
    <p className="commitment-hint" role="status">
      Preparing PayPal&rsquo;s button
    </p>
  ),
});

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
  /** Where the parts the listing does not state are added, when the route knows. */
  unstatedAt?: "checkout" | null;
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

/**
 * Said where the button should have been, when PayPal's script does not arrive.
 * A statement about the script, not about the shopper — which is why it is the
 * only state that also offers the link (IPD 50).
 */
const BUTTON_UNAVAILABLE =
  "PayPal’s button could not be loaded here, so the approval can be opened at PayPal’s own page.";

export function ConsentScreen({
  orderId,
  slug,
  clientId = "",
  environment = "sandbox",
  returning = false,
  cancelled = false,
}: {
  orderId: string;
  slug: string;
  /** PayPal's public client id, decided by the page (ITD 39). Empty means no script. */
  clientId?: string;
  environment?: "sandbox" | "production";
  /** True when the shopper has just come back from approving at PayPal. */
  returning?: boolean;
  /** True when the shopper backed out at PayPal without approving. */
  cancelled?: boolean;
}) {
  const router = useRouter();
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
  /**
   * Where "Yes" sends the shopper: the resting place of the payment control.
   * A container of ours rather than PayPal's own element, because the SDK's DOM
   * is a promise we cannot make (IPD 49).
   */
  const payButton = useRef<HTMLDivElement>(null);

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
          message:
            body.error ??
            "We could not confirm whether PayPal completed this payment. Check your PayPal activity before trying again.",
        });
        return "failed" as const;
      }

      if (body.status === "ALREADY_CAPTURED") {
        setPayment({
          status: "paid",
          note: "This payment had already been completed. You have been charged once.",
        });
        return "complete" as const;
      }

      // Only PayPal's own COMPLETED means the money moved. A capture can come
      // back PENDING — an eCheque, a payment under review — and calling that
      // complete would be a claim about someone's money that PayPal never made.
      if (body.status === "COMPLETED") {
        setPayment({
          status: "paid",
          note: "Payment complete. PayPal has charged the amount shown above.",
        });
        return "complete" as const;
      }

      setPayment({
        status: "pending",
        message:
          "PayPal has accepted this payment but has not completed it yet. It will appear in your PayPal activity when it does.",
      });
      return "pending" as const;
    } catch {
      // The shopper has already approved at PayPal and this was the capture, so
      // no answer is not proof that nothing moved: the request may have died
      // after our own server completed it. "Nothing has been taken" is a
      // sentence only PayPal can write, and the cancel button already refuses
      // to write it.
      setPayment({
        status: "failed",
        message:
          "We could not confirm whether PayPal completed this payment. Check your PayPal activity before trying again.",
      });
      return "failed" as const;
    }
  }, []);

  // Coming back from PayPal means the payer approved; the money moves only
  // when the server captures, so that is the first thing this screen does.
  useEffect(() => {
    if (!returning || captured.current) return;
    captured.current = true;
    void captureApprovedOrder(orderId);
  }, [returning, orderId, captureApprovedOrder]);

  const goToRecord = useCallback(
    (id: string) => {
      router.push(`/receipt/${encodeURIComponent(id)}?slug=${encodeURIComponent(slug)}`);
    },
    [router, slug],
  );

  /**
   * What PayPal is handed, when the shopper presses its button.
   *
   * The order is made by our route, with the amount the figures printed — the
   * browser chooses nothing (ITD 39). A refusal is the screen's sentence, and
   * the promise is rejected so PayPal's window does not open on nothing.
   */
  const createOrder = useCallback(async () => {
    setPayment({ status: "paying" });

    try {
      const response = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as { orderId?: string; error?: string };

      if (!response.ok || !body.orderId) {
        setPayment({
          status: "failed",
          message: body.error ?? "PayPal could not set up this payment. Nothing was charged.",
        });
        throw new Error("No order was created.");
      }

      return { orderId: body.orderId };
    } catch (error) {
      setPayment((current) =>
        current.status === "failed"
          ? current
          : { status: "failed", message: "We could not reach PayPal. No payment has been taken." },
      );
      throw error;
    }
  }, [slug]);

  const createSubscription = useCallback(async () => {
    setPayment({ status: "paying" });

    try {
      const response = await fetch("/api/paypal/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as { subscriptionId?: string; error?: string };

      if (!response.ok || !body.subscriptionId) {
        setPayment({
          status: "failed",
          message: body.error ?? "PayPal could not start this subscription. Nothing was charged.",
        });
        throw new Error("No subscription was created.");
      }

      return { subscriptionId: body.subscriptionId };
    } catch (error) {
      setPayment((current) =>
        current.status === "failed"
          ? current
          : { status: "failed", message: "We could not reach PayPal. No payment has been taken." },
      );
      throw error;
    }
  }, [slug]);

  /**
   * Approval happened here. A subscription is never captured — the receipt
   * re-reads PayPal and states what it reports — while a one-time payment is
   * only complete once the server has captured it (ITD 39).
   */
  const approvedHere = useCallback(
    async (id: string) => {
      if (state.status !== "ready") return;

      if (state.payload.shape === "one_time") {
        const outcome = await captureApprovedOrder(id);
        if (outcome === "complete") goToRecord(id);
        return;
      }

      goToRecord(id);
    },
    [state, captureApprovedOrder, goToRecord],
  );

  async function pay(fallback = false) {
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
          message: fallback
            ? BUTTON_UNAVAILABLE
            : shape === "financed"
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
        message: fallback
          ? BUTTON_UNAVAILABLE
          : "PayPal needs you to approve this payment. You will come straight back here.",
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

  // What PayPal's button will do, in words the screen owns (IPD 48). It is not
  // a fourth figure: it re-says the two figures the page already printed, beside
  // the control, because PayPal's label says "Subscribe" and nothing else.
  const saysWhatTheButtonDoes = describeApproval(payload.shape, payload.figures);

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
        unstatedAt={payload.unstatedAt ?? null}
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

      {/* What the product claims about itself, said once: what the check needs,
          which is the reason it travels to any checkout. What is and is not real
          is the page's footnote now, in one sentence in one place (IPD 29). */}
      <p className="commitment-source">
        The check needs only the amount being charged and the terms the seller publishes, so it
        fits any checkout, not just this one.
      </p>

      {/* IPD 48, as finally built. The decision asked for a sentence of ours
          above PayPal's control saying what approval does; seen in a browser on
          2026-11-12 the reason is plain — the button says "Subscribe" and
          prints no amount at all, so beside it this sentence is the only place
          the money is named. A hairline puts it with the button rather than with
          the paragraph above it, and the group it labels means a screen reader
          hears what pressing it costs before it hears "Subscribe". */}
      {saysWhatTheButtonDoes && payment.status !== "approve" ? (
        <p className="commitment-approval" id="what-the-button-does">
          {saysWhatTheButtonDoes}
        </p>
      ) : null}

      <div
        className="consent-actions"
        ref={payButton}
        tabIndex={-1}
        role="group"
        aria-labelledby={saysWhatTheButtonDoes ? "what-the-button-does" : undefined}
      >
        {payment.status === "approve" ? null : clientId ? (
          <PayPalButton
            shape={payload.shape}
            clientId={clientId}
            environment={environment}
            disabled={
              returning ||
              payment.status === "paying" ||
              payment.status === "paid" ||
              payment.status === "pending"
            }
            createOrder={createOrder}
            createSubscription={createSubscription}
            onApproved={(id) => void approvedHere(id)}
            onCancelled={() =>
              setPayment({
                status: "cancelled",
                message: "You left PayPal before approving. Nothing has been charged.",
              })
            }
            onFailed={() =>
              setPayment((current) =>
                // A sentence that says why has already been set by the route
                // that refused. PayPal's script reports the same rejection as a
                // generic error, and the vaguer sentence must not replace it.
                current.status === "failed"
                  ? current
                  : {
                      status: "failed",
                      message: "PayPal could not complete this payment. Nothing has been charged.",
                    },
              )
            }
            onUnavailable={() => void pay(true)}
          />
        ) : (
          <button
            type="button"
            className="button-primary"
            onClick={() => void pay()}
            disabled={
              returning ||
              payment.status === "paying" ||
              payment.status === "paid" ||
              payment.status === "pending"
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
        )}
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
