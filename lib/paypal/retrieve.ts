import { fromDecimalString, type Currency, type Money } from "@/lib/money";
import { computeCommitment } from "@/lib/commitment/compute";
import type { CommitmentTerms } from "@/lib/commitment/types";
import { DETAIL_READ_DEADLINE_MS, paypalRequest, withinDeadline } from "./client";
import { termsFromPlan, type PayPalPlan } from "./catalog";

type PayPalAmountJson = { currency_code?: string; value?: string };

export function parsePayPalAmount(amount: PayPalAmountJson | undefined): Money | null {
  if (!amount?.value || !amount.currency_code) return null;
  if (amount.currency_code !== "USD") {
    throw new Error(`Unsupported PayPal currency: ${amount.currency_code}`);
  }
  return fromDecimalString(amount.value, amount.currency_code as Currency);
}

export type OrderRecord = {
  id: string;
  status: string;
  amount: Money | null;
};

export type SubscriptionRecord = {
  id: string;
  status: string;
  /**
   * When PayPal says the agreement started. It is the only honest lower bound
   * for a transaction read: a payment for this agreement cannot precede it
   * (ITD 38).
   */
  startedAt: string | null;
  /** ISO timestamp of the next charge, when PayPal states one. */
  nextBillingTime: string | null;
  /**
   * ISO timestamp of the last state change. A record that says a subscription
   * was cancelled can say *when*, in PayPal's own words rather than ours
   * (IPD 23).
   */
  statusChangeTime: string | null;
  /**
   * What PayPal takes when the plan starts: the first period's price plus any
   * `setup_fee`, which PayPal collects at activation. Not the per-cycle price
   * alone — the receipt reconciles "charged today" against this, and a plan with
   * an opening fee would otherwise look like it charged $60.00 less than it did.
   */
  amount: Money | null;
  /**
   * The plan's terms as PayPal states them — price, cadence and how many cycles.
   * The term total cannot be worked out from the price alone, and the receipt
   * needs it, so the plan is read whole rather than as a price.
   */
  terms: CommitmentTerms | null;
};

/**
 * Reads the order back from PayPal. The receipt is built from this rather than
 * from anything we kept, because we keep nothing (ITD 6).
 */
export async function retrieveOrder(id: string): Promise<OrderRecord> {
  // The receipt is the page itself, so it gets the longer deadline: without
  // this read there is no receipt to show, and a slow answer beats an error.
  const order = await withinDeadline(
    (signal) =>
      paypalRequest<{
        id: string;
        status: string;
        purchase_units?: Array<{
          amount?: PayPalAmountJson;
          payments?: { captures?: Array<{ amount?: PayPalAmountJson }> };
        }>;
      }>(`/v2/checkout/orders/${encodeURIComponent(id)}`, { method: "GET", signal }),
    DETAIL_READ_DEADLINE_MS,
  );

  const unit = order.purchase_units?.[0];

  return {
    id: order.id,
    status: order.status,
    amount:
      parsePayPalAmount(unit?.payments?.captures?.[0]?.amount) ??
      parsePayPalAmount(unit?.amount),
  };
}

export async function retrieveSubscription(id: string): Promise<SubscriptionRecord> {
  // The page is about this subscription, so it gets the longer deadline.
  const subscription = await withinDeadline(
    (signal) =>
      paypalRequest<{
        id: string;
        status: string;
        plan_id?: string;
        start_time?: string;
        status_change_time?: string;
        billing_info?: { next_billing_time?: string };
      }>(`/v1/billing/subscriptions/${encodeURIComponent(id)}`, { method: "GET", signal }),
    DETAIL_READ_DEADLINE_MS,
  );

  // The agreed price and the length of the term live on the plan, not on the
  // subscription, so a receipt that is to show a term total has to read it.
  const terms = subscription.plan_id ? await retrievePlanTerms(subscription.plan_id) : null;

  return {
    id: subscription.id,
    status: subscription.status,
    startedAt: subscription.start_time ?? null,
    nextBillingTime: subscription.billing_info?.next_billing_time ?? null,
    statusChangeTime: subscription.status_change_time ?? null,
    // Today's charge as the plan states it, so `setup_fee` is included and the
    // receipt's agreement check compares like with like.
    amount: terms ? computeCommitment(terms).today : null,
    terms,
  };
}

async function retrievePlanTerms(planId: string): Promise<CommitmentTerms | null> {
  try {
    // The detail deadline, like every other read this page makes. The default
    // (two seconds) is the budget for a read that decorates a render, and this
    // one is not: it is where *Across the term* and *Charged today* come from,
    // and the catch below turns a slow answer into a silent absence.
    const plan = await withinDeadline(
      (signal) =>
        paypalRequest<PayPalPlan>(`/v1/billing/plans/${encodeURIComponent(planId)}`, {
          method: "GET",
          signal,
        }),
      DETAIL_READ_DEADLINE_MS,
    );

    // The same reader the catalogue uses: a plan with no fixed price, no
    // readable cadence or no cycle count yields nothing rather than an
    // approximation, and a missing figure stays missing.
    return termsFromPlan(plan);
  } catch {
    return null;
  }
}

/**
 * A payment has happened only when PayPal says it has. An order is settled once
 * it is captured (`COMPLETED`); `APPROVED` means the payer agreed at PayPal and
 * no money moved yet — a record built on it would report a payment that did not
 * happen. A subscription is settled when it is `ACTIVE`.
 *
 * `CANCELLED` is settled too (IPD 23). It ran, money was taken, and this screen
 * is the copy the shopper was told to keep — answering it with "nothing has been
 * taken" would be false in the one case the product itself can now cause.
 */
export function isSettled(status: string): boolean {
  return status === "COMPLETED" || status === "ACTIVE" || status === "CANCELLED";
}

export type InvoiceRecord = {
  id: string;
  status: string;
  amount: Money | null;
  /** ISO date the bill falls due, when the biller stated one. */
  dueDate: string | null;
  /** The PayPal-hosted page a payer opens to settle it. */
  payerUrl: string | null;
};

/**
 * Reads a bill back from PayPal. Like the receipt, the screen is built from
 * what PayPal holds rather than from anything we kept — a bill is the biller's
 * to change, and an unauthorised copy of it would be a lie after the first edit.
 */
export async function retrieveInvoice(id: string): Promise<InvoiceRecord> {
  const invoice = await withinDeadline(
    (signal) =>
      paypalRequest<{
        id: string;
        status: string;
        amount?: PayPalAmountJson;
        detail?: {
          payment_term?: { due_date?: string };
          /** Where the payer opens the bill. The only field that is a payer page. */
          metadata?: { recipient_view_url?: string };
        };
        links?: Array<{ href?: string; rel?: string }>;
      }>(`/v2/invoicing/invoices/${encodeURIComponent(id)}`, { method: "GET", signal }),
    DETAIL_READ_DEADLINE_MS,
  );

  return {
    id: invoice.id,
    status: invoice.status,
    amount: parsePayPalAmount(invoice.amount),
    dueDate: invoice.detail?.payment_term?.due_date ?? null,
    // `recipient_view_url` is the payer's page. The `self` link is the REST
    // resource — a JSON response — and must never stand in for it: the bill page
    // labelled that link "Pay this bill at PayPal", and a payer who followed it
    // got the API. A bill with no payer page is reported as one.
    payerUrl:
      invoice.detail?.metadata?.recipient_view_url ??
      invoice.links?.find((link) => link.rel === "payer-view")?.href ??
      null,
  };
}
