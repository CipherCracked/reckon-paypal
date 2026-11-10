import Link from "next/link";
import { CommitmentRecord, type RecordStanding } from "@/components/CommitmentRecord";
import { resolveProduct } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { describeSources } from "@/lib/commitment/sources";
import type { CommitmentTerms } from "@/lib/commitment/types";
import { MODEL_READ_DEADLINE_MS, withBudget } from "@/lib/deadline";
import { zeroMoney, type Money } from "@/lib/money";
import { paypalBaseUrl } from "@/lib/paypal/client";
import { isSettled, retrieveOrder, retrieveSubscription } from "@/lib/paypal/retrieve";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ slug?: string }>;
};

function manageUrl(): string {
  const sandbox = paypalBaseUrl().includes("sandbox");
  return `https://www.${sandbox ? "sandbox." : ""}paypal.com/myaccount/autopay/`;
}

/**
 * The end of the journey (IPD 15). A payment that PayPal has not confirmed has
 * no record to show, and a confirmed one is the last screen rather than a stop:
 * it offers the two ways on, and no way back into the payment.
 *
 * The figures are PayPal's, not the shop's (ITD 17). A record that restated the
 * catalogue would be a claim about a payment that may never have been made, on
 * the one screen a shopper keeps.
 */
export default async function ReceiptPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { slug } = await searchParams;
  const resolved = slug ? await resolveProduct(slug) : null;

  if (!resolved) {
    return (
      <div className="page">
        <p className="notice">This record is for a purchase this store does not recognise.</p>
        <RecordExits />
      </div>
    );
  }

  const recurring = resolved.terms.shape === "recurring";
  const financed = resolved.terms.shape === "financed";
  // Both are scheduled by PayPal and both come back as a subscription id. Only
  // a one-time purchase comes back as an order.
  const scheduled = recurring || financed;

  let status: string;
  let nextBillingTime: string | null = null;
  let statusChangeTime: string | null = null;
  let paypalAmount: Money | null = null;
  let planTerms: CommitmentTerms | null = null;

  try {
    if (scheduled) {
      const subscription = await retrieveSubscription(orderId);
      status = subscription.status;
      nextBillingTime = subscription.nextBillingTime;
      statusChangeTime = subscription.statusChangeTime;
      paypalAmount = subscription.amount;
      planTerms = subscription.terms;
    } else {
      const record = await retrieveOrder(orderId);
      status = record.status;
      paypalAmount = record.amount;
    }
  } catch {
    return (
      <div className="page">
        <p className="notice">
          We cannot confirm this payment with PayPal right now, so there is no record to show.
          Nothing has been charged twice — check PayPal directly if you are unsure.
        </p>
        <RecordExits />
      </div>
    );
  }

  if (!isSettled(status)) {
    return (
      <div className="page">
        <p className="notice">
          PayPal has not confirmed this payment, so there is nothing to record yet. Nothing has
          been taken.
        </p>
        <RecordExits />
      </div>
    );
  }

  // The third figure is the seller's, as everywhere else (IPD 19). The reading
  // is a model call, so it carries the same budget the bill page gives it: a
  // record that waited most of a minute would be a record nobody reads.
  const exitOutcome = await withBudget(
    resolveExitTerm(resolved.terms.exit, resolved.description, resolved.descriptionLabel, {
      retries: 0,
    }),
    MODEL_READ_DEADLINE_MS,
    {
      kind: "unreadable",
      exit: { kind: "unknown" },
      note: EXIT_UNREADABLE_NOTE,
      quoted: null,
    } satisfies ExitOutcome,
  );
  const exit = exitOutcome.exit;

  // What was charged is PayPal's own amount. What it adds up to is our
  // arithmetic over PayPal's numbers — the plan's price and its cycle count.
  //
  // A plan is the better source for both shapes now. For a financed purchase
  // the plan's `setup_fee` is the only place PayPal states the opening fee, so
  // falling back to the catalogue file would show a term total PayPal is not
  // collecting.
  let terms: CommitmentTerms | null;
  if (scheduled) {
    terms = planTerms ? { ...planTerms, exit } : financed ? { ...resolved.terms, exit } : null;
  } else {
    terms = paypalAmount
      ? {
          shape: "one_time",
          itemPrice: paypalAmount,
          shipping: zeroMoney(),
          tax: zeroMoney(),
          exit,
        }
      : null;
  }

  const translation = terms ? computeCommitment(terms) : null;

  // Two figures for one payment is not a record. Say so rather than pick one.
  if (translation && paypalAmount && translation.today.minor !== paypalAmount.minor) {
    return (
      <div className="page">
        <p className="notice">
          PayPal charged a different amount from the one these terms add up to, so no record is
          shown. Check the payment with PayPal directly.
        </p>
        <RecordExits />
      </div>
    );
  }

  const paypalLabel =
    scheduled && planTerms
      ? "the PayPal plan for this payment"
      : !scheduled && paypalAmount
        ? "PayPal's copy of this order"
        : null;

  // When the plan could not be read but the seller's terms and PayPal's amount
  // agree, the record says which of the two it is showing. A financed purchase
  // is the case this exists for: its figures are the seller's instalment terms,
  // checked against what PayPal took.
  const publishedLabel =
    scheduled && !planTerms && financed
      ? "the seller's published instalment terms, with today's charge agreeing with PayPal"
      : null;

  const sourceNote =
    paypalLabel || publishedLabel
      ? describeSources({ paypal: paypalLabel, published: publishedLabel })
      : "PayPal confirmed this payment and did not return an amount for it.";

  const nextDate = nextBillingTime ? new Date(nextBillingTime) : null;

  // Only PayPal's own state decides whether the record offers to end the
  // subscription: a button on a commitment it has already ended would be a lie
  // about what pressing it does (IPD 23).
  //
  // A financed plan gets no such button even when PayPal reports it active. It
  // is a scheduled plan, so PayPal will stop the charges — but what ending an
  // instalment agreement does to the money still owed is a fact nobody stated,
  // and this screen does not offer an act whose consequence it cannot show.
  const standing: RecordStanding | null =
    recurring && status === "ACTIVE"
      ? { kind: "running", subscriptionId: orderId }
      : recurring && status === "CANCELLED"
        ? { kind: "cancelled", at: statusChangeTime ? new Date(statusChangeTime) : null }
        : null;

  return (
    <div className="page">
      <CommitmentRecord
        productName={resolved.name}
        reference={orderId}
        paidToday={translation?.today ?? null}
        acrossTerm={translation?.acrossTerm ?? null}
        exit={translation?.exit ?? null}
        exitNote={exit.kind === "unknown" ? exitOutcome.note : null}
        exitSource={exitOutcome.quoted}
        nextCharge={
          // The next charge is one period, not today's — today included the
          // opening fee, which is not charged again.
          scheduled ? { date: nextDate, amount: translation?.perPeriod ?? null } : null
        }
        standing={standing}
        manageUrl={manageUrl()}
        calendarHref={
          scheduled
            ? `/api/receipt/${encodeURIComponent(orderId)}/calendar?slug=${encodeURIComponent(resolved.slug)}`
            : null
        }
        sourceNote={sourceNote}
      />

      <RecordExits />
    </div>
  );
}

/** Two ways on, and never a third one back into a payment (IPD 15). */
function RecordExits() {
  return (
    <nav className="record-exits" aria-label="Where to go next">
      <Link className="button-secondary" href="/read">
        Read another document
      </Link>
      <Link className="button-secondary" href="/shop">
        Browse the shop
      </Link>
    </nav>
  );
}
