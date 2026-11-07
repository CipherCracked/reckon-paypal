import Link from "next/link";
import { CommitmentRecord } from "@/components/CommitmentRecord";
import { resolveProduct } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import { resolveExitTerm } from "@/lib/commitment/published-exit";
import { describeSources } from "@/lib/commitment/sources";
import type { CommitmentTerms } from "@/lib/commitment/types";
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

  let status: string;
  let nextBillingTime: string | null = null;
  let paypalAmount: Money | null = null;
  let planTerms: CommitmentTerms | null = null;

  try {
    if (recurring) {
      const subscription = await retrieveSubscription(orderId);
      status = subscription.status;
      nextBillingTime = subscription.nextBillingTime;
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

  // The third figure is the seller's, as everywhere else (IPD 19).
  const exitOutcome = await resolveExitTerm(
    resolved.terms.exit,
    resolved.description,
    resolved.descriptionLabel,
  );
  const exit = exitOutcome.exit;

  // What was charged is PayPal's own amount. What it adds up to is our
  // arithmetic over PayPal's numbers — the plan's price and its cycle count.
  let terms: CommitmentTerms | null;
  if (recurring) {
    terms = planTerms ? { ...planTerms, exit } : null;
  } else if (financed) {
    // PayPal models no instalment schedule, so the plan stays the seller's;
    // today's charge is checked against PayPal below rather than replaced.
    terms = { ...resolved.terms, exit };
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
    recurring && planTerms
      ? "the PayPal plan for this subscription"
      : !financed && paypalAmount
        ? "PayPal's copy of this order"
        : null;

  // A financed plan is the seller's arithmetic, so it says so — and says that
  // the charge itself was agreed by PayPal, which is the part PayPal can prove.
  const publishedLabel = financed
    ? "the seller's published instalment terms, with today's charge agreeing with PayPal"
    : null;

  const sourceNote =
    paypalLabel || publishedLabel
      ? describeSources({ paypal: paypalLabel, published: publishedLabel, quoted: exitOutcome.quoted })
      : "PayPal confirmed this payment and did not return an amount for it.";

  const nextDate = nextBillingTime ? new Date(nextBillingTime) : null;

  return (
    <div className="page">
      <CommitmentRecord
        productName={resolved.name}
        reference={orderId}
        paidToday={translation?.today ?? null}
        acrossTerm={translation?.acrossTerm ?? null}
        exit={translation?.exit ?? null}
        exitNote={exit.kind === "unknown" ? exitOutcome.note : null}
        nextCharge={
          recurring ? { date: nextDate, amount: translation?.today ?? null } : null
        }
        manageUrl={manageUrl()}
        calendarHref={
          recurring
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
