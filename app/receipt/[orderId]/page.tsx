import { CommitmentRecord, type AgreementKind, type RecordStanding } from "@/components/CommitmentRecord";
import { ExitNav, RECORD_EXITS } from "@/components/ExitNav";
import { Page } from "@/components/Page";
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

/**
 * What a record opened without its listing cannot say.
 *
 * The listing supplies two things the record cannot get from PayPal: the name of
 * the thing bought, and the seller's sentence about leaving. The second one is a
 * figure, so it is refused rather than guessed — the same rule as everywhere
 * else (IPD 19).
 */
const NO_LISTING_EXIT_NOTE =
  "This record was opened without its listing, so what the seller says about leaving was not read.";

function manageUrl(): string {
  const sandbox = paypalBaseUrl().includes("sandbox");
  return `https://www.${sandbox ? "sandbox." : ""}paypal.com/myaccount/autopay/`;
}

/**
 * The end of the journey (IPD 15). A payment that PayPal has not confirmed has
 * no record to show, and a confirmed one is the last screen rather than a stop:
 * it offers the ways on, and no way back into the payment.
 *
 * The figures are PayPal's, not the shop's (ITD 17). A record that restated the
 * catalogue would be a claim about a payment that may never have been made, on
 * the one screen a shopper keeps.
 *
 * **`?slug=` is now optional** (IPD 28). The list of a person's commitments links
 * here, and a list has no slug to offer: it reads subscriptions from PayPal by
 * id, not products from the catalogue. So the record reads what PayPal holds and
 * says what it could not read — instead of refusing the one screen a person is
 * most likely to arrive at without the original link.
 */
export default async function ReceiptPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { slug } = await searchParams;
  const resolved = slug ? await resolveProduct(slug) : null;

  let scheduled: boolean;
  let status: string;
  let nextBillingTime: string | null = null;
  let statusChangeTime: string | null = null;
  let paypalAmount: Money | null = null;
  let planTerms: CommitmentTerms | null = null;

  try {
    if (resolved) {
      const recurring = resolved.terms.shape === "recurring";
      const financed = resolved.terms.shape === "financed";
      // Both are scheduled by PayPal and both come back as a subscription id.
      // Only a one-time purchase comes back as an order.
      scheduled = recurring || financed;
    } else {
      // No listing, so the shape is PayPal's to answer: a subscription id reads
      // as a subscription, and anything else is tried as an order.
      scheduled = await retrieveSubscription(orderId).then(
        () => true,
        () => false,
      );
    }

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
      <Page title="We cannot confirm this payment">
        <p className="notice">
          We cannot confirm this payment with PayPal right now, so there is no record to show.
          Nothing has been charged twice — check PayPal directly if you are unsure.
        </p>
        <ExitNav links={RECORD_EXITS} />
      </Page>
    );
  }

  if (!isSettled(status)) {
    return (
      <Page title="Nothing has been taken yet">
        <p className="notice">
          PayPal has not confirmed this payment, so there is nothing to record yet. Nothing has been
          taken.
        </p>
        <ExitNav links={RECORD_EXITS} />
      </Page>
    );
  }

  // The third figure is the seller's, as everywhere else (IPD 19). The reading
  // is a model call, so it carries the same budget the bill page gives it: a
  // record that waited most of a minute would be a record nobody reads.
  //
  // Without the listing there is nothing to read, and that absence is stated
  // rather than papered over with a figure from somewhere else.
  const exitOutcome: ExitOutcome = resolved
    ? await withBudget(
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
      )
    : { kind: "unreadable", exit: { kind: "unknown" }, note: NO_LISTING_EXIT_NOTE, quoted: null };
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
    terms = planTerms
      ? { ...planTerms, exit }
      : resolved?.terms.shape === "financed"
        ? { ...resolved.terms, exit }
        : null;
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
      <Page title="This record does not add up">
        <p className="notice">
          PayPal charged a different amount from the one these terms add up to, so no record is
          shown. Check the payment with PayPal directly.
        </p>
        <ExitNav links={RECORD_EXITS} />
      </Page>
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
    scheduled && !planTerms && resolved?.terms.shape === "financed"
      ? "the seller's published instalment terms, with today's charge agreeing with PayPal"
      : null;

  const sourceNote =
    paypalLabel || publishedLabel
      ? describeSources({ paypal: paypalLabel, published: publishedLabel })
      : "PayPal confirmed this payment and did not return an amount for it.";

  const nextDate = nextBillingTime ? new Date(nextBillingTime) : null;

  // Only PayPal's own state decides whether the record offers to end the
  // agreement: a button on a commitment it has already ended would be a lie
  // about what pressing it does (IPD 23).
  //
  // A financed purchase gets the button too. It is a PayPal plan like the
  // subscription, so PayPal can stop it, and a shopper who cannot find the way
  // out of a twelve-month arrangement has been failed by the screen that sold it
  // to them. What the button cannot do is settle the debt: the confirmation says
  // that in the same breath as what it can do.
  const agreement: AgreementKind = resolved?.terms.shape === "financed" ? "payment plan" : "subscription";
  const standing: RecordStanding | null =
    scheduled && status === "ACTIVE"
      ? { kind: "running", subscriptionId: orderId, agreement }
      : scheduled && status === "CANCELLED"
        ? {
            kind: "cancelled",
            at: statusChangeTime ? new Date(statusChangeTime) : null,
            agreement,
          }
        : null;

  // Without the listing the record has no name for the thing, and inventing one
  // is the one thing this product does not do. It names the agreement instead.
  const productName =
    resolved?.name ??
    (scheduled ? "A subscription this store holds for you" : "A payment this store holds for you");

  return (
    <Page>
      <CommitmentRecord
        productName={productName}
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
          scheduled && resolved
            ? `/api/receipt/${encodeURIComponent(orderId)}/calendar?slug=${encodeURIComponent(resolved.slug)}`
            : null
        }
        sourceNote={sourceNote}
      />

      <ExitNav links={RECORD_EXITS} />
    </Page>
  );
}
